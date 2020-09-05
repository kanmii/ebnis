defmodule Ebnis.Umbrella.MixProject do
  use Mix.Project

  def project do
    [
      version: "0.1.0",
      apps_path: "apps",
      start_permanent: Mix.env() == :prod,
      deps: deps(),
      releases: [
        ebnis: [
          include_executables_for: [:unix],
          applications: [
            ebnis: :permanent,
            ebnis_emails: :permanent,
            ebnis_data: :permanent,
            ebnis_web: :permanent
          ]
        ]
      ],
      test_coverage: [tool: ExCoveralls],
      preferred_cli_env: [
        coveralls: :test,
        "coveralls.detail": :test,
        # "coveralls.post": :test,
        "coveralls.html": :test
      ]
    ]
  end

  defp deps do
    [
      {:excoveralls, "~> 0.12", only: :test},
      {:mix_test_watch, "~> 1.0.2", only: :dev, runtime: false}
    ]
  end
end
