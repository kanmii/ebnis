defmodule EbnisData.Entry1 do
  use Ecto.Schema, warn: true

  import Ecto.Changeset

  alias EbnisData.Experience1
  alias EbnisData
  alias EbnisData.EntryData

  schema "entries" do
    field(:client_id, :string)
    belongs_to(:experience, Experience1, foreign_key: :exp_id)
    has_many(:entry_data_list, EntryData, foreign_key: :entry_id)

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
