defmodule EbnisData.Entry do
  use Ecto.Schema, warn: true

  import Ecto.Changeset

  alias EbnisData.Experience
  alias EbnisData
  alias EbnisData.DataObject
  alias EbnisData.Comment
  alias EbnisData.EntryComment

  @primary_key {:id, Ecto.ULID, autogenerate: true}
  @foreign_key_type Ecto.ULID
  schema "entries" do
    field(:client_id, :string)
    belongs_to(:experience, Experience)
    has_many(:data_objects, DataObject)

    many_to_many(
      :comments,
      Comment,
      join_through: EntryComment
    )

    timestamps(type: :utc_datetime)
  end

  @doc "changeset"
  def changeset(%__MODULE__{} = schema, %{} = attrs) do
    schema
    |> cast(attrs, [
      :experience_id,
      :client_id,
      :inserted_at,
      :updated_at
    ])
    |> validate_required([:experience_id])
    |> unique_constraint(
      :client_id,
      name: :entries_client_id_experience_id_index
    )
  end
end
