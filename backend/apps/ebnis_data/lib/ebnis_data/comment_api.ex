defmodule EbnisData.CommentApi do
  alias EbnisData.Repo
  alias EbnisData.Comment
  alias EbnisData.ExperienceComment

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

  defp create_comment(params) do
    %Comment{}
    |> Comment.changeset(params)
    |> Repo.insert()
    |> case do
      {:ok, comment} ->
        comment
    end
  end
end
