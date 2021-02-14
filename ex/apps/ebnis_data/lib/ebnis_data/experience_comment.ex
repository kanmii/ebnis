defmodule EbnisData.ExperienceComment do
  use Ecto.Schema, warn: true

  import Ecto.Changeset

  alias EbnisData.Experience
  alias EbnisData.Comment

  @primary_key {:id, Ecto.ULID, autogenerate: true}
  @foreign_key_type Ecto.ULID
  schema "experiences_comments_xref" do
    belongs_to(:experience, Experience)
    belongs_to(:comment, Comment)
  end

  def changeset(%__MODULE__{} = schema, params \\ %{}) do
    schema
    |> cast(
      params,
      [
        :experience_id,
        :comment_id
      ]
    )
    |> validate_required([
      :experience_id,
      :comment_id
    ])
  end
end
