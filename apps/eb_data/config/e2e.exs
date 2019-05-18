use Mix.Config

import_config "dev.exs"

config :logger, :console,
  format: "###### $time $metadata[$level] $message\n",
  metadata: [:request_id]

# Set a higher stacktrace during development. Avoid configuring such
# in production as building large stacktraces may be expensive.
config :phoenix, :stacktrace_depth, 10

config :eb_data, Data.Repo,
  username: "postgres",
  password: "postgres",
  database: "ebnis_e2e",
  hostname: "localhost",
  pool_size: 18

# config :eb_data, sql_sandbox: true

# pool: Ecto.Adapters.SQL.Sandbox,
# maximum time that the caller is allowed to perform transaction
# timeout: 600_000,
# how long to wait for connection before we start dropping connections
# queue_target: 600_000,
# queue_interval: 600_000,
# ownership_timeout: 600_000
