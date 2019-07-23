use Mix.Config

config :ebnis_web, EbnisWeb.Endpoint,
  load_from_system_env: true,
  http: [port: {:system, "PORT"}],
  url: [
    scheme: "https",
    host: "ebnis.herokuapp.com",
    port: System.get_env("PORT") |> String.to_integer()
  ],
  force_ssl: [rewrite_on: [:x_forwarded_proto]],
  secret_key_base: System.get_env("SECRET_KEY_BASE"),
  check_origin: [
    "https://ebnis.herokuapp.com",
    "https://ebnis.netlify.com"
  ]

# Do not print debug messages in production
config :logger, level: :info
