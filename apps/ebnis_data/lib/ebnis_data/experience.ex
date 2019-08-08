defmodule EbnisData.Experience1 do
  use Ecto.Schema, warn: true

  import Ecto.Changeset

  alias EbnisData.User
  alias EbnisData.Entry1
  alias EbnisData.DataDefinition

  @always_required_fields [:title, :user_id]

  @primary_key {:id, :id, autogenerate: true}
  @timestamps_opts [type: :utc_datetime]
  schema "experiences" do
    field(:title, :string)
    field(:description, :string)
    field(:client_id, :string)
    belongs_to(:user, User)
    has_many(:entries, Entry1, foreign_key: :exp_id)
    has_many(:data_definitions, DataDefinition, foreign_key: :experience_id)

    timestamps()
  end

  @doc "changeset"
  def changeset(%__MODULE__{} = schema, %{} = attrs) do
    schema
    |> cast(attrs, [
      :description,
      :title,
      :user_id,
      :client_id,
      :inserted_at,
      :updated_at
    ])
    |> cast_assoc(:data_definitions, required: false)
    |> validate_required(
      Enum.concat(
        @always_required_fields,
        attrs[:custom_requireds] || []
      )
    )
    |> unique_constraint(:title, name: :experiences_user_id_title_index)
    |> unique_constraint(:client_id, name: :experiences_client_id_user_id_index)
    |> validate_length(:title, min: 2)
    |> assoc_constraint(:user)
  end
end
