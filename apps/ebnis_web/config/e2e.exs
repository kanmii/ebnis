use Mix.Config

import_config "dev.exs"

# Set a higher stacktrace during development. Avoid configuring such
# in production as building large stacktraces may be expensive.
config :phoenix, :stacktrace_depth, 10

config :eb_data, EbData.DefaultImpl.Repo,
  username: "postgres",
  password: "",
  database: "ebnis_e2e",
  hostname: "localhost",
  pool_size: 18
