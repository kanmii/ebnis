defmodule EbnisData.Repo.Migrations.FieldDefinition do
  use Ecto.Migration

  @table_name "data_definitions"

  def change do
    create table(@table_name, primary_key: false) do
      add(:id, :uuid, null: false, primary_key: true)
      add(:name, :citext, null: false)
      add(:client_id, :string)

      add(
        :type,
        references(
          "data_types",
          on_delete: :delete_all,
          column: :type,
          type: :citext
        ),
        null: false
      )

      add(
        :experience_id,
        references(
          "experiences",
          on_delete: :delete_all
        ),
        null: false,
        comment: "The owner of the experience"
      )

      timestamps(type: :utc_datetime)
    end

    @table_name
    |> index(["experience_id"])
    |> create()

    @table_name
    |> unique_index([:name, :experience_id])
    |> create()

    flush()

    convert_field_definitions_to_db_table()
  end

  defp convert_field_definitions_to_db_table do
    alias EbnisData.Repo

    now =
      DateTime.utc_now()
      |> DateTime.truncate(:second)

    data =
      Repo.query!("""
        SELECT * from experiences;
      """)

    data.rows
    |> Enum.map(&(Enum.zip(data.columns, &1) |> Enum.into(%{})))
    |> Enum.flat_map(fn experience ->
      experience["field_defs"]
      |> Enum.map(fn field ->
        {:ok, id} = Ecto.UUID.dump(field["id"])

        Map.merge(field, %{
          "experience_id" => experience["id"],
          "inserted_at" => now,
          "updated_at" => now,
          "id" => id
        })
      end)
    end)
    |> case do
      [] ->
        :ok

      entries ->
        Repo.insert_all(@table_name, entries)
    end
  end
end
