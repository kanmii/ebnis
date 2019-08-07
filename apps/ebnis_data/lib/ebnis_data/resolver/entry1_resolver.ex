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

      {:error, changeset} ->
        {:ok, %{errors: entry_changeset_errors_to_map(changeset)}}
    end
  end

  def create(_, _) do
    Resolver.unauthorized()
  end

  def entry_changeset_errors_to_map(changeset) do
    case changeset.errors do
      [] ->
        %{}

      errors ->
        Resolver.changeset_errors_to_map(errors)
    end
    |> data_objects_changeset_errors_to_map(changeset.changes.entry_data_list)
  end

  defp data_objects_changeset_errors_to_map(errors, []) do
    errors
  end

  defp data_objects_changeset_errors_to_map(acc_errors, changesets) do
    {errors, _} =
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

    Map.put(acc_errors, :entry_data_list_errors, errors)
  end
end
