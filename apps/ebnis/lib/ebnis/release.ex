defmodule Ebnis.Release do
  @app :ebnis

  @doc """
    use like so:
    _build/prod/rel/release_name/bin/release_name eval "Ebnis.Release.migrate"
  """
  def migrate do
    load_app()

    for repo <- repos() do
      IO.inspect(repo)
      {:ok, _, _} =
        Ecto.Migrator.with_repo(
          repo,
          &Ecto.Migrator.run(&1, :up, all: true)
        )
    end
  end

  @doc """
    use like so:
    _build/prod/rel/release_name/bin/release_name eval "Ebnis.Release.rollback(EbnisData.Repo, 20200426085025)"
  """
  def rollback(repo, version) do
    load_app()

    {:ok, _, _} =
      Ecto.Migrator.with_repo(
        repo,
        &Ecto.Migrator.run(&1, :down, to: version)
      )
  end

  defp repos do
    Application.fetch_env!(@app, :ecto_repos)
  end

  defp load_app do
    Application.load(@app)
    # this app defines the repo and must be started too, otherwise we can not
    # work with repo
    Application.load(:ebnis_data)
  end
end
