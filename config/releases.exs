# In this file, we load production configuration and secrets
# from environment variables. You can also hardcode secrets,
# although such is generally not recommended and you have to
# remember to add this file to your .gitignore.
import Config

database_url = System.fetch_env!("EBNIS_DATABASE_URL")
pool_size = System.fetch_env!("EBNIS_POOL_SIZE") |> String.to_integer()
secret_key_base = System.fetch_env!("EBNIS_SECRET_KEY_BASE")
port = System.fetch_env!("EBNIS_PORT") |> String.to_integer()
host = System.fetch_env!("EBNIS_HOST")
path = System.fetch_env!("EBNIS_PATH")
origins = System.fetch_env!("EBNIS_ORIGINS") |> Jason.decode!()

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
