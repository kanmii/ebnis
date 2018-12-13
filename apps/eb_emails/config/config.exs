use Mix.Config

config :eb_emails, EbEmails.DefaultImpl.Mailer,
  adapter: Swoosh.Adapters.SMTP,
  relay: System.get_env("EBNIS_SMTP_RELAY"),
  username: System.get_env("EBNIS_SMTP_USER"),
  password: System.get_env("EBNIS_SMTP_PASS"),
  tls: :always,
  auth: :always,
  port: System.get_env("EBNIS_SMTP_PORT") |> String.to_integer()

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{Mix.env()}.exs"
