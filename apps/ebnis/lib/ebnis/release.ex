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

  def assign_ids_to_entries_fields do
    alias EbnisData.Entry
    alias EbnisData.Field
    alias EbnisData.Repo

    import Ecto.Query, warn: false

    stream =
      Repo.stream(Entry)
      |> Stream.map(fn entry ->
        fields =
          entry.fields
          |> Enum.map(&%Field{&1 | id: Ecto.UUID.generate()})

        Entry
        |> where([e], e.id == ^entry.id)
        |> select([e], e.fields)
        |> update([], set: [fields: ^fields])
        |> Repo.update_all([])
      end)

    Repo.transaction(fn ->
      Enum.to_list(stream)
    end)
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
