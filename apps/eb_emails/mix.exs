defmodule EbEmails.MixProject do
  use Mix.Project

  def project do
    [
      app: :eb_emails,
      version: "0.1.0",
      build_path: "../../_build",
      config_path: "../../config/config.exs",
      deps_path: "../../deps",
      lockfile: "../../mix.lock",
      elixir: "~> 1.7",
      start_permanent: Mix.env() == :prod,
      deps: deps()
    ]
  end

  # Configuration for the OTP application.
  #
  # Type `mix help compile.app` for more information.
  def application do
    [
      extra_applications: [:logger, :runtime_tools]
    ]
  end

  # Specifies your project dependencies.
  #
  # Type `mix help deps` for examples and options.
  defp deps do
    [
      {:gen_smtp, "~> 0.14.0", override: true},
      {:swoosh, "~> 0.23.3"},
      {:constantizer, "~> 0.2.0"},
      {:mox, "~> 0.4.0", only: :test}
    ]
  end
end
