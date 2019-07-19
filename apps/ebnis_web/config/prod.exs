use Mix.Config

secret_key = System.get_env("SECRET_KEY_BASE")

config :ebnis_web, EbnisWeb.Endpoint,
  load_from_system_env: true,
  url: [
    scheme: "http",
    host: "ebnis.herokuapp.com",
    port: 4023
  ],
  force_ssl: [rewrite_on: [:x_forwarded_proto]],
  secret_key_base: secret_key,
  check_origin: [
    "https://ebnis.herokuapp.com",
    "https://ebnis.netlify.com"
  ]

config :ebnis_web, EbData.Guardian,
  issuer: "ebnis",
  secret_key: secret_key

# Do not print debug messages in production
config :logger, level: :info
