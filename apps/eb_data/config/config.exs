use Mix.Config

config :eb_data, ecto_repos: [EbData.DefaultImpl.Repo]

import_config "#{Mix.env()}.exs"
