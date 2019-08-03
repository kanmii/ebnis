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
  end
end
