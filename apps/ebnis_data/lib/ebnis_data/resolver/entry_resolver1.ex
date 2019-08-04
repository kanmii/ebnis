defmodule EbnisData.Resolver.Entry1 do
  alias EbnisData.Resolver

  def create(%{input: attrs}, %{context: %{current_user: user}}) do
    experience_id =
      attrs.experience_id
      |> Resolver.convert_from_global_id(:experience1)

    attrs
    |> Map.merge(%{
      exp_id: experience_id,
      user_id: user.id
    })
    |> EbnisData.create_entry1()
    |> case do
      {:ok, entry} ->
        {
          :ok,
          %{
            entry: entry
          }
        }

      {:error, changeset} ->
        {
          :ok,
          changeset.errors
          |> changeset_errors_to_map()
          |> entry_data_list_changeset_errors_to_map(changeset.changes.entry_data_list)
        }
    end
  end

  defp changeset_errors_to_map([]) do
    %{}
  end

  defp changeset_errors_to_map(errors) do
    %{
      entry_errors: Resolver.changeset_errors_to_map(errors)
    }
  end

  defp entry_data_list_changeset_errors_to_map(
         accumulated_errors,
         changesets
       ) do
    changesets
    |> Enum.reduce({[], 0}, fn
      %{valid?: false, errors: errors}, {acc, index} ->
        {
          [
            %{
              index: index,
              errors: Resolver.changeset_errors_to_map(errors)
            }
            | acc
          ],
          index + 1
        }

      _, {acc, index} ->
        {acc, index + 1}
    end)
    |> case do
      {[], _} ->
        accumulated_errors

      {errors, _} ->
        accumulated_errors
        |> Map.put(:entry_data_list_errors, errors)
    end
  end
end
