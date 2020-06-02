defmodule Candidates do
  @behaviour CandidatesBehavior

  def find_optimal_routes(cars, bookings) do
    IO.puts("call candidates_request")

    MQ.call(
      %{vehicles: cars, bookings: bookings},
      "candidates_request",
      "candidates_response"
    )
    |> Poison.decode!(keys: :atoms)
  end
end