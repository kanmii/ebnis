# In this file, we load production configuration and secrets
# from environment variables. You can also hardcode secrets,
# although such is generally not recommended and you have to
# remember to add this file to your .gitignore.
import Config

# mandatory variables
database_url = System.fetch_env!("EBNIS_DATABASE_URL")
secret_key_base = System.fetch_env!("EBNIS_SECRET_KEY_BASE")
host = System.fetch_env!("EBNIS_HOST")
origins = System.fetch_env!("EBNIS_ORIGINS") |> Jason.decode!()

# optional variables
port = System.get_env("EBNIS_PORT", "4000") |> String.to_integer()
path = System.get_env("EBNIS_PATH", "/")
pool_size = System.get_env("EBNIS_POOL_SIZE", "18") |> String.to_integer()

config :ebnis_data, EbnisData.Repo,
  # ssl: true,
  url: database_url,
  pool_size: pool_size

config :ebnis_web, EbnisWeb.Endpoint,
  url: [
    host: host,
    path: path
  ],
  http: [
    :inet6,
    port: port
  ],
  secret_key_base: secret_key_base,
  server: true,
  check_origin: origins

config :ebnis_data, EbnisData.Guardian,
  issuer: "ebnis",
  secret_key: secret_key_base
