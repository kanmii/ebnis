defmodule EbnisData.EntryData do
  use Ecto.Schema, warn: true

  import Ecto.Changeset

  alias EbnisData.FieldType

  @primary_key {:id, :binary_id, autogenerate: true}
  schema "entries_data" do
    field(:data, FieldType)
    field(:field_definition_id, Ecto.UUID)
    field(:entry_id, :id)

    timestamps(type: :utc_datetime)
  end

  @doc "changeset"
  def changeset, do: changeset(%__MODULE__{}, %{})

  def changeset(%__MODULE__{} = schema), do: changeset(schema, %{})

  def changeset(%__MODULE__{} = schema, attrs) when is_list(attrs),
    do: changeset(schema, Map.new(attrs))

  def changeset(%__MODULE__{} = schema, %{} = attrs) do
    schema
    |> cast(attrs, [
      :field_definition_id,
      :data,
      :entry_id,
      :id,
      :inserted_at,
      :updated_at
    ])
    |> validate_required([
      :field_definition_id,
      :data
    ])
    |> unique_constraint(
      :field_definition_id,
      name: :entries_data_entry_id_field_definition_id_index
    )
    # |> foreign_key_constraint(
    #   :field_definition,
    #   name: :entries_data_field_definition_id_fkey
    # )
    |> validate_data_type()
  end

  defp validate_data_type(%{valid?: false} = changeset) do
    changeset
  end

  defp validate_data_type(changeset) do
    changes = changeset.changes

    case EbnisData.get_field_definition_by(changes.field_definition_id) do
      nil ->
        add_error(
          changeset,
          :field_definition,
          "does not exist"
        )

      data_definition ->
        [data_type] = Map.keys(changes.data)

        case data_definition.type do
          ^data_type ->
            changeset

          definition_type ->
            add_error(
              changeset,
              :data,
              "has invalid data type: '#{data_type}' instead of '#{definition_type}'"
            )
        end
    end
  end
end
