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

database_url =
  System.get_env(
    "EBNIS_DATABASE_URL",
    "ecto://postgres:postgres@localhost:5432/ebnis_dev"
  )

secret_key_base =
  System.get_env(
    "EBNIS_SECRET_KEY_BASE",
    "Shg9laalhF5NAba4r0RCABiKmqY9RHv+Jo1al7Nv1R2zPIDytJfzhGYSEc2g80d6"
  )

host = System.get_env("EBNIS_HOST", "localhost")
port = System.get_env("EBNIS_PORT", "4000") |> String.to_integer()

config :pbkdf2_elixir, :rounds, 1

config :ebnis,
  ecto_repos: [EbnisData.Repo],
  generators: [context_app: :ebnis_data]

# Configure Mix tasks and generators
config :ebnis_data,
  ecto_repos: [EbnisData.Repo]

# Configure your database
config :ebnis_data, EbnisData.Repo,
  url: database_url,
  show_sensitive_data_on_connection_error: true,
  pool_size: 10

config :ebnis_web,
  ecto_repos: [EbnisData.Repo],
  generators: [context_app: :ebnis_data]

# Configures the endpoint
config :ebnis_web, EbnisWeb.Endpoint,
  url: [host: host],
  http: [port: port],
  secret_key_base: secret_key_base,
  render_errors: [view: EbnisWeb.ErrorView, accepts: ~w(html json)],
  pubsub: [name: EbnisWeb.PubSub, adapter: Phoenix.PubSub.PG2],
  check_origin: false

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

config :ebnis_emails,
       EbEmails.DefaultImplementation.Mailer,
       adapter: Swoosh.Adapters.SMTP,
       relay: System.get_env("EBNIS_SMTP_RELAY") || "smtp.ethereal.email",
       username: System.get_env("EBNIS_SMTP_USER") || "loyal.farrell47@ethereal.email",
       password: System.get_env("EBNIS_SMTP_PASS") || "BxXEwfa5B7zfDHY941",
       tls: :always,
       auth: :always,
       port:
         System.get_env("EBNIS_SMTP_PORT")
         |> Kernel.||("587")
         |> String.to_integer()

config :ebnis_data, EbnisData.Guardian,
  issuer: "ebnis",
  secret_key: secret_key_base

config :ebnis_web, EbnisWeb.Plug.Pipeline,
  module: EbnisData.Guardian,
  error_handler: EbnisWeb.Plug.Pipeline

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{Mix.env()}.exs"
