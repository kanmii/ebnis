defmodule EbnisData.Resolver.Experience1 do
  alias EbnisData.Resolver

  def create_experience(
        %{input: attrs},
        %{context: %{current_user: %{id: id}}}
      ) do
    attrs
    |> Map.put(:user_id, id)
    |> EbnisData.create_experience()
    |> case do
      {:ok, experience} ->
        {
          :ok,
          %{
            experience: experience
          }
        }

      {:error, changeset} ->
        {
          :ok,
          changeset.errors
          |> experience_changeset_to_error_map()
          |> field_definition_changeset_to_error_map(changeset.changes.field_definitions)
        }
    end
  end

  def create_experience(_, _) do
    Resolver.unauthorized()
  end

  defp experience_changeset_to_error_map([]) do
    %{}
  end

  defp experience_changeset_to_error_map(errors) do
    %{
      experience_errors: changeset_errors_to_map(errors)
    }
  end

  defp field_definition_changeset_to_error_map(errors, changesets) do
    changesets
    |> Enum.reduce(
      {[], 0},
      fn
        %{valid?: false, errors: errors}, {acc, index} ->
          errors = %{
            index: index,
            errors: changeset_errors_to_map(errors)
          }

          {[errors | acc], index + 1}

        _, {acc, index} ->
          {acc, index + 1}
      end
    )
    |> case do
      {[], _} ->
        errors

      {field_definitions_errors, _} ->
        Map.put(errors, :field_definitions_errors, field_definitions_errors)
    end
  end

  defp changeset_errors_to_map(errors) do
    errors
    |> Enum.map(fn {k, {v, _}} -> {k, v} end)
    |> Enum.into(%{})
  end
end
