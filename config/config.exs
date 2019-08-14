# This file is responsible for configuring your umbrella
# and **all applications** and their dependencies with the
# help of Mix.Config.
#
# Note that all applications in your umbrella share the
# same configuration and dependencies, which is why they
# all use the same configuration file. If you want different
# configurations or dependencies per app, it is best to
# move said applications out of the umbrella.
import Config

config :bcrypt_elixir, :log_rounds, 1

# Configure Mix tasks and generators
config :ebnis_data,
  ecto_repos: [EbnisData.Repo]

config :ebnis_web,
  ecto_repos: [EbnisData.Repo],
  generators: [context_app: :ebnis_data]

# Configures the endpoint
config :ebnis_web, EbnisWeb.Endpoint,
  url: [host: "localhost"],
  secret_key_base: "q8CDJk8pUp5QuRX+U1YNGlvRmyu2p7swTl61Cp/w+D4ISWxn0KwbgDz7Wi9XRIHv",
  render_errors: [view: EbnisWeb.ErrorView, accepts: ~w(html json)],
  pubsub: [name: EbnisWeb.PubSub, adapter: Phoenix.PubSub.PG2]

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

config :ebnis_data, EbnisData.Guardian,
  issuer: "ebnis",
  secret_key: "DfAHXB4gq6YbApF5c5NgBP0kKpaaobjhFodpDzmceiaXfcPMZKDN1sBCTDHQ2RBy"

config :ebnis_web, EbnisWeb.Plug.Pipeline,
  module: EbnisData.Guardian,
  error_handler: EbnisWeb.Plug.Pipeline

config :ebnis_emails,
       EbEmails.DefaultImplementation.Mailer,
       adapter: Swoosh.Adapters.SMTP,
       relay: System.get_env("EBNIS_SMTP_RELAY") || "smtp.ethereal.email",
       username: System.get_env("EBNIS_SMTP_USER") || "loyal.farrell47@ethereal.email",
       password: System.get_env("EBNIS_SMTP_PASS") || "BxXEwfa5B7zfDHY941",
       tls: :always,
       auth: :always,
       port:
         (System.get_env("EBNIS_SMTP_PORT") || "587")
         |> String.to_integer()

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{Mix.env()}.exs"
