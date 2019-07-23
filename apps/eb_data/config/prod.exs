use Mix.Config

config :eb_data, EbData.Guardian,
  issuer: "ebnis",
  secret_key: System.get_env("SECRET_KEY_BASE")

config :data, EbData.DefaultImpl.Repo,
  url: System.get_env("DATABASE_URL"),
  pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10"),
  ssl: true
