import Config

import_config "dev.exs"

config :ebnis_data, EbnisData.Repo,
  database: "ebnis_e2e",
  pool: Ecto.Adapters.SQL.Sandbox

config :ebnis_web, EbnisWeb.Endpoint, server: true

config :ebnis_web, sql_sandbox: true

config :ebnis, is_e2e: true
