defmodule BookingPickedUp do
  @derive Jason.Encoder
  defstruct [:booking_id, :time_stamp]
end
