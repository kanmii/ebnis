defmodule EbnisData.EntryComment do
  use Ecto.Schema, warn: true

  import Ecto.Changeset

  alias EbnisData.Entry
  alias EbnisData.Comment

  @primary_key {:id, Ecto.ULID, autogenerate: true}
  @foreign_key_type Ecto.ULID
  schema "entries_comments_xref" do
    belongs_to(:entry, Entry)
    belongs_to(:comment, Comment)
  end

  def changeset(%__MODULE__{} = schema, params \\ %{}) do
    schema
    |> cast(
      params,
      [
        :entry_id,
        :comment_id
      ]
    )
    |> validate_required([
      :entry_id,
      :comment_id
    ])
  end
end
