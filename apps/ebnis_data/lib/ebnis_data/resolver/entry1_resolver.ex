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
    |> data_objects_changeset_errors_to_map(changeset.changes.data_objects)
  end

  defp data_objects_changeset_errors_to_map(errors, []) do
    errors
  end

  defp data_objects_changeset_errors_to_map(acc_errors, changesets) do
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
        acc_errors

      {errors, _} ->
        Map.put(acc_errors, :data_objects_errors, errors)
    end
  end

  def create_entries(%{input: inputs}, %{context: %{current_user: user}}) do
    {entries, ids} = update_entries_with_valid_ids(inputs, user.id)

    results_map = EbnisData.create_entries1(entries)

    {
      :ok,
      Enum.map(
        ids,
        fn id ->
          result = results_map[id]
          experience_id = Resolver.convert_to_global_id(id, :experience1)

          update_in(
            result.errors,
            &Enum.map(&1, fn changeset ->
              %{
                errors: entry_changeset_errors_to_map(changeset),
                client_id: changeset.changes.client_id,
                experience_id: experience_id
              }
            end)
          )
          |> Map.put(:experience_id, experience_id)
        end
      )
    }
  end

  def create_entries(_, _) do
    Resolver.unauthorized()
  end

  defp update_entries_with_valid_ids(entries, user_id) do
    {entries, ids, _} =
      Enum.reduce(
        entries,
        {[], [], %{}},
        fn entry, {entries, experiences_ids, seen} ->
          experience_id =
            Resolver.convert_from_global_id(
              entry.experience_id,
              :experience1
            )

          experiences_ids =
            case seen[experience_id] do
              true ->
                experiences_ids

              _ ->
                [experience_id | experiences_ids]
            end

          {
            [
              Map.merge(
                entry,
                %{
                  user_id: user_id,
                  experience_id: experience_id
                }
              )
              | entries
            ],
            experiences_ids,
            Map.put(seen, experience_id, true)
          }
        end
      )

    {Enum.reverse(entries), Enum.reverse(ids)}
  end

  def delete(%{id: id}, %{context: %{current_user: %{id: _}}}) do
    id
    |> Resolver.convert_from_global_id(:entry1)
    |> EbnisData.delete_entry1()
  end

  def delete(_, _) do
    Resolver.unauthorized()
  end

  def update_data_object(%{input: input}, %{context: %{current_user: %{id: _}}}) do
    case EbnisData.update_data_object(input) do
      {:ok, data_object} ->
        {:ok,
         %{
           data_object: data_object
         }}

      {:error, %{} = changeset} ->
        {
          :ok,
          %{
            errors: Resolver.changeset_errors_to_map(changeset.errors)
          }
        }

      {:error, others} ->
        {:error, others}
    end
  end

  def update_data_object(_, _) do
    Resolver.unauthorized()
  end
end
