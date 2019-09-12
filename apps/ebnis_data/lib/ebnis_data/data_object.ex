defmodule EbnisData.DataObject do
  use Ecto.Schema, warn: true

  import Ecto.Changeset

  alias EbnisData.FieldType
  alias EbnisData.Entry

  @primary_key {:id, Ecto.ULID, autogenerate: true}
  @foreign_key_type Ecto.ULID
  schema "data_objects" do
    field(:data, FieldType)
    field(:definition_id, Ecto.ULID)
    field(:client_id, :string)
    belongs_to(:entry, Entry)
    timestamps(type: :utc_datetime)
  end

  @doc "changeset"
  def changeset(%__MODULE__{} = schema, %{} = attrs) do
    schema
    |> cast(attrs, [
      :definition_id,
      :data,
      :entry_id,
      :id,
      :inserted_at,
      :updated_at,
      :client_id
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
