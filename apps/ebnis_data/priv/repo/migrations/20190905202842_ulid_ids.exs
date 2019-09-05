defmodule EbnisData.Repo.Migrations.UlidIds do
  use Ecto.Migration

  def up do
    alter table(:users) do
      add(:temp_id, :binary)
    end

    alter table(:credentials) do
      add(:temp_id, :binary)
    end

    alter table(:experiences) do
      add(:temp_id, :binary)
    end

    alter table(:entries) do
      add(:temp_id, :binary)
    end

    alter table(:data_definitions) do
      add(:temp_id, :binary)
    end

    alter table(:data_objects) do
      add(:temp_id, :binary)
    end

    flush()
    gen_temp_ids()
  end

  def down do
    alter table(:users) do
      remove(:temp_id)
    end

    alter table(:credentials) do
      remove(:temp_id)
    end

    alter table(:experiences) do
      remove(:temp_id)
    end

    alter table(:entries) do
      remove(:temp_id)
    end

    alter table(:data_definitions) do
      remove(:temp_id)
    end

    alter table(:data_objects) do
      remove(:temp_id)
    end
  end

  defp gen_temp_ids do
    import Ecto.Query
    alias EbnisData.Repo
    alias Ecto.ULID, as: Ulid

    {:ok, _} =
      Repo.transaction(fn ->
        [
          "users",
          "credentials",
          "experiences",
          "entries",
          "data_definitions",
          "data_objects"
        ]
        |> Enum.map(fn table ->
          table
          |> select([m], m.id)
          |> Repo.all()
          |> Enum.map(fn id ->
            from(
              m in table,
              where: m.id == ^id,
              update: [set: [temp_id: ^ulid_id()]]
            )
            |> Repo.update_all([])
          end)
        end)
      end)
  end

  defp ulid_id() do
    Ecto.ULID.bingenerate()
  end
end
