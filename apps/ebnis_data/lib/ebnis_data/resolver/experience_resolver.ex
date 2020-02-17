defmodule EbnisData.Resolver.ExperienceResolver do
  import Absinthe.Resolution.Helpers, only: [on_load: 2]

  alias EbnisData.Resolver
  alias EbnisData.Experience
  alias EbnisData.Resolver.EntryResolver

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

      {:error, %{} = changeset} ->
        {
          :ok,
          %{
            errors: create_experience_errors_from_changeset(changeset)
          }
        }

      error ->
        error
    end
  end

  def create_experience(_, _) do
    Resolver.unauthorized()
  end

  defp create_experience_errors_from_changeset(changeset) do
    case changeset.errors do
      [] ->
        %{}

      errors ->
        changeset_errors_to_map(errors)
    end
    |> data_definition_changeset_to_error_map(changeset.changes.data_definitions)
  end

  defp data_definition_changeset_to_error_map(errors, changesets) do
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

      {data_definitions_errors, _} ->
        Map.put(errors, :data_definitions_errors, data_definitions_errors)
    end
  end

  defp changeset_errors_to_map(errors) do
    errors
    |> Enum.map(fn {k, {v, _}} -> {k, v} end)
    |> Enum.into(%{})
  end

  def get_experience(
        %{id: id},
        %{context: %{current_user: %{id: user_id}}}
      ) do
    case EbnisData.get_experience(id, user_id) do
      nil ->
        {:error, "Experience definition not found"}

      experience ->
        {:ok, experience}
    end
  end

  def get_experience(_, _) do
    Resolver.unauthorized()
  end

  def get_experiences(
        %{input: args},
        %{context: %{current_user: user}}
      ) do
    args
    |> Map.put(:user_id, user.id)
    |> EbnisData.get_experiences()
  end

  def get_experiences(_, _) do
    Resolver.unauthorized()
  end

  def entries(experience, args, %{context: ctx}) do
    experience_id = experience.id

    Dataloader.load(
      ctx.loader,
      :data,
      {:one, Experience},
      entries: {experience_id, args}
    )
    |> on_load(fn loader ->
      entries_connection =
        Dataloader.get(
          loader,
          :data,
          {:one, Experience},
          entries: {experience_id, args}
        )

      {:ok, entries_connection}
    end)
  end

  def save_offline_experiences(
        %{input: experiences},
        %{context: %{current_user: %{id: user_id}}}
      ) do
    {
      :ok,
      experiences
      |> Enum.with_index()
      |> Enum.map(&save_offline_experience(&1, user_id))
    }
  end

  def save_offline_experiences(_, _) do
    Resolver.unauthorized()
  end

  defp save_offline_experience({experience, index}, user_id) do
    case experience
         |> Map.put(:user_id, user_id)
         |> EbnisData.save_offline_experience() do
      {:ok, experience, []} ->
        %{experience: experience}

      {:ok, experience, entries_changesets} ->
        errors =
          Enum.map(
            entries_changesets,
            &%{
              errors: EntryResolver.entry_changeset_errors_to_map(&1),
              experience_id: experience.id,
              client_id: &1.changes.client_id
            }
          )

        %{experience: experience, entries_errors: errors}

      {:error, changeset} ->
        %{
          experience_errors: %{
            index: index,
            client_id: experience[:client_id] || index,
            errors: create_experience_errors_from_changeset(changeset)
          }
        }
    end
  end

  def update_experience(
        %{input: %{} = args},
        %{context: %{current_user: user}}
      ) do
    case EbnisData.update_experience(args, user.id) do
      {:ok, experience} ->
        {:ok, %{experience: experience}}

      {:error, %{} = changeset} ->
        {
          :ok,
          %{
            errors: Resolver.changeset_errors_to_map(changeset.errors)
          }
        }

      {:error, error} ->
        {:error, error}
    end
  end

  def update_experience(_, _) do
    Resolver.unauthorized()
  end

  def update_definitions(
        %{input: inputs},
        %{context: %{current_user: %{id: user_id}}}
      ) do
    case EbnisData.update_definitions(inputs, user_id) do
      %{experience: experience} = result ->
        {
          :ok,
          %{
            experience: experience,
            definitions:
              Enum.map(
                result.definitions,
                &map_update_definition_result/1
              )
          }
        }

      {:error, error} ->
        {:error, error}
    end
  end

  def update_definitions(_, _) do
    Resolver.unauthorized()
  end

  defp map_update_definition_result(%{definition: definition}) do
    %{definition: definition}
  end

  defp map_update_definition_result(%{errors: errors}) do
    %{
      errors: %{
        id: errors.id,
        errors: Resolver.changeset_errors_to_map(errors.errors)
      }
    }
  end

  def update_definition_union(%{definition: _}, _) do
    :definition_success
  end

  def update_definition_union(_, _) do
    :definition_errors
  end

  def update_experience_union(%{experience: _}, _) do
    :update_experience_some_success
  end

  def update_experience_union(_, _) do
    :update_experience_full_errors
  end

  def update_experiences_union(%{experiences: _}, _) do
    :update_experiences_some_success
  end

  def update_experiences_union(_, _) do
    :update_experiences_all_fail
  end

  def update_experience_own_fields_union(%{data: _}, _) do
    :experience_own_fields_success
  end

  def update_experience_own_fields_union(_, _) do
    :update_experience_own_fields_errors
  end

  def update_experiences(%{input: inputs}, %{context: %{current_user: user}}) do
    results =
      Enum.map(inputs, fn params ->
        experience_id = params.experience_id

        case EbnisData.update_experience1(params, user.id) do
          %{} = updated_experience ->
            %{
              experience:
                Enum.reduce(
                  updated_experience,
                  %{
                    experience_id: experience_id
                  },
                  &process_updated_experience/2
                )
            }

          {:error, error} ->
            %{
              errors: %{
                experience_id: experience_id,
                error: error
              }
            }
        end
      end)

    {
      :ok,
      %{
        experiences: results
      }
    }
  end

  def update_experiences(_, _) do
    {
      :ok,
      %{
        error: "unauthorized"
      }
    }
  end

  defp process_updated_experience(
         {:new_entries, may_be_new_entries},
         acc
       ) do
    Map.put(
      acc,
      :new_entries,
      process_new_entries(may_be_new_entries, acc.experience_id)
    )
  end

  defp process_updated_experience(
         {:updated_entries, may_be_updated_entries},
         acc
       ) do
    Map.put(
      acc,
      :updated_entries,
      process_updated_entries(may_be_updated_entries)
    )
  end

  defp process_updated_experience(
         {:updated_definitions, may_be_updated_definitions},
         acc
       ) do
    Map.put(
      acc,
      :updated_definitions,
      process_updated_definitions(may_be_updated_definitions)
    )
  end

  defp process_updated_experience({:own_fields, %{} = data}, acc) do
    Map.put(acc, :own_fields, %{data: data})
  end

  defp process_updated_experience({:own_fields, {:error, changeset}}, acc) do
    Map.put(
      acc,
      :own_fields,
      %{
        errors: Resolver.changeset_errors_to_map(changeset.errors)
      }
    )
  end

  defp process_updated_experience({k, v}, acc) do
    Map.put(acc, k, v)
  end

  defp process_updated_definitions(may_be_updated_definitions) do
    Enum.map(
      may_be_updated_definitions,
      fn
        %{} = updated_definition ->
          %{definition: updated_definition}

        {:error, changeset, id} ->
          %{
            errors:
              Map.merge(
                Resolver.changeset_errors_to_map(changeset.errors),
                %{
                  id: id
                }
              )
          }

        {:error, errors} ->
          %{
            errors: errors
          }
      end
    )
  end

  defp process_updated_entries(may_be_updated_entries) do
    Enum.map(
      may_be_updated_entries,
      fn
        %{} = updated_entry ->
          %{
            entry: %{
              updated_entry
              | data_objects:
                  Enum.map(
                    updated_entry.data_objects,
                    &updated_data_object_to_gql_output/1
                  )
            }
          }

        {:error, errors} ->
          %{
            errors: errors
          }
      end
    )
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

  defp process_new_entries(may_be_new_entries, experience_id) do
    may_be_new_entries
    |> Enum.with_index()
    |> Enum.map(fn
      {%{} = entry, _} ->
        %{
          entry: entry
        }

      {{:error, changeset}, index} ->
        %{
          errors:
            Map.merge(
              entry_changeset_errors_to_map(changeset),
              %{
                meta: %{
                  index: index,
                  client_id: changeset.changes[:client_id],
                  experience_id: experience_id
                }
              }
            )
        }
    end)
  end

  defp entry_changeset_errors_to_map(changeset) do
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
    Enum.reduce(changesets, {[], 0}, fn
      %{valid?: false, errors: errors, changes: changes}, {acc, index} ->
        mapped_errors =
          %{
            index: index,
            client_id: changes[:client_id]
          }
          |> Map.merge(Resolver.changeset_errors_to_map(errors))

        {
          [
            mapped_errors | acc
          ],
          index + 1
        }

      _, {acc, index} ->
        {acc, index + 1}
    end)
    |> case do
      # {[], _} ->
      #   acc_errors

      {errors, _} ->
        Map.put(acc_errors, :data_objects, Enum.reverse(errors))
    end
  end

  def create_experience_union(%{experience: _}, _) do
    :experience_success
  end

  def create_experience_union(_, _) do
    :create_experience_errorss
  end

  def create_experiences(
        %{input: inputs},
        %{context: %{current_user: %{id: user_id}}}
      ) do
    {
      :ok,
      inputs
      |> Enum.with_index()
      |> Enum.map(&create_experience_p(&1, user_id))
    }
  end

  def create_experiences(_, _) do
    Resolver.unauthorized()
  end

  defp create_experience_p({attrs, index}, user_id) do
    case attrs
         |> Map.put(:user_id, user_id)
         |> EbnisData.create_experience1() do
      {%{} = experience, []} ->
        %{experience: experience}

      {%{id: experience_id} = experience, entries_changesets} ->
        entries_changesets
        |> Enum.with_index()
        |> Enum.reduce(
          [],
          &map_create_entry_errors(&1, &2, experience_id)
        )
        |> case do
          [] ->
            %{experience: experience}

          errors ->
            %{experience: experience, entries_errors: Enum.reverse(errors)}
        end

      {:error, %{} = changeset} ->
        %{
          errors:
            Map.put(
              create_experience_errors_from_changeset1(changeset),
              :meta,
              %{
                index: index,
                client_id: attrs[:client_id]
              }
            )
        }

      {:error, error} ->
        %{
          errors: %{
            error: error,
            meta: %{
              index: index,
              client_id: attrs[:client_id]
            }
          }
        }
    end
  end

  defp create_experience_errors_from_changeset1(changeset) do
    case changeset.errors do
      [] ->
        %{}

      errors ->
        changeset_errors_to_map(errors)
    end
    |> data_definition_changeset_to_error_map1(changeset.changes.data_definitions)
  end

  defp map_create_entry_errors({nil, _}, acc, _) do
    acc
  end

  defp map_create_entry_errors({changeset, index}, acc, experience_id) do
    errors =
      Map.put(
        entry_changeset_errors_to_map(changeset),
        :meta,
        %{
          experience_id: experience_id,
          index: index,
          client_id: changeset.changes[:client_id]
        }
      )

    [errors | acc]
  end

  defp data_definition_changeset_to_error_map1(errors, changesets) do
    changesets
    |> Enum.reduce(
      {[], 0},
      fn
        %{valid?: false, errors: errors}, {acc, index} ->
          errors =
            Map.put(
              changeset_errors_to_map(errors),
              :index,
              index
            )

          {[errors | acc], index + 1}

        _, {acc, index} ->
          {acc, index + 1}
      end
    )
    |> case do
      {[], _} ->
        errors

      {data_definitions_errors, _} ->
        Map.put(errors, :data_definitions, data_definitions_errors)
    end
  end

  def delete_experience_union(%{errors: _}, _) do
    :delete_experience_errors
  end

  def delete_experience_union(_, _) do
    :delete_experience_success
  end

  def delete_experiences_union(%{error: _}, _) do
    :delete_experiences_all_fail
  end

  def delete_experiences_union(_, _) do
    :delete_experiences_some_success
  end

  def delete_experiences(%{input: ids}, %{context: %{current_user: user}}) do
    results =
      ids
      |> Enum.map(fn id ->
        case EbnisData.delete_experience(id, user.id) do
          {:ok, experience} ->
            %{
              experience: experience
            }

          {:error, error} ->
            %{
              errors: %{
                id: id,
                error: error
              }
            }
        end
      end)

    {
      :ok,
      %{
        experiences: results
      }
    }
  end

  def delete_experiences(_, _) do
    {
      :ok,
      %{
        error: "unauthorized"
      }
    }
  end
end
