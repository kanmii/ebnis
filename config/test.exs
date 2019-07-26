import Config

# Configure your database
config :ebnis_data, EbnisData.Repo,
  username: "postgres",
  password: "postgres",
  database: "ebnis_test",
  hostname: "localhost",
  pool: Ecto.Adapters.SQL.Sandbox

config :ebnis_web, sql_sandbox: true

# Print only warnings and errors during test
config :logger, level: :warn

config :ebnis_emails, EbEmails.DefaultImplementation.Mailer, adapter: Swoosh.Adapters.Test

config :mix_test_watch,
  clear: true
