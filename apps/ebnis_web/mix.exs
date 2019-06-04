defmodule EbnisWeb.MixProject do
  use Mix.Project

  def project do
    [
      app: :ebnis_web,
      version: "0.1.0",
      elixir: "~> 1.8",
      elixirc_paths: elixirc_paths(Mix.env()),
      compilers: [:phoenix, :gettext] ++ Mix.compilers(),
      start_permanent: Mix.env() == :prod,
      deps: deps()
    ]
  end

  def application do
    [
      mod: {EbnisWeb.Application, []},
      extra_applications: [:logger, :runtime_tools]
    ]
  end

  # Specifies which paths to compile per environment.
  defp elixirc_paths(:dev), do: ["lib", "lib_dev"]
  defp elixirc_paths(:test), do: elixirc_paths(:dev) ++ ["test/support"]
  defp elixirc_paths(_), do: ["lib"]

  defp deps do
    [
      {:eb_data, in_umbrella: true},
      {:eb_emails, in_umbrella: true},
      {:phoenix, "~> 1.4.0"},
      {:phoenix_pubsub, "~> 1.1"},
      {:phoenix_ecto, "~> 4.0"},
      {:gettext, "~> 0.11"},
      {:jason, "~> 1.0"},
      {:plug_cowboy, "~> 2.0"},
      {:absinthe, "~> 1.4"},
      {:absinthe_plug, "~> 1.4"},
      {:absinthe_phoenix, "~> 1.4.0"},
      {:absinthe_relay, "~> 1.4"},
      {:dataloader, "~> 1.0"},
      {:corsica, "~> 1.1"},
      {:timex, "~> 3.4"},
      {:mox, "~> 0.4.0", only: :test},
      {:guardian, "~> 1.1"}
    ]
  end
end
