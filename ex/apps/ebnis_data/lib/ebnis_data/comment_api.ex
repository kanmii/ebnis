defmodule EbnisData.CommentApi do
  import Ecto.Query, warn: true

  alias EbnisData.Repo
  alias EbnisData.Comment
  alias EbnisData.ExperienceComment
  alias EbnisData.EntryComment

  @spec create_experience_comment(params :: map()) :: %Comment{}
  def create_experience_comment(params) do
    comment = create_comment(params)

    params_with_comment = Map.put(params, :comment_id, comment.id)

    %ExperienceComment{}
    |> ExperienceComment.changeset(params_with_comment)
    |> Repo.insert()
    |> case do
      {:ok, %ExperienceComment{} = _experience_comment} ->
        comment
    end
  end

  @spec create_entry_comment(params :: map()) :: %Comment{}
  def create_entry_comment(params) do
    comment = create_comment(params)

    params_with_comment = Map.put(params, :comment_id, comment.id)

    %EntryComment{}
    |> EntryComment.changeset(params_with_comment)
    |> Repo.insert()
    |> case do
      {:ok, %EntryComment{} = _entry_comment} ->
        comment
    end
  end

  defp create_comment(params) do
    %Comment{}
    |> Comment.changeset(params)
    |> Repo.insert()
    |> case do
      {:ok, comment} ->
        comment
    end
  end

  @spec get_experience_comments(
          user_id :: String.t(),
          experience_id :: String.t()
        ) :: [%Comment{}]
  def get_experience_comments(user_id, experience_id) do
    from(
      ec in ExperienceComment,
      join: c in assoc(ec, :comment),
      join: e in assoc(ec, :experience),
      where: ec.experience_id == ^experience_id,
      where: e.user_id == ^user_id,
      preload: [
        comment: c
      ]
    )
    |> Repo.all()

    from(
      ec in ExperienceComment,
      join: c in assoc(ec, :comment),
      join: e in assoc(ec, :experience),
      where: ec.experience_id == ^experience_id,
      where: e.user_id == ^user_id,
      preload: [
        comment: c
      ]
    )
    |> Repo.all()
    |> Enum.map(& &1.comment)
  end
end
