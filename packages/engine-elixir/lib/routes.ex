defmodule Routes do
  def init do
    Stream.resource(
      fn -> subscribe(self()) end,
      fn pid -> receive_next_value(pid) end,
      fn values -> values end
    )
  end

  defp decode(car) do
    car |> Poison.decode!(%{keys: :atoms})
  end

  defp subscribe(parent) do
    spawn(fn ->
      queue = "simulated_cars"
      {:ok, connection} = AMQP.Connection.open()
      {:ok, channel} = AMQP.Channel.open(connection)
      AMQP.Queue.declare(channel, queue)

      AMQP.Queue.subscribe(channel, queue, fn car, _meta ->
        send(parent, {:msg, car: Car.make(decode(car))})
      end)
    end)
  end

  defp receive_next_value(pid) do
    receive do
      {:msg, car: car} ->
        {[car], pid}

      _ ->
        receive_next_value(pid)
    end
  end
end
