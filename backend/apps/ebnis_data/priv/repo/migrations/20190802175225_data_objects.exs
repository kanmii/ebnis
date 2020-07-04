defmodule EbnisData.Repo.Migrations.EntriesData do
  use Ecto.Migration

  @table_name "data_objects"

  def change do
    create table(@table_name, primary_key: false) do
      add(:id, :uuid, null: false, primary_key: true)

      add(
        :data,
        :jsonb,
        null: false,
        comment: "the data object held by this field"
      )

      add(
        :entry_id,
        references("entries", on_delete: :delete_all),
        null: false,
        comment: "The entry to which the data object belongs"
      )

      add(
        :definition_id,
        references(
          "data_definitions",
          on_delete: :delete_all,
          type: :uuid
        ),
        null: false,
        comment: "The data definition to which the data object belongs"
      )

      timestamps(type: :utc_datetime)
    end

    @table_name
    |> index(["entry_id"])
    |> create()

    @table_name
    |> index(["definition_id"])
    |> create()

    @table_name
    |> unique_index(["entry_id", "definition_id"])
    |> create()

    execute("CREATE INDEX data_objects_index ON data_objects USING GIN (data);")

    flush()

    convert_entries_data_to_db_table()
  end

  defp convert_entries_data_to_db_table do
    alias EbnisData.Repo

    now =
      DateTime.utc_now()
      |> DateTime.truncate(:second)

    data =
      Repo.query!("""
        SELECT * from entries;
      """)

    entries =
      data.rows
      |> Enum.map(&(Enum.zip(data.columns, &1) |> Enum.into(%{})))
      |> Enum.flat_map(fn entry ->
        entry["fields"]
        |> Enum.map(fn field ->
          {:ok, id} = Ecto.UUID.dump(field["id"])
          {:ok, definition_id} = Ecto.UUID.dump(field["def_id"])

          field
          |> Map.merge(%{
            "entry_id" => entry["id"],
            "definition_id" => definition_id,
            "data" => Jason.encode!(field["data"]),
            "inserted_at" => now,
            "updated_at" => now,
            "id" => id
          })
          |> Map.delete("def_id")
        end)
      end)

    Repo.insert_all(@table_name, entries)
  end
end
