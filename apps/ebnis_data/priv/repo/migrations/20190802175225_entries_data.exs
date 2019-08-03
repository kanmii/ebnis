defmodule EbnisData.Repo.Migrations.EntriesData do
  use Ecto.Migration

  def change do
    create table("entries_data", primary_key: false) do
      add(:id, :uuid, null: false, primary_key: true)

      add(
        :data,
        :jsonb,
        null: false,
        comment: "the data held by this field"
      )

      add(
        :entry_id,
        references("entries", on_delete: :delete_all),
        null: false,
        comment: "The entry to which the data belongs"
      )

      add(
        :field_definition_id,
        references(
          "field_definitions",
          on_delete: :delete_all,
          type: :uuid
        ),
        null: false,
        comment: "The field definition to which data belongs"
      )

      timestamps(type: :utc_datetime)
    end

    "entries_data"
    |> index(["entry_id"])
    |> create()

    "entries_data"
    |> index(["field_definition_id"])
    |> create()

    "entries_data"
    |> unique_index(["entry_id", "field_definition_id"])
    |> create()

    execute("CREATE INDEX entries_data_index ON entries_data USING GIN (data);")

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
      |> Enum.map(
        &(Enum.zip(data.columns, &1)
          |> Enum.into(%{}))
      )
      |> Enum.flat_map(fn entry ->
        entry["fields"]
        |> Enum.map(fn field ->
          {:ok, id} = Ecto.UUID.dump(field["id"])
          {:ok, field_definition_id} = Ecto.UUID.dump(field["def_id"])

          field
          |> Map.merge(%{
            "entry_id" => entry["id"],
            "field_definition_id" => field_definition_id,
            "data" => Jason.encode!(field["data"]),
            "inserted_at" => now,
            "updated_at" => now,
            "id" => id
          })
          |> Map.delete("def_id")
        end)
      end)

    Repo.insert_all("entries_data", entries)
  end
end
