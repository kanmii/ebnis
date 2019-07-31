import Config

import_config "dev.exs"

config :ebnis_data, EbnisData.Repo,
  database: "ebnis_e2e",
  pool_size: 20

config :ebnis_web, EbnisWeb.Endpoint, server: true

config :ebnis_web, sql_sandbox: true

config :ebnis, is_e2e: true
