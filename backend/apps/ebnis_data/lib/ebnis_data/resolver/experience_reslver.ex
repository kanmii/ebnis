defmodule EbnisData.Resolver.ExperienceResolver do
  import Absinthe.Resolution.Helpers, only: [on_load: 2]

  alias EbnisData.Resolver
  alias EbnisData.Experience
  alias EbnisData.Entry

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
        args,
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

  def update_definition_union(%{definition: _}, _) do
    :definition_success
  end

  def update_definition_union(_, _) do
    :definition_errors
  end

  def update_experience_union(%{experience: _}, _) do
    :update_experience_some_success
  end

  def update_experience_union(%{errors: _}, _) do
    :update_experience_errors
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

        case EbnisData.update_experience(params, user.id) do
          {:ok, erfahrung_komponenten, einträge_komponenten} ->
            with_experience_id = %{
              experience_id: experience_id
            }

            bearbeitet_erfahrung =
              Enum.reduce(
                erfahrung_komponenten,
                with_experience_id,
                &process_updated_experience/2
              )

            einträge =
              Enum.reduce(
                einträge_komponenten,
                %{},
                &verarbeiten_bearbeiten_erfahrung_einträge(
                  &1,
                  &2,
                  experience_id
                )
              )

            %{
              experience: bearbeitet_erfahrung,
              entries: einträge
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

  defp verarbeiten_bearbeiten_erfahrung_einträge(
         {
           :neue_einträge,
           may_be_new_entries
         },
         acc,
         experience_id
       ) do
    Map.put(
      acc,
      :new_entries,
      process_new_entries(may_be_new_entries, experience_id)
    )
  end

  defp verarbeiten_bearbeiten_erfahrung_einträge(
         {
           :bearbeitet_einträge,
           may_be_updated_entries
         },
         acc,
         _
       ) do
    Map.put(
      acc,
      :updated_entries,
      process_updated_entries(may_be_updated_entries)
    )
  end

  defp verarbeiten_bearbeiten_erfahrung_einträge(
         {
           :gelöscht_einträge,
           may_be_deleted_entries
         },
         acc,
         _
       ) do
    results =
      may_be_deleted_entries
      |> Enum.map(fn
        {:ok, entry} ->
          %{entry: entry}

        {id, error} ->
          %{
            errors: %{
              id: id,
              error: error
            }
          }
      end)

    Map.put(
      acc,
      :deleted_entries,
      results
    )
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
      errors: Map.put(errors, :meta, %{id: id})
    }
  end

  defp updated_data_object_to_gql_output({id, string_error}) do
    %{
      errors: %{
        meta: %{
          id: id
        },
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
          Map.put(
            Resolver.changeset_errors_to_map(errors),
            :meta,
            %{
              index: index,
              client_id: changes[:client_id]
            }
          )

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

  def create_experience_union(
        %{experience: _},
        _
      ) do
    :experience_success
  end

  def create_experience_union(_, _) do
    :create_experience_errors
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
         |> EbnisData.create_experience() do
      %Experience{} = experience ->
        %{experience: experience}

      {%{id: experience_id} = experience, created_entries_and_error_changesets} ->
        einträge_schlüssel_wert =
          created_entries_and_error_changesets
          |> Enum.with_index()
          |> Enum.map(&map_create_entry_errors(&1, experience_id))

        %{
          experience: experience,
          entries: einträge_schlüssel_wert
        }

      {:error, %{} = changeset} ->
        %{
          errors:
            Map.put(
              create_experience_errors_from_changeset(changeset),
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

  defp create_experience_errors_from_changeset(changeset) do
    case changeset.errors do
      [] ->
        %{}

      errors ->
        changeset_errors_to_map(errors)
    end
    |> data_definition_changeset_to_error_map(changeset.changes.data_definitions)
  end

  defp map_create_entry_errors({%Entry{} = entry, _index}, _experience_id) do
    %{entry: entry}
  end

  defp map_create_entry_errors({changeset_fehler, index}, experience_id) do
    %{
      errors:
        Map.put(
          entry_changeset_errors_to_map(changeset_fehler),
          :meta,
          %{
            experience_id: experience_id,
            index: index,
            client_id: changeset_fehler.changes[:client_id]
          }
        )
    }
  end

  defp data_definition_changeset_to_error_map(errors, changesets) do
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

  def delete_experiences(
        %{input: ids},
        %{
          context: %{
            current_user: user,
            client_session: client_session,
            client_token: token
          }
        }
      ) do
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
        experiences: results,
        client_session: client_session,
        client_token: token
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

  def update_data_object_union(%{data_object: _}, _) do
    :data_object_success
  end

  def update_data_object_union(%{errors: _}, _) do
    :data_object_errors
  end

  def updated_entries_union(%{errors: _}, _) do
    :update_entry_errors
  end

  def updated_entries_union(_, _) do
    :update_entry_some_success
  end

  def create_entries_union(%{errors: _}, _) do
    :create_entry_errors
  end

  def create_entries_union(_, _) do
    :create_entry_success
  end

  def delete_entries_union(%{entry: _}, _) do
    :delete_entry_success
  end

  def delete_entries_union(_, _) do
    :delete_entry_errors
  end

  def on_experiences_deleted(
        %{client_token: client_token} = _mutation_result,
        _args,
        %{context: %{client_token: client_token}} = _context
      ) do
    {:error, "same client"}
  end

  def on_experiences_deleted(
        %{
          experiences: experiences_some_success
        } = result,
        _args,
        _resolution
      ) do
    experiences =
      Enum.reduce(experiences_some_success, [], fn
        %{experience: experience}, acc ->
          [experience | acc]

        _, acc ->
          acc
      end)

    result = %{
      experiences: experiences,
      client_session: result.client_session,
      client_token: result.client_token
    }

    {:ok, result}
  end

  def on_experiences_deleted(_, _, _) do
    {:error, "unsuccessful"}
  end

  def get_entries(
        %{
          experience_id: _,
          pagination: _
        } = args,
        %{context: %{current_user: user}}
      ) do
    args
    |> Map.put(:user_id, user.id)
    |> EbnisData.get_entries()
    |> case do
      {:ok, connection} ->
        {
          :ok,
          %{
            entries: connection
          }
        }

      {:error, error} ->
        {
          :ok,
          %{
            errors: %{
              error: error,
              experience_id: args[:experience_id] || ""
            }
          }
        }
    end
  end

  def get_entries(_, _) do
    Resolver.unauthorized()
  end

  def get_entries_union(%{errors: _}, _) do
    :get_entries_errors
  end

  def get_entries_union(_, _) do
    :get_entries_success
  end

  def pre_fetch_experiences(
        %{
          ids: _ids
        } = args,
        %{context: %{current_user: user}}
      ) do
    EbnisData.pre_fetch_experiences(args, user.id)
    |> case do
      {:error, errors} ->
        {:error, errors}

      data ->
        {:ok, data}
    end
  end

  def pre_fetch_experiences(_, _) do
    Resolver.unauthorized()
  end

  def get_data_objects(
        %{ids: ids},
        %{context: %{current_user: _user}}
      ) do
    {:ok, EbnisData.get_data_objects(ids)}
  end

  def get_data_objects(_, _) do
    Resolver.unauthorized()
  end
end
