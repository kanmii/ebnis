defmodule EbnisData.MixProject do
  use Mix.Project

  def project do
    [
      app: :ebnis_data,
      version: "0.1.0",
      build_path: "../../_build",
      config_path: "../../config/config.exs",
      deps_path: "../../deps",
      lockfile: "../../mix.lock",
      elixir: "~> 1.9",
      elixirc_paths: elixirc_paths(Mix.env()),
      start_permanent: Mix.env() == :prod,
      deps: deps(),
      aliases: aliases()
    ]
  end

  defp elixirc_paths(:dev), do: ["lib", "lib_dev"]
  defp elixirc_paths(:test), do: elixirc_paths(:dev) ++ ["test/support"]
  defp elixirc_paths(_), do: ["lib"]

  # Run "mix help compile.app" to learn about applications.
  def application do
    [
      mod: {EbnisData.Application, []},
      extra_applications: [:logger]
    ]
  end

  # Run "mix help deps" to learn about dependencies.
  defp deps do
    [
      {:ecto_sql, "~> 3.1"},
      {:postgrex, ">= 0.0.0"},
      {:jason, "~> 1.0"},
      {:pbkdf2_elixir, "~> 1.0"},
      {:mox, "~> 0.5.1", only: :test},
      {:faker, "~> 0.12.0", only: [:dev, :test]},
      {:sequence, github: "samba6/sequence", only: [:dev, :test]},
      {:absinthe, "~> 1.4"},
      {:absinthe_relay, "~> 1.4"},
      {:dataloader, "~> 1.0"},
      {:guardian, "~> 1.2"},
      {:ebnis_emails, in_umbrella: true},
      {:timex, "~> 3.6"},
      {:ecto_ulid, "~> 0.2.0"}
    ]
  end

  defp aliases do
    [
      "ecto.setup": ["ecto.create", "ecto.migrate", "run priv/repo/seeds.exs"],
      "ecto.reset": ["ecto.drop", "ecto.setup"],
      test: ["ecto.create --quiet", "ecto.migrate", "test"]
    ]
  end
end
