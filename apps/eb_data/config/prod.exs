use Mix.Config

config :eb_data, EbData.Guardian,
  issuer: "ebnis",
  secret_key: System.get_env("SECRET_KEY_BASE")
