defmodule EbnisData.EntryApi do
  require Logger
  import Ecto.Query, warn: false

  alias EbnisData.Repo
  alias EbnisData.Entry
  alias EbnisData.DataObject
  alias Ecto.Changeset
  alias Ecto.Multi
  alias Absinthe.Relay.Connection

  @entry_multi_key "e"

  @delete_entry_exception_header "\nDelete entry exception ID: "

  @stacktrace "\n\n----------STACKTRACE---------------\n\n"

  @error_not_found {:error, "entry not found"}
  @data_object_not_found {:error, "data object not found"}

  @update_data_object_exception_header "\nUpdate data object exception:\n  params:\n\t"

  @empty_relay_connection %{
    edges: [],
    page_info: %{
      start_cursor: "",
      end_cursor: "",
      has_previous_page: false,
      has_next_page: false
    }
  }

  defp validate_data_objects_with_definitions(data_definitions, data_list) do
    {definitions_ids_map, all_definitions_ids} =
      data_definitions
      |> Enum.reduce({%{}, []}, fn definition, {map, ids} ->
        {Map.put(map, definition.id, definition.type), [definition.id | ids]}
      end)

    {status, result, seen} =
      data_list
      |> Enum.reduce({:ok, [], %{}}, fn data_object, {status, acc, seen} ->
        definition_id = data_object.definition_id
        definition_type = definitions_ids_map[definition_id]
        [data_type] = Map.keys(data_object.data)

        cond do
          definition_type == nil ->
            changeset =
              add_error_make_fake_data_object_changeset(
                data_object,
                :definition,
                "does not exist"
              )

            {:error, [changeset | acc], seen}

          seen[definition_id] == true ->
            changeset =
              add_error_make_fake_data_object_changeset(
                data_object,
                :definition_id,
                "has already been taken"
              )

            {:error, [changeset | acc], seen}

          data_type != definition_type ->
            seen = Map.put(seen, definition_id, true)

            changeset =
              add_error_make_fake_data_object_changeset(
                data_object,
                :data,
                "has invalid data type: '#{data_type}' instead of '#{definition_type}'"
              )

            {:error, [changeset | acc], seen}

          true ->
            seen = Map.put(seen, definition_id, true)
            changeset = DataObject.changeset(%DataObject{}, data_object)
            {status, [changeset | acc], seen}
        end
      end)

    result = Enum.reverse(result)

    all_definitions_ids
    |> Enum.reduce([], fn definition_id, acc ->
      case seen[definition_id] do
        nil ->
          changeset =
            add_error_make_fake_data_object_changeset(
              %{
                definition_id: definition_id
              },
              :definition_id,
              "data definition ID #{definition_id} is missing"
            )

          [changeset | acc]

        _ ->
          acc
      end
    end)
    |> case do
      [] ->
        {status, result}

      missing_definitions_errors ->
        {:error, Enum.concat(result, missing_definitions_errors)}
    end
  end

  defp add_error_make_fake_data_object_changeset(object, field, error) do
    %{
      changes: object,
      errors: [{field, {error, []}}],
      valid?: false
    }
  end

  defp create_entry_multi(_, _, attrs) do
    %Entry{}
    |> Entry.changeset(attrs)
    |> Repo.insert()
  end

  defp create_data_objects(%{@entry_multi_key => entry}, data_objects_changesets) do
    entry_id = entry.id

    {multi, _} =
      data_objects_changesets
      |> Enum.reduce({Multi.new(), 0}, fn data_changeset, {multi, index} ->
        multi =
          Multi.insert(
            multi,
            index,
            data_changeset
            |> Changeset.put_change(:entry_id, entry_id),
            returning: true
          )

        {multi, index + 1}
      end)

    multi
  end

  @spec create_entry(
          attrs :: %{
            experience_id: integer() | binary(),
            user_id: integer() | binary()
          }
        ) ::
          {:error, Changeset.t()}
          | {:ok, Entry.t()}
  def create_entry(%{user_id: user_id, experience_id: experience_id} = attrs) do
    case EbnisData.get_experience(experience_id, user_id) do
      nil ->
        fake_changeset = %{
          errors: [experience: {"does not exist", []}],
          changes: Map.put(attrs, :data_objects, [])
        }

        {:error, fake_changeset}

      experience ->
        case validate_data_objects_with_definitions(
               experience.data_definitions,
               attrs.data_objects
             ) do
          {:ok, data_objects_changesets} ->
            Multi.new()
            |> Multi.run(@entry_multi_key, &create_entry_multi(&1, &2, attrs))
            |> Multi.merge(&create_data_objects(&1, data_objects_changesets))
            |> Repo.transaction()
            |> case do
              {:ok, result} ->
                {:ok, process_create_entry_result(result)}

              {:error, @entry_multi_key, changeset, _rest} ->
                {:error, put_empty_data_objects_changes(changeset)}

              {:error, index, changeset, _rest} ->
                {
                  :error,
                  data_objects_changesets
                  |> List.replace_at(index, changeset)
                  |> fake_changeset_with_data_objects(attrs)
                }
            end

          {:error, data_objects_changesets} ->
            {
              :error,
              fake_changeset_with_data_objects(data_objects_changesets, attrs)
            }
        end
    end
  end

  defp process_create_entry_result(result) do
    {entry, data_list_map} = Map.pop(result, @entry_multi_key)

    data_list =
      data_list_map
      |> Enum.sort_by(fn {index, _} -> index end)
      |> Enum.map(fn {_, v} -> v end)

    %{entry | data_objects: data_list}
  end

  defp fake_changeset_with_data_objects(changesets, attrs) do
    %{
      errors: [],
      changes: Map.put(attrs, :data_objects, changesets)
    }
  end

  defp put_empty_data_objects_changes(changeset) do
    Changeset.put_change(changeset, :data_objects, [])
  end

  defp query_with_data_list do
    Entry
    |> join(:inner, [e], dl in assoc(e, :data_objects))
    |> preload([_, dl], data_objects: dl)
  end

  defp get_paginated_query({experience_id, pagination_args}, opts) do
    pagination = pagination_args[:pagination] || %{first: 100}

    {
      :ok,
      offset,
      limit
    } = Connection.offset_and_limit_for_query(pagination, opts)

    query =
      query_with_data_list()
      |> where([e], e.experience_id == ^experience_id)
      |> limit(^(limit + 1))
      |> offset(^offset)

    {query, {limit, offset}}
  end

  @spec get_paginated_entries(
          [{integer() | binary(), map()}],
          list()
        ) :: [Connection.t()]
  def get_paginated_entries(
        experiences_ids_pagination_args,
        repo_opts
      ) do
    [{experience_id, _} = head | tail] = experiences_ids_pagination_args
    {query, limit_offset} = get_paginated_query(head, [])
    tracker = Map.new([{experience_id, limit_offset}])

    {query, trackers} =
      Enum.reduce(
        tail,
        {query, tracker},
        fn {experience_id, _} = args, {query, trackers} ->
          {next_query, limit_offset} = get_paginated_query(args, [])
          trackers = Map.put(trackers, experience_id, limit_offset)
          {union_all(query, ^next_query), trackers}
        end
      )

    query
    |> Repo.all(repo_opts)
    |> case do
      [] ->
        [@empty_relay_connection]

      records_union ->
        records_union = Enum.group_by(records_union, & &1.experience_id)

        Enum.map(
          experiences_ids_pagination_args,
          fn {experience_id, _} ->
            case records_union[experience_id] do
              nil ->
                @empty_relay_connection

              records ->
                {limit, offset} = trackers[experience_id]

                {:ok, connection} =
                  Connection.from_slice(
                    Enum.take(records, limit),
                    offset,
                    []
                  )

                connection
            end
          end
        )
    end
  end

  def create_entries(attrs) do
    result =
      attrs
      |> Enum.reduce(%{}, fn param, acc ->
        experience_id = param.experience_id

        case create_entry(param) do
          {:ok, entry} ->
            Map.update(
              acc,
              experience_id,
              %{
                entries: [entry],
                errors: [],
                experience_id: experience_id
              },
              fn map ->
                %{
                  map
                  | entries: [entry | map.entries]
                }
              end
            )

          {:error, changeset} ->
            errors = %{
              errors: changeset,
              experience_id: experience_id,
              client_id: changeset.changes.client_id
            }

            Map.update(
              acc,
              experience_id,
              %{
                entries: [],
                errors: [errors],
                experience_id: experience_id
              },
              fn map ->
                %{
                  map
                  | errors: [errors | map.errors]
                }
              end
            )
        end
      end)

    Enum.reduce(
      result,
      %{},
      fn {k, v}, acc ->
        Map.put(
          acc,
          k,
          %{v | entries: Enum.reverse(v.entries), errors: Enum.reverse(v.errors)}
        )
      end
    )
  end

  def get_entry(id) do
    Entry
    |> where([e], e.id == ^id)
    |> Repo.all()
    |> case do
      [] ->
        nil

      [entry] ->
        entry
    end
  end

  def delete_entry(id) do
    case get_entry(id) do
      nil ->
        @error_not_found

      entry ->
        Repo.delete(entry)
    end
  rescue
    error ->
      Logger.error(fn ->
        [
          @delete_entry_exception_header,
          inspect(id),
          @stacktrace,
          :error
          |> Exception.format(error, __STACKTRACE__)
          |> Ebnis.prettify_with_new_line()
        ]
      end)

      @error_not_found
  end

  def update_data_object(params) do
    DataObject
    |> where([d], d.id == ^params.id)
    |> Repo.all()
    |> case do
      [] ->
        @data_object_not_found

      [object] ->
        object
        |> DataObject.changeset(params)
        |> Repo.update()
    end
  rescue
    error ->
      Logger.error(fn ->
        [
          @update_data_object_exception_header,
          inspect(params),
          @stacktrace,
          Exception.format(:error, error, __STACKTRACE__)
          |> Ebnis.prettify_with_new_line()
        ]
      end)

      @data_object_not_found
  end
end
