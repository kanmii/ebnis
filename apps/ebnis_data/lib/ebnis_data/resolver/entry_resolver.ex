defmodule EbnisData.Resolver.EntryResolver do
  alias EbnisData.Resolver

  def create(%{input: attrs}, %{context: %{current_user: user}}) do
    attrs
    |> Map.put(:user_id, user.id)
    |> EbnisData.create_entry()
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
      %{valid?: false, errors: errors, changes: changes}, {acc, index} ->
        {
          [
            %{
              index: index,
              client_id: changes[:client_id],
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
    {entries, experiences_ids} = update_entries_with_valid_ids(inputs, user.id)
    experience_id_to_updated_entries_map = EbnisData.create_entries(entries)

    {
      :ok,
      Enum.map(
        experiences_ids,
        fn experience_id ->
          result = experience_id_to_updated_entries_map[experience_id]

          update_in(
            result.errors,
            &handle_create_entries_errors/1
          )
        end
      )
    }
  end

  def create_entries(_, _) do
    Resolver.unauthorized()
  end

  defp update_entries_with_valid_ids(entries, user_id) do
    {entries, unique_experiences_ids, _} =
      Enum.reduce(
        entries,
        {[], [], %{}},
        fn entry, {entries, unique_experiences_ids, seen} ->
          experience_id = entry.experience_id

          unique_experiences_ids =
            case seen[experience_id] do
              true ->
                unique_experiences_ids

              _ ->
                [experience_id | unique_experiences_ids]
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
            unique_experiences_ids,
            Map.put(seen, experience_id, true)
          }
        end
      )

    {Enum.reverse(entries), Enum.reverse(unique_experiences_ids)}
  end

  defp handle_create_entries_errors(nil) do
    nil
  end

  defp handle_create_entries_errors(errors) do
    Enum.map(errors, fn error = %{errors: changeset} ->
      %{
        error
        | errors: entry_changeset_errors_to_map(changeset)
      }
    end)
  end

  def delete(%{id: id}, %{context: %{current_user: %{id: _}}}) do
    EbnisData.delete_entry(id)
  end

  def delete(_, _) do
    Resolver.unauthorized()
  end

  def update_data_objects(%{input: inputs}, %{context: %{current_user: %{id: _}}}) do
    results =
      inputs
      |> Enum.with_index()
      |> Enum.map(fn {input, index} ->
        case EbnisData.update_data_object(input) do
          {:ok, object} ->
            %{
              data_object: object
            }

          {:error, %{} = changeset} ->
            %{
              field_errors: Resolver.changeset_errors_to_map(changeset.errors)
            }

          {:error, string_error} ->
            %{
              string_error: string_error
            }
        end
        |> Map.merge(%{
          index: index,
          id: input.id
        })
      end)

    {:ok, results}
  end

  def update_data_objects(_, _) do
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

  def update_data_object_union(%{data_object: _}, _) do
    :data_object_success
  end

  def update_data_object_union(%{errors: _}, _) do
    :data_object_full_errors
  end

  def update_entries_union(%{entries: _}, _) do
    :update_entries_some_success
  end

  def update_entries_union(%{error: _}, _) do
    :update_entries_all_fail
  end

  def update_entry_union(%{errors: _}, _) do
    :update_entry_errors
  end

  def update_entry_union(%{entry: _}, _) do
    :update_entry_some_success
  end

  def update_entries(%{input: inputs}, %{context: %{current_user: %{id: user_id}}}) do
    entries =
      inputs
      |> Enum.reduce([], fn params, acc ->
        case EbnisData.update_entry(params, user_id) do
          %{error: _} = errors ->
            [%{errors: errors} | acc]

          may_be_updated_entry ->
            [
              %{
                entry: %{
                  may_be_updated_entry
                  | data_objects:
                      Enum.map(
                        may_be_updated_entry.data_objects,
                        &updated_data_object_to_gql_output/1
                      )
                }
              }
              | acc
            ]
        end
      end)
      |> Enum.reverse()
      # |> IO.inspect(label: "
    # -----------entries------------
    # ")

    {:ok, %{entries: entries}}
  end

  def update_entries(%{input: _inputs}, _) do
    {:ok, %{error: "Unauthorized"}}
  end

  defp updated_data_object_to_gql_output({id, %{} = changeset}) do
    errors = Resolver.changeset_errors_to_map(changeset.errors)

    %{
      errors: Map.put(errors, :id, id)
    }
  end

  defp updated_data_object_to_gql_output({id, string_error}) do
    %{
      errors: %{
        id: id,
        error: string_error
      }
    }
  end

  defp updated_data_object_to_gql_output(data_object) do
    %{
      data_object: data_object
    }
  end
end
