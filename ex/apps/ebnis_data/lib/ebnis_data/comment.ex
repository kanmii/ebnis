defmodule EbnisData.Comment do
  use Ecto.Schema

  import Ecto.Changeset

  @primary_key {:id, Ecto.ULID, autogenerate: true}
  schema "comments" do
    field(:text, :string)
    timestamps(type: :utc_datetime)
  end

  @doc "changeset"
  def changeset(%__MODULE__{} = schema, attrs) do
    schema
    |> cast(
      attrs,
      [
        :text
      ]
    )
  end
end
