defmodule EbnisData.Entry do
  use Ecto.Schema, warn: true

  import Ecto.Changeset

  alias EbnisData.Experience
  alias EbnisData
  alias EbnisData.DataObject

  schema "entries" do
    field(:client_id, :string)
    belongs_to(:experience, Experience, foreign_key: :exp_id)
    has_many(:data_objects, DataObject, foreign_key: :entry_id)

    timestamps(type: :utc_datetime)
  end

  @doc "changeset"
  def changeset(%__MODULE__{} = schema, %{} = attrs) do
    schema
    |> cast(attrs, [
      :exp_id,
      :client_id,
      :inserted_at,
      :updated_at
    ])
    |> validate_required([:exp_id | attrs[:other_required] || []])
    |> unique_constraint(
      :client_id,
      name: :entries_client_id_exp_id_index
    )
  end
end
