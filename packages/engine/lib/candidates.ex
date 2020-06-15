defmodule Candidates do
  @behaviour CandidatesBehavior

  def find_optimal_routes(vehicle_ids, bookings) do
    IO.puts("call candidates_request")

    vehicles =
      vehicle_ids
      |> Enum.map(&Vehicle.get/1)

    MQ.call(
      %{vehicles: vehicles, bookings: bookings},
      "candidates_request"
    )
    |> Poison.decode!(keys: :atoms)
  end
end
