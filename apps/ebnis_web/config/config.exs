use Mix.Config

config :ebnis_web, EbnisWeb.Endpoint,
  url: [host: "localhost"],
  secret_key_base: "IgXlpm0kYEMVeuAEMGrEyaHL7bgiY/zbKdHu00dOMwO0IhWKyPA3/Un5zCpz+0u1",
  render_errors: [view: EbnisWeb.ErrorView, accepts: ~w(html json)],
  pubsub: [name: EbnisWeb.PubSub, adapter: Phoenix.PubSub.PG2]

config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

config :ebnis_web, EbData.Guardian,
  issuer: "ebnis",
  secret_key: "DfAHXB4gq6YbApF5c5NgBP0kKpaaobjhFodpDzmceiaXfcPMZKDN1sBCTDHQ2RBy"

config :ebnis_web, EbnisWeb.Auth.Pipeline,
  module: EbData.Guardian,
  error_handler: EbnisWeb.Auth.Pipeline

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{Mix.env()}.exs"
