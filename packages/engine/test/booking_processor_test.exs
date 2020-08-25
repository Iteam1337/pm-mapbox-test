defmodule BookingProcessorTest do
  use ExUnit.Case
  import Mox
  setup :set_mox_from_context
  setup :verify_on_exit!
  @christian %{lat: 59.338791, lon: 17.897773}
  @radu %{lat: 59.318672, lon: 18.072149}
  @kungstradgarden %{lat: 59.332632, lon: 18.071692}
  @iteam %{lat: 59.343664, lon: 18.069928}
  @ralis %{lat: 59.330513, lon: 18.018228}
  @stjarntorget %{lat: 59.3692505, lon: 18.0026196}

  @iteamToRadu %Booking{
    pickup: @iteam,
    delivery: @radu,
    id: "iteamToRadu"
  }

  @iteamToSeb %Booking{
    pickup: @iteam,
    delivery: @stjarntorget,
    id: "iteamToSeb"
  }

  @iteamToCinema %Booking{
    pickup: @iteam,
    delivery: @stjarntorget,
    id: "iteamToCinema"
  }

  @iteamToFoodCourt %Booking{
    pickup: @iteam,
    delivery: @stjarntorget,
    id: "iteamToFoodCourt"
  }

  @iteamToSystembolaget %Booking{
    pickup: @iteam,
    delivery: @stjarntorget,
    id: "iteamToSystembolaget"
  }

  @iteamToSats %Booking{
    pickup: @iteam,
    delivery: @stjarntorget,
    id: "iteamToSats"
  }

  @iteamToChristian %Booking{
    pickup: @iteam,
    delivery: @christian,
    id: "iteamToChristian"
  }

  @tesla %Vehicle{
    busy: false,
    heading: nil,
    id: "tesla",
    instructions: [],
    position: @iteam,
    orsm_route: nil
  }

  @volvo %Vehicle{
    busy: false,
    heading: nil,
    id: "volvo",
    instructions: [],
    position: @ralis,
    orsm_route: nil
  }
  @plan_response_with_one_booking_for_tesla %{
    copyrights: ["GraphHopper", "OpenStreetMap contributors"],
    job_id: "f7e0a92a-8dc1-4b4c-b8c1-7365e4eb90ad",
    processing_time: 69,
    solution: %{
      completion_time: 655,
      costs: 207,
      distance: 5917,
      max_operation_time: 655,
      no_unassigned: 0,
      no_vehicles: 1,
      preparation_time: 0,
      routes: [
        %{
          activities: [
            %{
              address: %{
                lat: @iteamToRadu.pickup.lat,
                location_id: "502",
                lon: @iteamToRadu.pickup.lon
              },
              distance: 0,
              driving_time: 0,
              end_date_time: nil,
              end_time: 0,
              load_after: [0],
              location_id: "502",
              preparation_time: 0,
              type: "start",
              waiting_time: 0
            },
            %{
              address: %{lat: 59.343664, location_id: "863628", lon: 18.069928},
              arr_date_time: nil,
              arr_time: 0,
              distance: 0,
              driving_time: 0,
              end_date_time: nil,
              end_time: 0,
              id: "iteamToRadu",
              load_after: [2],
              load_before: [1],
              location_id: "863628",
              preparation_time: 0,
              type: "pickupShipment",
              waiting_time: 0
            },
            %{
              address: %{
                lat: @iteamToRadu.delivery.lat,
                location_id: "76605",
                lon: @iteamToRadu.delivery.lon
              },
              arr_date_time: nil,
              arr_time: 655,
              distance: 5917,
              driving_time: 655,
              end_date_time: nil,
              end_time: 655,
              id: "iteamToRadu",
              load_after: [4],
              load_before: [5],
              location_id: "76605",
              preparation_time: 0,
              type: "deliverShipment",
              waiting_time: 0
            }
          ],
          completion_time: 655,
          distance: 5917,
          preparation_time: 0,
          service_duration: 0,
          transport_time: 655,
          vehicle_id: "tesla",
          waiting_time: 0
        }
      ],
      service_duration: 0,
      time: 655,
      transport_time: 655,
      unassigned: %{breaks: [], details: [], services: [], shipments: []},
      waiting_time: 0
    },
    status: "finished",
    waiting_time_in_queue: 0
  }

  @tag :only
  test "it stores plan made by Plan Module" do
    vehicles = [@tesla, @volvo]
    bookings = [@iteamToRadu]

    PlanBehaviourMock
    |> stub(:find_optimal_routes, fn _, _ -> @plan_response_with_one_booking_for_tesla end)

    ref =
      Broadway.test_messages(Engine.BookingProcessor, [
        {vehicles, bookings}
      ])

    assert_receive {:ack, ^ref, messages, failed},
                   10000

    [%Vehicle{id: "tesla", instructions: instructions}] = PlanStore.get_plan()

    assert length(instructions) == 3
  end

  @tag :only
  test "it only stores latest plan response" do
    vehicles = [@tesla, @volvo]
    bookings = [@iteamToRadu]

    stub(PlanBehaviourMock, :find_optimal_routes, fn _, _ ->
      @plan_response_with_one_booking_for_tesla
    end)

    ref =
      Broadway.test_messages(Engine.BookingProcessor, [
        {vehicles, bookings}
      ])

    assert_receive {:ack, ^ref, messages, failed},
                   10000

    volvo_is_best_match =
      update_in(@plan_response_with_one_booking_for_tesla, [:solution, :routes], fn [routes] ->
        [Map.put(routes, :vehicle_id, "volvo")]
      end)

    stub(PlanBehaviourMock, :find_optimal_routes, fn _, _ -> volvo_is_best_match end)

    ref =
      Broadway.test_messages(Engine.BookingProcessor, [
        {vehicles, bookings}
      ])

    assert_receive {:ack, ^ref, messages, failed},
                   10000

    [%Vehicle{id: "volvo", instructions: instructions}] = PlanStore.get_plan()

    assert length(instructions) == 3
  end

  # This test should be moved to a more "e2e" location to test that our get_optimal_routes backend works properly
  # test "the same vehicle gets all the bookings on the same route if it does not reach its capacity" do
  #   vehicles = [@tesla, @volvo]

  #   bookings = [
  #     @iteamToCinema,
  #     @iteamToSats,
  #     @iteamToSystembolaget,
  #     @iteamToFoodCourt,
  #     @iteamToSeb
  #   ]

  #   ref =
  #     Broadway.test_messages(Engine.BookingProcessor, [
  #       {vehicles, bookings}
  #     ])

  #   assert_receive {:ack, ^ref, messages, failed},
  #                  10000

  #   {%Vehicle{id: "tesla", instructions: instructions}, _} = PlanStore.get_plan()

  #   assert length(instructions) == 11
  # end

  # test "it can get another order that is on the same route" do
  #   vehicles = [@tesla, @volvo]
  #   bookings = [@iteamToRadu, @iteamToChristian]

  #   ref =
  #     Broadway.test_messages(Engine.BookingProcessor, [
  #       {vehicles, bookings}
  #     ])

  #   assert_receive {:ack, ^ref, messages, failed},
  #                  10000

  #   %Vehicle{id: "tesla", instructions: instructions} =
  #     messages
  #     |> Enum.map(fn %Broadway.Message{data: {vehicles, bookings}} -> List.first(vehicles) end)
  #     |> List.first()

  #   instructions
  #   |> Enum.filter(fn %{type: type} -> type != "start" end)
  #   |> Enum.all?(fn %{id: id} ->
  #     id == @iteamToRadu.id or id == @iteamToChristian.id
  #   end)
  #   |> assert()
  # end

  # write a test case where you send 2 messages and you just test based on location that the closest vehicle is picked

  # booking1 = {}
  # booking2 = {}
  # vehicle1 = { instructions: []}
  # vehicle2 = { instructions: []}

  # vehicles = [vehicle1, vehicle2]

  # result = process.message(booking1, vehicles)

  # updated_vehicle1 = { instructions: [booking1] }
  # updated_vehicles = accept_offer(result)

  # updated_vehicles = [updated_vehicle1, vehicle2]

  # result = process.message(booking2, updated_vehicles)
  # a test case where you send 1 booking and 2 vehicles and then mock the offer acceptance and the updated state as vehicle input for another message
end