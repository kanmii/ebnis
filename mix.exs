defmodule EbnisUmbrella.MixProject do
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
            # ebnis_email: :permanent, -- started by ebnis_data
            # ebnis_data: :permanent, -- started by ebnis_web
            # this is the entry point of our app
            ebnis: :permanent,
            ebnis_web: :permanent
          ]
        ]
      ]
    ]
  end

  defp deps do
    [
      {:mix_test_watch, "~> 0.9.0", only: :test, runtime: false}
    ]
  end
end
