defmodule Vehicle do
  use GenServer
  use Vex.Struct
  require Logger
  alias Engine.ES
  alias Engine.Adapters.{RMQ, RMQRPCWorker}
  @derive Jason.Encoder

  defstruct [
    :id,
    :busy,
    :activities,
    :current_route,
    :booking_ids,
    :metadata,
    :start_address,
    :end_address,
    :earliest_start,
    :latest_end,
    :profile,
    :capacity
  ]

  @hour_and_minutes_format ~r/^((?:[01]\d|2[0-3]):[0-5]\d$)/

  validates(:start_address, presence: true)
  validates([:start_address, :lat], number: [is: true])
  validates([:start_address, :lon], number: [is: true])
  validates([:end_address, :lat], number: [is: true])
  validates([:end_address, :lon], number: [is: true])
  validates(:earliest_start, format: [with: @hour_and_minutes_format, allow_nil: true])
  validates(:latest_end, format: [with: @hour_and_minutes_format, allow_nil: true])

  validates([:capacity, :weight],
    by: [function: &is_integer/1, message: "must be an integer"]
  )

  validates([:capacity, :volume], number: [is: true])

  def init(init_arg) do
    {:ok, init_arg}
  end

  def handle_call(:get, _from, state), do: {:reply, state, state}

  def handle_call(
        {:offer, %{} = offer},
        _from,
        vehicle
      ) do
    Logger.debug("offer to vehicle #{vehicle.id}")

    RMQRPCWorker.call(
      %{
        vehicle: %{id: vehicle.id, metadata: vehicle.metadata},
        current_route: offer.current_route,
        activities: offer.activities,
        booking_ids: offer.booking_ids
      },
      "offer_booking_to_vehicle"
    )
    |> case do
      {:ok, response} ->
        {:reply, Jason.decode(response), vehicle}

      _ ->
        {:reply, false, vehicle}
    end
  end

  def handle_call(
        {:apply_offer_accepted, offer},
        _from,
        current_vehicle
      ) do
    Logger.info("Driver #{current_vehicle.id} accepted")

    updated_vehicle =
      current_vehicle
      |> Map.merge(offer)
      |> RMQ.publish(
        Application.fetch_env!(:engine, :outgoing_vehicle_exchange),
        "new_instructions"
      )

    {:reply, updated_vehicle, updated_vehicle}
  end

  def handle_call({:update, updated_vehicle}, _from, _state) do
    {:reply, true, updated_vehicle}
  end

  def generate_id do
    alphabet = "abcdefghijklmnopqrstuvwxyz0123456789" |> String.split("", trim: true)

    generated =
      UUID.uuid4()
      |> Base.encode64(padding: false)
      |> String.replace(["+", "/"], Enum.random(alphabet))
      |> String.slice(0, 8)
      |> String.downcase()

    "pmv-" <> generated
  end

  def make(vehicle_info) do
    vehicle_fields =
      vehicle_info
      |> Map.put_new(:end_address, Map.get(vehicle_info, :start_address))
      |> Map.put(:id, generate_id())
      |> Map.put_new(:capacity, %{volume: 15, weight: 700})
      |> Map.update(:metadata, nil, &Jason.encode!/1)

    vehicle = struct(Vehicle, vehicle_fields)

    with true <- Vex.valid?(vehicle) do
      vehicle
      |> apply_vehicle_to_state()
      |> (&%VehicleRegistered{vehicle: &1}).()
      |> ES.add_event()

      vehicle_fields.id
    else
      _ ->
        IO.inspect(Vex.errors(vehicle), label: "vehicle validation errors")
        Vex.errors(vehicle)
    end
  end

  def update(%{
        id: id,
        start_address: start_address,
        end_address: end_address,
        earliest_start: earliest_start,
        latest_end: latest_end,
        profile: profile,
        capacity: capacity,
        metadata: metadata
      }) do
    vehicle =
      get(id)
      |> Map.put(:start_address, start_address)
      |> Map.put(:end_address, end_address)
      |> Map.put(:earliest_start, earliest_start)
      |> Map.put(:latest_end, latest_end)
      |> Map.put(:profile, profile)
      |> Map.put(:capacity, capacity)
      |> Map.put(:metadata, metadata |> Jason.encode!())

    with true <- Vex.valid?(vehicle) do
      vehicle
      |> (&%VehicleUpdated{vehicle: &1}).()
      |> ES.add_event()

      GenServer.call(via_tuple(id), {:update, vehicle})

      RMQ.publish(
        vehicle,
        Application.fetch_env!(:engine, :outgoing_vehicle_exchange),
        "updated"
      )

      id
    else
      _ ->
        IO.inspect(Vex.errors(vehicle), label: "vehicle validation errors")
        Vex.errors(vehicle)
    end
  end

  def apply_offer_accepted(id, offer),
    do: GenServer.call(via_tuple(id), {:apply_offer_accepted, offer})

  def apply_vehicle_to_state(%Vehicle{id: id} = vehicle) do
    GenServer.start_link(
      __MODULE__,
      vehicle,
      name: via_tuple(id)
    )

    Engine.VehicleStore.put_vehicle(id)

    RMQ.publish(
      vehicle,
      Application.fetch_env!(:engine, :outgoing_vehicle_exchange),
      "new"
    )

    vehicle
  end

  def delete(id) do
    ES.add_event(%VehicleDeleted{id: id})
    apply_delete_to_state(id)
  end

  def apply_delete_to_state(id) do
    Engine.VehicleStore.delete_vehicle(id)
    GenServer.stop(via_tuple(id))

    RMQ.publish(
      id,
      Application.fetch_env!(:engine, :outgoing_vehicle_exchange),
      "deleted"
    )
  end

  defp via_tuple(id), do: {:via, :gproc, {:n, :l, {:vehicle_id, id}}}

  def get(id), do: GenServer.call(via_tuple(id), :get)

  def offer(%Vehicle{id: id, activities: activities, booking_ids: booking_ids}) do
    offer = %{
      booking_ids: booking_ids,
      activities: activities,
      current_route:
        activities
        |> Enum.map(fn %{address: address} -> address end)
        |> Osrm.route()
    }

    case GenServer.call(via_tuple(id), {:offer, offer}) do
      {:ok, true} ->
        updated_state = apply_offer_accepted(id, offer)

        ES.add_event(%DriverAcceptedOffer{vehicle_id: id, offer: offer})

        Enum.each(booking_ids, &Booking.assign(&1, updated_state))

      {:ok, false} ->
        Logger.info("Driver didnt want the booking :(")
    end
  end
end
