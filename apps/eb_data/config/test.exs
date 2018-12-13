use Mix.Config

config :eb_data, sql_sandbox: true

# Configure your database
config :eb_data, EbData.DefaultImpl.Repo,
  username: "postgres",
  password: "postgres",
  database: "ebnis_test",
  hostname: "localhost",
  pool: Ecto.Adapters.SQL.Sandbox,
  timeout: 60_000

config :constantizer, resolve_at_compile_time: false
