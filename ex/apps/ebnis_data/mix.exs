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
      aliases: aliases(),
      test_coverage: [tool: ExCoveralls]
    ]
  end

  defp elixirc_paths(:dev), do: ["lib", "lib_dev"]
  defp elixirc_paths(:test), do: elixirc_paths(:dev) ++ ["test/support"]
  defp elixirc_paths(_), do: ["lib"]

  # Run "mix help compile.app" to learn about applications.
  def application do
    [
      mod: {EbnisData.Application, []},
      extra_applications: [
        :ssl
      ]
    ]
  end

  # Run "mix help deps" to learn about dependencies.
  defp deps do
    [
      {:ecto_sql, "~> 3.5"},
      {:postgrex, ">= 0.0.0"},
      {:jason, "~> 1.0"},
      {:pbkdf2_elixir, "~> 1.0"},
      {:faker, "~> 0.12.0", only: [:dev, :test]},
      {:absinthe, "~> 1.5.3"},
      {:absinthe_relay, "~> 1.5"},
      {:dataloader, "~> 1.0.7"},
      {:guardian, "~> 1.2"},
      {:ebnis_emails, in_umbrella: true},
      {:ebnis, in_umbrella: true},
      {:timex, "~> 3.6"},
      {:sequence, github: "kanmii/sequence", only: [:dev, :test]},
      # {:ecto_ulid, git: "https://github.com/kanmii/ecto-ulid.git", branch: "equal2"},
      {:ecto_ulid, "~> 0.3.0"},
      {:mox, "~> 1.0", only: :test}
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
