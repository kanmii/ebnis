use Mix.Config

config :ebnis_web, EbnisWeb.Endpoint,
  http: [port: 4022],
  debug_errors: true,
  # code_reloader: true,
  check_origin: false

# Do not include metadata nor timestamps in development logs
config :logger, :console, format: "\n[$level] $message\n"

# Initialize plugs at runtime for faster development compilation
config :phoenix, :plug_init_mode, :runtime

# Set a higher stacktrace during development. Avoid configuring such
# in production as building large stacktraces may be expensive.
config :phoenix, :stacktrace_depth, 20

config :eb_data, EbData.DefaultImpl.Repo,
  username: "postgres",
  password: "",
  database: "ebnis_dev",
  hostname: "localhost",
  pool_size: 10
