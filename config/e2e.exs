import Config

import_config "dev.exs"

config :ebnis_data, EbnisData.Repo,
  database: "ebnis_e2e",
  pool_size: 20

config :ebnis_web, EbnisWeb.Endpoint,
  server: true,
  http: [port: System.get_env("EBNIS_PORT", "4022") |> String.to_integer()]

config :ebnis_web, sql_sandbox: true

config :ebnis, is_e2e: true
