use Mix.Config

config :eb_data, ecto_repos: [EbData.DefaultImpl.Repo]

config :eb_data, EbData.Guardian,
  issuer: "ebnis",
  secret_key: "DfAHXB4gq6YbApF5c5NgBP0kKpaaobjhFodpDzmceiaXfcPMZKDN1sBCTDHQ2RBy"

import_config "#{Mix.env()}.exs"
