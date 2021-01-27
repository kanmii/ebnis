defmodule EbnisData.ExperienceApi do
  require Logger

  import Ecto.Query, warn: true
  import Ebnis

  alias EbnisData.Repo
  alias EbnisData.Experience
  alias EbnisData.Entry
  alias EbnisData.DataDefinition
  alias EbnisData.EntryApi
  alias Absinthe.Relay.Connection
  alias EbnisData.DataObject
  alias EbnisData.DataType

  @get_experience_exception_header "\n\nException while getting experience with:"
  @bad_request "bad request"
  @update_definitions_exception_header "\n\nException while updating definitions with:"
  @experience_can_not_be_created_exception_header "\n\nsomething is wrong - experience can not be created"
  @update_experience_exception_header "\n\nException while updating experience with:"

  @empty_relay_connection EbnisData.get_empty_relay_connection()

  @spec get_experience(id :: integer() | binary(), user_id :: integer() | binary()) ::
          Experience.t() | nil
  def get_experience(id, user_id) do
    key = Ebnis.make_cache_key(:experience, user_id, id)

    Cachex.fetch(:ebnis_cache, key, fn ->
      %{id: id, user_id: user_id}
      |> query_with_data_definitions()
      |> Repo.all()
      |> case do
        [experience] ->
          {:commit, experience}

        _ ->
          {:ignore, nil}
      end
    end)
    |> case do
      {_, %Experience{} = experience} ->
        experience

      _ ->
        nil
    end
  rescue
    error ->
      Logger.error(fn ->
        [
          @get_experience_exception_header,
          "\n\tid: #{id}",
          "\n\tUser ID: #{user_id}",
          stacktrace_prefix(),
          :error
          |> Exception.format(error, __STACKTRACE__)
          |> prettify_with_new_line()
        ]
      end)

      nil
  end

  @pagination_keys [:first, :last, :before, :after]

  @spec get_experiences(
          args :: %{
            pagination: Connection.Options.t(),
            user_id: binary() | Integer.t(),
            ids: [binary() | Integer.t()],
            client_ids: [binary() | Integer.t()]
          }
        ) ::
          {:ok, Connection.t()} | {:error, any}
  def get_experiences(args) do
    case Enum.any?(@pagination_keys, &Map.has_key?(args, &1)) do
      true ->
        args
        |> query_with_data_definitions()
        |> Connection.from_query(
          &Repo.all(&1),
          args
        )

      _ ->
        experiences =
          args
          |> query_with_data_definitions()
          |> Repo.all()

        experience_connection = %{
          edges: Enum.map(experiences, &%{node: &1, cursor: ""}),
          page_info: %{
            has_next_page: false,
            has_previous_page: false
          }
        }

        {:ok, experience_connection}
    end
  end

  defp query_with_data_definitions(args) do
    definitions_query = query_data_definitions(args)

    query =
      from(
        e in Experience,
        order_by: [desc: e.updated_at, desc: e.id],
        preload: [data_definitions: ^definitions_query]
      )

    Enum.reduce(
      args,
      query,
      &query(&2, &1)
    )
  end

  defp query_data_definitions(%{id: experience_id}) do
    from(
      d in DataDefinition,
      where: d.experience_id == ^experience_id
    )
  end

  defp query_data_definitions(%{ids: experience_ids}) do
    from(
      d in DataDefinition,
      where: d.experience_id in ^experience_ids,
      order_by: [asc: d.id]
    )
  end

  defp query_data_definitions(_) do
    from(
      d in DataDefinition,
      order_by: [asc: d.id]
    )
  end

  defp query(queryable, {:user_id, id}) do
    where(queryable, [e], e.user_id == ^id)
  end

  defp query(queryable, {:id, id}) do
    where(queryable, [e], e.id == ^id)
  end

  defp query(queryable, {:ids, ids}) do
    where(queryable, [e], e.id in ^ids)
  end

  defp query(queryable, _) do
    queryable
  end

  defp map_fake_entry_data_object_changeset(
         {status, valids, changesets} = _acc,
         changes,
         errors,
         valid?
       ) do
    changeset = %{
      changes: changes,
      errors: errors,
      valid?: valid?
    }

    changesets = [changeset | changesets]

    case status == :error || valid? == false do
      true ->
        {:error, [], changesets}

      _ ->
        {:ok, [changes | valids], changesets}
    end
  end

  def delete_experience(id, user_id) do
    case get_experience(id, user_id) do
      %{} = experience ->
        result = Repo.delete(experience)

        key = Ebnis.make_cache_key(:experience, user_id, id)
        Cachex.del(:ebnis_cache, key)

        result

      _ ->
        {:error, @bad_request}
    end
  end

  defp get_definition(id) do
    DataDefinition
    |> where([d], d.id == ^id)
    |> Repo.all()
    |> case do
      [] ->
        nil

      [definition] ->
        definition
    end
  end

  def update_experience(params, user_id) do
    {experience_id, update_params} = Map.pop(params, :experience_id)

    case get_experience(experience_id, user_id) do
      %{} = experience ->
        bearbeitet_erfahrung_komponenten = %{}
        einträge_komponenten = []

        {
          bearbeitet_erfahrung_komponenten_1,
          einträge_komponenten_1,
          updated_experience
        } =
          [
            :delete_entries,
            :update_definitions,
            :update_entries,
            :own_fields,
            :add_entries
          ]
          |> Enum.reduce(
            {
              bearbeitet_erfahrung_komponenten,
              einträge_komponenten,
              experience
            },
            &update_experience_p(&2, &1, update_params[&1])
          )

        key = Ebnis.make_cache_key(:experience, user_id, experience_id)
        Cachex.put(:ebnis_cache, key, updated_experience)

        {:ok, bearbeitet_erfahrung_komponenten_1, einträge_komponenten_1}

      _ ->
        {:error, "experience not found"}
    end
  rescue
    error ->
      Logger.error(fn ->
        [
          @update_experience_exception_header,
          "\n\tUser ID: #{user_id}",
          "\n\tparams: #{inspect(params)}",
          stacktrace_prefix(),
          :error
          |> Exception.format(error, __STACKTRACE__)
          |> prettify_with_new_line()
        ]
      end)

      {:error, "experience not found"}
  end

  defp update_experience_p(acc, _key, nil) do
    acc
  end

  # Delete entries
  defp update_experience_p(
         {
           bearbeitet_erfahrung_komponenten,
           einträge_komponenten,
           experience
         },
         :delete_entries,
         ids
       ) do
    bearbeitet_erfahrung_komponenten_1 =
      Map.merge(
        bearbeitet_erfahrung_komponenten,
        %{updated_at: experience.updated_at}
      )

    gelöscht_einträge =
      Enum.map(
        ids,
        &EntryApi.delete_entry(&1)
      )

    einträge_komponenten_1 = [
      {:gelöscht_einträge, gelöscht_einträge}
      | einträge_komponenten
    ]

    {
      bearbeitet_erfahrung_komponenten_1,
      einträge_komponenten_1,
      experience
    }
  end

  # update definitions
  defp update_experience_p(
         {
           bearbeitet_erfahrung_komponenten,
           einträge_komponenten,
           experience
         },
         :update_definitions,
         inputs
       ) do
    id_to_definition_type_map =
      Enum.reduce(
        experience.data_definitions,
        %{},
        &Map.put(&2, &1.id, &1.type)
      )

    {updated_definitions, id_to_updated_definition_map} =
      Enum.reduce(
        inputs,
        {[], %{}},
        &update_experiences_update_definition(
          &1,
          id_to_definition_type_map[&1.id],
          &2
        )
      )

    new_definitions_for_experience =
      Enum.map(
        experience.data_definitions,
        &(id_to_updated_definition_map[&1.id] || &1)
      )

    new_experience = %{
      experience
      | data_definitions: new_definitions_for_experience
    }

    bearbeitet_erfahrung_komponenten_1 =
      Map.merge(
        bearbeitet_erfahrung_komponenten,
        %{
          updated_at: experience.updated_at,
          updated_definitions: Enum.reverse(updated_definitions)
        }
      )

    {
      bearbeitet_erfahrung_komponenten_1,
      einträge_komponenten,
      new_experience
    }
  end

  # Update entries
  defp update_experience_p(
         {
           bearbeitet_erfahrung_komponenten,
           einträge_komponenten,
           experience
         },
         :update_entries,
         inputs
       ) do
    bearbeitet_erfahrung_komponenten_1 =
      Map.merge(
        bearbeitet_erfahrung_komponenten,
        %{
          updated_at: experience.updated_at
        }
      )

    bearbeitet_einträge =
      Enum.map(
        inputs,
        &EntryApi.update_entry(&1, experience)
      )

    einträge_komponenten_1 = [
      {:bearbeitet_einträge, bearbeitet_einträge}
      | einträge_komponenten
    ]

    {
      bearbeitet_erfahrung_komponenten_1,
      einträge_komponenten_1,
      experience
    }
  end

  # Update own_fields
  defp update_experience_p(
         {
           bearbeitet_erfahrung_komponenten,
           einträge_komponenten,
           experience
         },
         :own_fields,
         attrs
       ) do
    {
      bearbeitet_erfahrung_komponenten_1,
      updated_experience
    } =
      experience
      |> Experience.changeset(attrs)
      |> Repo.update()
      |> case do
        {:ok, updated_experience} ->
          data =
            Map.merge(
              bearbeitet_erfahrung_komponenten,
              %{
                updated_at: updated_experience.updated_at,
                own_fields:
                  Map.take(
                    updated_experience,
                    [:title, :description]
                  )
              }
            )

          {data, updated_experience}

        {:error, changeset} ->
          data =
            Map.merge(
              bearbeitet_erfahrung_komponenten,
              %{
                updated_at: experience.updated_at,
                own_fields: {:error, changeset}
              }
            )

          {data, experience}
      end

    {
      bearbeitet_erfahrung_komponenten_1,
      einträge_komponenten,
      updated_experience
    }
  end

  # Add entries
  # we must update definitions before adding entries
  defp update_experience_p(
         {
           bearbeitet_erfahrung_komponenten,
           einträge_komponenten,
           experience
         },
         :add_entries,
         inputs
       ) do
    bearbeitet_erfahrung_komponenten_1 =
      Map.merge(
        bearbeitet_erfahrung_komponenten,
        %{
          updated_at: experience.updated_at
        }
      )

    neue_einträge = Enum.map(inputs, &EntryApi.create_entry(&1, experience))

    einträge_komponenten_1 = [
      {:neue_einträge, neue_einträge}
      | einträge_komponenten
    ]

    {
      bearbeitet_erfahrung_komponenten_1,
      einträge_komponenten_1,
      experience
    }
  end

  defp update_experiences_update_definition(
         input,
         old_type,
         {updated_data_list, id_to_updated_definition_map}
       ) do
    id = input.id

    case validate_update_defintion_type(input, old_type) do
      :error ->
        data = {
          :error,
          %{
            id: id,
            error: @bad_request
          }
        }

        {
          [data | updated_data_list],
          id_to_updated_definition_map
        }

      func ->
        with %{} = definition <- get_definition(id),
             changeset <- DataDefinition.changeset(definition, input),
             {:ok, definition} <- Repo.update(changeset) do
          func.()

          new_id_to_updated_definition_map =
            Map.put(
              id_to_updated_definition_map,
              definition.id,
              definition
            )

          {
            [definition | updated_data_list],
            new_id_to_updated_definition_map
          }
        else
          nil ->
            data = {
              :error,
              %{
                id: id,
                error: "does not exist"
              }
            }

            {
              [data | updated_data_list],
              id_to_updated_definition_map
            }

          {:error, changeset} ->
            data = {:error, changeset, id}

            {
              [data | updated_data_list],
              id_to_updated_definition_map
            }
        end
    end
  rescue
    error ->
      Logger.error(fn ->
        [
          @update_definitions_exception_header,
          inspect({input}),
          stacktrace_prefix(),
          Exception.format(:error, error, __STACKTRACE__)
          |> prettify_with_new_line()
        ]
      end)

      data = {
        :error,
        %{
          id: input.id,
          error: @bad_request
        }
      }

      {
        [data | updated_data_list],
        id_to_updated_definition_map
      }
  end

  defp validate_update_defintion_type(input, old_type) do
    id = input.id
    new_type = input[:type]

    case {old_type, new_type} do
      {_, nil} ->
        nil

      {_, "multi_line_text"} ->
        :ok

      {_, "single_line_text"} ->
        :ok

      {"decimal", "integer"} ->
        :ok

      {"integer", "decimal"} ->
        :ok

      {"datetime", "date"} ->
        :ok

      {"date", "datetime"} ->
        :ok

      _ ->
        :error
    end
    |> case do
      :ok ->
        fn ->
          from(
            d in DataObject,
            where: d.definition_id == ^id
          )
          |> Repo.all()
          |> Enum.map(fn datum ->
            [{_data_object_type, v}] = Map.to_list(datum.data)

            # It is possible for client to have already sent the data object for
            # update with the new data type, in that case
            # `data_object_type == new_type` and we can thus skip the update
            # of this particular data obejct.

            {:ok, new_data} =
              case new_type do
                "integer" ->
                  DataType.parse_float_to_int(v)

                _ ->
                  DataType.parse(new_type, v, nil)
              end

            from(
              d in DataObject,
              where: d.id == ^datum.id,
              update: [
                set: [data: ^new_data]
              ]
            )
            |> Repo.update_all([])
          end)
        end

      nil ->
        fn -> nil end

      :error ->
        :error
    end
  end

  @spec create_experience(attrs: %{}) ::
          %Experience{}
          | {%Experience{}, [%Entry{} | %Ecto.Changeset{}]}
          | {:error, %Ecto.Changeset{}}
  def create_experience(attrs) do
    attrs =
      Map.update(
        attrs,
        :custom_requireds,
        [:data_definitions],
        &[:data_definitions | &1]
      )

    case %Experience{}
         |> Experience.changeset(attrs)
         |> Repo.insert() do
      {
        :ok,
        %Experience{
          id: id,
          user_id: user_id
        } = experience
      } ->
        key = Ebnis.make_cache_key(:experience, user_id, id)
        Cachex.put(:ebnis_cache, key, experience)

        experience
        |> create_entry(attrs)

      {:error, changeset} ->
        {:error, changeset}
    end
  rescue
    error ->
      Logger.error(fn ->
        [
          @experience_can_not_be_created_exception_header,
          inspect(attrs),
          stacktrace_prefix(),
          Exception.format(:error, error, __STACKTRACE__)
          |> prettify_with_new_line()
        ]
      end)

      {:error, @bad_request}
  end

  defp validate_create_entries([], _, _) do
    {[], []}
  end

  defp validate_create_entries(entries_attrs, experience, nil) do
    associations = %{
      experience_id: experience.id,
      user_id: experience.user_id
    }

    client_id_to_definition_id_map = karte_client_id_to_definition_id(experience)

    Enum.reduce(
      entries_attrs,
      [],
      fn attrs, created_entries_and_error_changesets ->
        case %{
               attrs
               | data_objects:
                   Enum.map(
                     attrs.data_objects,
                     &Map.put(
                       &1,
                       :definition_id,
                       client_id_to_definition_id_map[&1.definition_id]
                     )
                   )
             }
             |> Map.merge(associations)
             |> EntryApi.create_entry(experience) do
          {:error, changeset} ->
            [changeset | created_entries_and_error_changesets]

          entry ->
            [entry | created_entries_and_error_changesets]
        end
      end
    )
  end

  defp validate_create_entries(entries, experience, experience_client_id) do
    client_id_to_definition_id_map = karte_client_id_to_definition_id(experience)

    associations = %{
      experience_id: experience.id,
      user_id: experience.user_id
    }

    Enum.reduce(
      entries,
      [],
      fn create_entry_attr, created_entries_and_error_changesets ->
        case create_entry_attr[:experience_id] == experience_client_id do
          true ->
            create_offline_entry(
              experience,
              create_entry_attr,
              client_id_to_definition_id_map,
              associations,
              created_entries_and_error_changesets
            )

          _ ->
            offline_entry_add_error(create_entry_attr, created_entries_and_error_changesets)
        end
      end
    )
  end

  defp create_offline_entry(
         experience,
         attrs,
         client_id_to_definition_id_map,
         associations,
         created_entries_and_error_changesets
       ) do
    with {:ok, validated_attrs} <-
           update_data_objects_with_definition_ids(
             attrs,
             client_id_to_definition_id_map
           ),
         %{} = entry <-
           validated_attrs
           |> Map.merge(associations)
           |> EntryApi.create_entry(experience) do
      [entry | created_entries_and_error_changesets]
    else
      {:error, changeset} ->
        [changeset | created_entries_and_error_changesets]
    end
  end

  defp karte_client_id_to_definition_id(experience) do
    Enum.reduce(
      experience.data_definitions,
      %{},
      &Map.put(&2, &1.client_id, &1.id)
    )
  end

  defp update_data_objects_with_definition_ids(entry_attrs, definitions_map) do
    Enum.reduce(
      entry_attrs.data_objects,
      {:ok, [], []},
      fn data_attrs, acc ->
        definition_client_id = data_attrs[:definition_id]

        case definitions_map[definition_client_id] do
          nil ->
            map_fake_entry_data_object_changeset(
              acc,
              data_attrs,
              [
                definition_id:
                  "data definition client ID '#{definition_client_id}' does not exist"
              ],
              false
            )

          definition_id ->
            changes =
              Map.put(
                data_attrs,
                :definition_id,
                definition_id
              )

            map_fake_entry_data_object_changeset(acc, changes, [], true)
        end
      end
    )
    |> case do
      {:ok, valids, _} ->
        {:ok, %{entry_attrs | data_objects: Enum.reverse(valids)}}

      {:error, _, changesets} ->
        fake_changeset = %{
          changes:
            Map.put(
              entry_attrs,
              :data_objects,
              Enum.reverse(changesets)
            ),
          errors: []
        }

        {
          :error,
          fake_changeset
        }
    end
  end

  defp offline_entry_add_error(entry, created_entries_and_error_changesets) do
    changeset = %{
      changes: entry,
      valid?: false,
      errors: [
        experience_id: {"is not the same as experience client ID", []}
      ]
    }

    [changeset | created_entries_and_error_changesets]
  end

  defp create_entry(experience, attrs = %{entries: entries}) do
    created_entries_and_error_changesets =
      validate_create_entries(
        entries,
        experience,
        attrs[:client_id]
      )
      |> Enum.reverse()

    {experience, created_entries_and_error_changesets}
  end

  defp create_entry(experience, _) do
    experience
  end


  def pre_fetch_experiences(%{ids: ids} = args, user_id) do
    from(
      exp in Experience,
      where: exp.user_id == ^user_id,
      where: exp.id in ^ids,
      join: dd in assoc(exp, :data_definitions),
      preload: [data_definitions: dd]
    )
    |> Repo.all()
    |> case do
      [] ->
        []

      experiences ->
        pagination_args =
          case args[:entry_pagination] do
            nil ->
              %{first: 10}

            pagination ->
              pagination
          end

        {data, limit, offset} =
          EbnisData.get_paginated_entries(
            ids,
            pagination_args,
            []
          )

        experience_id_to_entry_map = Enum.group_by(data, & &1.experience_id)

        Enum.map(
          experiences,
          fn experience ->
            entries =
              case experience_id_to_entry_map[experience.id] do
                nil ->
                  @empty_relay_connection

                entries_for_experience ->
                  {:ok, connection} =
                    Connection.from_slice(
                      entries_for_experience
                      |> Enum.take(limit),
                      offset,
                      has_previous_page: offset > 0,
                      has_next_page: length(entries_for_experience) > limit
                    )

                  connection
              end

            Map.put(
              experience,
              :entries,
              entries
            )
          end
        )
    end
  rescue
    error ->
      Logger.error(fn ->
        [
          @get_experience_exception_header,
          "\n\targs: #{inspect(args)}",
          Ebnis.stacktrace_prefix(),
          :error
          |> Exception.format(error, __STACKTRACE__)
          |> Ebnis.prettify_with_new_line()
        ]
      end)

      {:error, @bad_request}
  end
end
