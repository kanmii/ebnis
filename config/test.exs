import Config

# Configure your database
config :ebnis_data, EbnisData.Repo,
  pool: Ecto.Adapters.SQL.Sandbox

config :ebnis_web, sql_sandbox: true

# We don't run a server during test. If one is required,
# you can enable the server option below.
config :ebnis_web, EbnisWeb.Endpoint,
  server: false

# Print only warnings and errors during test
config :logger, level: :warn

config :ebnis_emails, EbEmails.DefaultImplementation.Mailer, adapter: Swoosh.Adapters.Test

config :mix_test_watch,
  clear: true

config :ebnis, is_test: true
