defmodule EbnisData.FieldDefinition do
  use Ecto.Schema, warn: true

  import Ecto.Changeset

  alias EbnisData.Experience

  @primary_key {:id, :binary_id, autogenerate: true}
  schema "field_definitions" do
    field(:name, :string)
    field(:type, :string)
    field(:client_id, :string)
    belongs_to(:experience, Experience)

    timestamps(type: :utc_datetime)
  end

  @doc "changeset"
  def changeset(%__MODULE__{} = schema, attrs \\ %{}) do
    schema
    |> cast(attrs, [
      :name,
      :type,
      :client_id,
      :id,
      :experience_id,
      :inserted_at,
      :updated_at
    ])
    |> validate_required([
      :name,
      :type,
      :client_id
    ])
    |> validate_length(:name, min: 2)
    |> unique_constraint(
      :name,
      name: :field_definitions_name_experience_id_index
    )
  end
end
