use Mix.Config

# We don't run a server during test. If one is required,
# you can enable the server option below.
config :ebnis_web, EbnisWeb.Endpoint,
  http: [port: 4000],
  server: false

# Print only warnings and errors during test
config :logger, level: :warn

config :eb_data, EbData.DefaultImpl.Repo,
  username: "postgres",
  password: "postgres",
  database: "ebnis_test",
  hostname: "localhost",
  pool: Ecto.Adapters.SQL.Sandbox,
  timeout: 60_000

config :eb_emails, EbEmails.DefaultImpl.Mailer, adapter: Swoosh.Adapters.Test
