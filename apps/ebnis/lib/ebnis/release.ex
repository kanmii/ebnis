defmodule Ebnis.Release do
  @ebnis_data_app_name :ebnis_data

  def migrate do
    for repo <- repos() do
      IO.puts(["==> Running migrations for repo: ", inspect(repo)])

      {:ok, _, _} =
        Ecto.Migrator.with_repo(
          repo,
          &Ecto.Migrator.run(&1, :up, all: true)
        )
    end
  end

  def rollback(repo, version) do
    {:ok, _, _} = Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :down, to: version))
  end

  defp repos do
    IO.puts("==> Starting 'eb_data' application..")

    Application.load(@ebnis_data_app_name)
    Application.fetch_env!(@ebnis_data_app_name, :ecto_repos)
  end
end
