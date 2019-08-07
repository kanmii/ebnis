defmodule EbnisData.DataObject do
  use Ecto.Schema, warn: true

  import Ecto.Changeset

  alias EbnisData.FieldType

  @primary_key {:id, :binary_id, autogenerate: true}
  schema "data_objects" do
    field(:data, FieldType)
    field(:definition_id, Ecto.UUID)
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
      :definition_id,
      :data,
      :entry_id,
      :id,
      :inserted_at,
      :updated_at
    ])
    |> validate_required([
      :definition_id,
      :data
    ])
    |> unique_constraint(
      :definition_id,
      name: :data_objects_entry_id_definition_id_index
    )
  end
end
