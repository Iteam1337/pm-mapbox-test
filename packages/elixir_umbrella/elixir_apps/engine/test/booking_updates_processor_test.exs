defmodule BookingUpdatesProcessorTest do
  use ExUnit.Case
  import TestHelper

  def amqp_url, do: "amqp://" <> Application.fetch_env!(:engine, :amqp_host)
  @clear_queue Application.compile_env!(:engine, :clear_match_producer_state_queue)
  @outgoing_booking_exchange Application.compile_env!(:engine, :outgoing_booking_exchange)
  @incoming_booking_exchange Application.compile_env!(:engine, :incoming_booking_exchange)

  setup_all do
    {:ok, connection} = AMQP.Connection.open(amqp_url())
    {:ok, channel} = AMQP.Channel.open(connection)
    AMQP.Queue.bind(channel, @clear_queue, @clear_queue, routing_key: @clear_queue)
    AMQP.Queue.declare(channel, "look_for_picked_up_updates_in_test", durable: false)
    AMQP.Queue.declare(channel, "look_for_delivered_updates_in_test", durable: false)

    AMQP.Queue.bind(channel, "look_for_picked_up_updates_in_test", @outgoing_booking_exchange,
      routing_key: "picked_up"
    )

    AMQP.Queue.bind(channel, "look_for_delivered_updates_in_test", @outgoing_booking_exchange,
      routing_key: "delivered"
    )

    on_exit(fn ->
      AMQP.Channel.close(channel)
      AMQP.Connection.close(connection)
    end)

    %{channel: channel}
  end

  test "pickup update is registered and published", %{channel: channel} do
    AMQP.Basic.consume(channel, "look_for_picked_up_updates_in_test", nil, no_ack: true)

    vehicle_id =
      Vehicle.make(
        %{lat: 61.80762475411504, lon: 16.05761905846783},
        nil,
        nil,
        nil,
        nil,
        nil,
        nil
      )

    booking_id =
      Booking.make(
        %{lat: 61.80762475411504, lon: 16.05761905846783},
        %{lat: 61.80762475411504, lon: 17.05761905846783},
        nil,
        nil,
        nil
      )

    Booking.assign(booking_id, Vehicle.get(vehicle_id))
    send_status_msg(booking_id, vehicle_id, "picked_up")
    update = wait_for_message(channel)
    assert Map.get(update, :booking_id) == booking_id

    assert "picked_up" ==
             Booking.get(booking_id)
             |> Map.get(:events)
             |> List.first()
             |> Map.get(:type)
  end

  test "delivered update is registered and published", %{channel: channel} do
    AMQP.Basic.consume(channel, "look_for_delivered_updates_in_test", nil, no_ack: true)

    vehicle_id =
      Vehicle.make(
        %{lat: 61.80762475411504, lon: 16.05761905846783},
        nil,
        nil,
        nil,
        nil,
        nil,
        nil
      )

    booking_id =
      Booking.make(
        %{lat: 61.80762475411504, lon: 16.05761905846783},
        %{lat: 61.80762475411504, lon: 17.05761905846783},
        nil,
        nil,
        nil
      )

    Booking.assign(booking_id, Vehicle.get(vehicle_id))
    send_status_msg(booking_id, vehicle_id, "delivered")
    update = wait_for_message(channel)
    assert Map.get(update, :booking_id) == booking_id

    assert "delivered" ==
             Booking.get(booking_id)
             |> Map.get(:events)
             |> List.first()
             |> Map.get(:type)
  end

  def send_status_msg(booking_id, vehicle_id, status) do
    MQ.publish(
      %{
        assigned_to: %{
          id: vehicle_id,
          metadata: %{telegram: %{senderId: 1_242_301_357}}
        },
        delivery: %{lat: 61.75485695153156, lon: 15.989146086447738},
        events: [],
        external_id: "0vUETUYGCVAkCqBq7AZvg",
        id: booking_id,
        metadata: %{},
        pickup: %{lat: 61.80762475411504, lon: 16.05761905846783},
        size: nil,
        status: status
      },
      @incoming_booking_exchange,
      status
    )
  end
end
