# In this file, we load production configuration and secrets
# from environment variables. You can also hardcode secrets,
# although such is generally not recommended and you have to
# remember to add this file to your .gitignore.
import Config

###################### ENVIRONMENT VARIABLES ###############################

database_url = System.fetch_env!("DATABASE_URL")

secret_key_base = System.fetch_env!("SECRET_KEY_BASE")

database_ssl =
  case System.fetch_env!("DATABASE_SSL") do
    "true" ->
      true

    _ ->
      false
  end

port =
  System.fetch_env!("PORT")
  |> String.to_integer()

pool_size =
  (System.get_env("POOL_SIZE") || "18")
  |> String.to_integer()

host = System.fetch_env!("BACKEND_SERVER_HOST")

check_origin =
  System.fetch_env!("CHECK_ORIGINS")
  |> Jason.decode!()

smtp_relay = System.fetch_env!("SMTP_RELAY")
smtp_user = System.fetch_env!("SMTP_USER")
smtp_pass = System.fetch_env!("SMTP_PASS")

smtp_port =
  System.fetch_env!("SMTP_PORT")
  |> String.to_integer()

###################### END ENVIRONMENT VARIABLES ###########################

config :ebnis_data, EbnisData.Repo,
  ssl: database_ssl,
  url: database_url,
  pool_size: pool_size

config :ebnis_web, EbnisWeb.Endpoint,
  url: [
    host: host,
    port: port
  ],
  http: [
    :inet6,
    port: port
  ],
  secret_key_base: secret_key_base,
  server: true,
  check_origin: check_origin

config :ebnis_data, EbnisData.Guardian,
  issuer: "ebnis",
  secret_key: secret_key_base

config :ebnis_emails,
       EbEmails.DefaultImplementation.Mailer,
       adapter: Swoosh.Adapters.SMTP,
       relay: smtp_relay,
       username: smtp_user,
       password: smtp_pass,
       tls: :always,
       auth: :always,
       port: smtp_port
