use Mix.Config

config :eb_emails, EbEmails.DefaultImpl.Mailer, adapter: Swoosh.Adapters.Test

config :constantizer, resolve_at_compile_time: false
