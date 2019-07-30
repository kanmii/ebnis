# In this file, we load production configuration and secrets
# from environment variables. You can also hardcode secrets,
# although such is generally not recommended and you have to
# remember to add this file to your .gitignore.
import Config

config :ebnis_data, EbnisData.Repo,
  # ssl: true,
  url: System.fetch_env!("EBNIS_DATABASE_URL"),
  pool_size:
    (System.get_env("EBNIS_POOL_SIZE") || "18")
    |> String.to_integer()

secret_key_base = System.fetch_env!("EBNIS_SECRET_KEY_BASE")

port =
  System.fetch_env!("EBNIS_PORT")
  |> String.to_integer()

config :ebnis_web, EbnisWeb.Endpoint,
  url: [
    host: System.fetch_env!("EBNIS_HOST"),
    path: System.fetch_env!("EBNIS_PATH")
  ],
  http: [
    :inet6,
    port: port
  ],
  secret_key_base: secret_key_base,
  server: true,
  check_origin:
    "EBNIS_ORIGINS"
    |> System.fetch_env!()
    |> Jason.decode!()

config :ebnis_data, EbnisData.Guardian,
  issuer: "ebnis",
  secret_key: secret_key_base
