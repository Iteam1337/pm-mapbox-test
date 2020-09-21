import Config

# this is compile time config

config :engine, :plan, Plan
config :engine, :vehicle, Vehicle

config :engine, :outgoing_vehicle_exchange, "outgoing_vehicle_updates"
config :engine, :incoming_vehicle_exchange, "incoming_vehicle_updates"
config :engine, :outgoing_booking_exchange, "outgoing_booking_updates"
config :engine, :incoming_booking_exchange, "incoming_booking_updates"
config :engine, :outgoing_plan_exchange, "outgoing_plan_updates"

config :logger, level: :info
config :logger, handle_otp_reports: false
import_config "#{Mix.env()}.exs"