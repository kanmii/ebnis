defmodule EbnisData.Resolver.Entry1 do
  alias EbnisData.Resolver

  def create(%{input: attrs}, %{context: %{current_user: user}}) do
    experience_id =
      attrs.experience_id
      |> Resolver.convert_from_global_id(:experience1)

    attrs
    |> Map.merge(%{
      experience_id: experience_id,
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

      {:error, changeset, nil} ->
        {
          :ok,
          %{
            entry_errors: Resolver.changeset_errors_to_map(changeset.errors)
          }
        }

      {:error, nil, changesets} ->
        {
          :ok,
          entry_data_list_changeset_errors_to_map(%{}, changesets)
        }

      {:error, nil, index, changeset} ->
        {
          :ok,
          %{
            entry_data_list_errors: [
              %{
                index: index,
                errors: Resolver.changeset_errors_to_map(changeset.errors)
              }
            ]
          }
        }

        # :error ->
        #   {
        #     :ok,
        #     %{
        #       entry_errors: %{
        #         entry: "can not be created"
        #       }
        #     }
        #   }
    end
  end

  def create(_, _) do
    Resolver.unauthorized()
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
