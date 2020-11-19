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

###################### ENVIRONMENT VARIABLES ###############################

database_url = System.get_env("DATABASE_URL", "")

secret_key_base = System.get_env("SECRET_KEY_BASE", "")

port =
  System.get_env("PORT", "4000")
  |> String.to_integer()

host = System.get_env("BACKEND_SERVER_HOST", "localhost")

pool_size =
  System.get_env("POOL_SIZE")
  |> Kernel.||("10")
  |> String.to_integer()

smtp_relay = System.get_env("SMTP_RELAY")
smtp_user = System.get_env("SMTP_USER")
smtp_pass = System.get_env("SMTP_PASS")

smtp_port =
  System.get_env("SMTP_PORT")
  |> Kernel.||("0")
  |> String.to_integer()

is_e2e = System.get_env("IS_E2E") == "true"

###################### END ENVIRONMENT VARIABLES ###########################

config :ebnis,
  ecto_repos: [EbnisData.Repo],
  generators: [context_app: :ebnis_data]

config :ebnis_data,
  ecto_repos: [EbnisData.Repo]

config :ebnis_data, EbnisData.Repo,
  url: database_url,
  show_sensitive_data_on_connection_error: true,
  pool_size: pool_size

config :ebnis_data, EbnisData.Guardian,
  issuer: "ebnis",
  secret_key: secret_key_base

config :ebnis_web,
  ecto_repos: [EbnisData.Repo],
  generators: [context_app: :ebnis_data]

config :ebnis_web, EbnisWeb.Endpoint,
  url: [
    host: host
  ],
  http: [
    port: port
  ],
  secret_key_base: secret_key_base,
  render_errors: [
    view: EbnisWeb.ErrorView,
    accepts: ~w(html json),
    layout: false
  ],
  pubsub_server: Ebnis.PubSub,
  check_origin: false

config :ebnis_web, EbnisWeb.Plug.Pipeline,
  module: EbnisData.Guardian,
  error_handler: EbnisWeb.Plug.Pipeline

config :ebnis_data, :pow,
  user: EbnisData.Users.Auth,
  repo: EbnisData.Repo

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

config :ebnis_emails,
       EbEmails.DefaultImplementation.Mailer,
       adapter: Swoosh.Adapters.SMTP,
       relay: smtp_relay,
       username: smtp_user,
       password: smtp_pass,
       tls: :always,
       auth: :always,
       port: smtp_port

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

config :pbkdf2_elixir, :rounds, 1

# used to indicate end to end test
config :ebnis,
  is_e2e: is_e2e

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{Mix.env()}.exs"
