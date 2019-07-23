use Mix.Config

config :ebnis_web, EbnisWeb.Endpoint,
  load_from_system_env: true,
  url: [
    scheme: "https",
    host: "ebnis.herokuapp.com",
    port: 443
  ],
  force_ssl: [rewrite_on: [:x_forwarded_proto]],
  secret_key_base: System.get_env("SECRET_KEY_BASE"),
  check_origin: [
    "https://ebnis.herokuapp.com",
    "https://ebnis.netlify.com"
  ]

# Do not print debug messages in production
config :logger, level: :info
