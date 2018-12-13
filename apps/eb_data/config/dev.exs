use Mix.Config

# Configure your database
config :eb_data, EbData.DefaultImpl.Repo,
  username: "postgres",
  password: "",
  database: "ebnis_dev",
  hostname: "localhost",
  pool_size: 10
