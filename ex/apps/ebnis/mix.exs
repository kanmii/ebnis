defmodule Ebnis.MixProject do
  use Mix.Project

  def project do
    [
      app: :ebnis,
      version: "0.1.0",
      build_path: "../../_build",
      config_path: "../../config/config.exs",
      deps_path: "../../deps",
      lockfile: "../../mix.lock",
      elixir: "~> 1.9",
      elixirc_paths: elixirc_paths(Mix.env()),
      start_permanent: Mix.env() == :prod,
      deps: deps(),
      test_coverage: [tool: ExCoveralls],
      xref: [
        exclude: [
          Ecto.Migrator
        ]
      ]
    ]
  end

  # Configuration for the OTP application.
  #
  # Type `mix help compile.app` for more information.
  def application do
    [
      mod: {Ebnis.Application, []},
      extra_applications: [
        :logger,
        :runtime_tools
      ],
      applications: [
        :cachex
      ]
    ]
  end

  # Specifies which paths to compile per environment.
  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  # Specifies your project dependencies.
  #
  # Type `mix help deps` for examples and options.
  defp deps do
    [
      {:ecto_sql, "~> 3.5"},
      {:phoenix_pubsub, "~> 2.0"},
      {:mix_test_watch, "~> 1.0.2", only: :dev, runtime: false},
      {:excoveralls, "~> 0.12", only: :test},
      {:cachex, "~> 3.3"}
    ]
  end
end
