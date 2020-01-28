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
  @data_object_not_found {
    :error,
    "Data object not found.\nMay be it was created offline."
  }

  @update_data_object_exception_header "\nUpdate data object exception:\n  params:\n\t"

  @update_entry_exception_header "\nUpdate entry exception:\n  params:\n\t"

  @entry_not_found "entry not found"

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

  defp create_data_objects_multi(%{@entry_multi_key => entry}, data_objects_changesets) do
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
            |> Multi.merge(&create_data_objects_multi(&1, data_objects_changesets))
            |> Repo.transaction()
            |> case do
              {:ok, result} ->
                {:ok, process_create_entry_result(result)}

              {:error, @entry_multi_key, changeset, _rest} ->
                {:error, put_empty_data_objects_changes(changeset)}

              {:error, data_object_index, changeset, _rest} ->
                {
                  :error,
                  data_objects_changesets
                  |> List.replace_at(data_object_index, changeset)
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

  defp get_paginated_query({experience_id, pagination_args}, opts) do
    pagination = pagination_args[:pagination] || %{first: 100}

    {
      :ok,
      offset,
      limit
    } = Connection.offset_and_limit_for_query(pagination, opts)

    query =
      Entry
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
        Enum.map(experiences_ids_pagination_args, fn _ -> @empty_relay_connection end)

      entries ->
        entries_map =
          entries
          |> put_data_objects_in_entries()
          |> Enum.group_by(& &1.experience_id)

        Enum.map(
          experiences_ids_pagination_args,
          fn {experience_id, _} ->
            case entries_map[experience_id] do
              nil ->
                @empty_relay_connection

              records ->
                {limit, offset} = trackers[experience_id]

                {:ok, connection} =
                  Connection.from_slice(
                    records
                    |> Enum.take(limit)
                    |> Enum.sort_by(
                      & &1.updated_at,
                      &(DateTime.compare(&1, &2) == :gt)
                    ),
                    offset,
                    []
                  )

                connection
            end
          end
        )
    end
  end

  defp put_data_objects_in_entries(entries) do
    entries_ids = Enum.map(entries, & &1.id)

    data_objects_map =
      from(
        d in DataObject,
        where: d.entry_id in ^entries_ids,
        order_by: [asc: d.id]
      )
      |> Repo.all()
      |> Enum.group_by(& &1.entry_id)

    entries_map = Enum.reduce(entries, %{}, &Map.put(&2, &1.id, &1))

    Enum.map(entries_ids, fn entry_id ->
      entry = entries_map[entry_id]

      %Entry{
        entry
        | data_objects: data_objects_map[entry_id]
      }
    end)
  end

  def create_entries(attrs) do
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
              update_in(map.entries, &[entry | &1])
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
              update_in(map.errors, &[errors | &1])
            end
          )
      end
    end)
    |> Enum.reduce(
      %{},
      &clean_up_create_entries_result_reducer/2
    )
  end

  defp clean_up_create_entries_result_reducer({k, v}, acc) do
    errors =
      case v.errors do
        [] ->
          nil

        [error] ->
          [error]

        errors ->
          Enum.reverse(errors)
      end

    Map.put(
      acc,
      k,
      %{
        v
        | entries: Enum.reverse(v.entries),
          errors: errors
      }
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

  def update_entry(%{entry_id: entry_id} = params, user_id) do
    from(
      e in Entry,
      where: e.id == ^entry_id,
      join: ex in assoc(e, :experience),
      where: ex.user_id == ^user_id
    )
    |> Repo.all()
    |> case do
      [] ->
        %{
          entry_id: entry_id,
          error: @entry_not_found
        }

      [entry] ->
        {
          may_be_updated_data_objects,
          updated_ats
        } = update_data_objects(params.data_objects)

        may_be_updated_entry = updated_entry_updated_at(entry, updated_ats)

        %{
          entry_id: entry_id,
          updated_at: may_be_updated_entry.updated_at,
          data_objects: may_be_updated_data_objects
        }
    end
  rescue
    error ->
      Logger.error(fn ->
        [
          @update_entry_exception_header,
          inspect(params),
          @stacktrace,
          Exception.format(:error, error, __STACKTRACE__)
          |> Ebnis.prettify_with_new_line()
        ]
      end)

      %{
        entry_id: entry_id,
        error: @entry_not_found
      }
  end

  defp updated_entry_updated_at(entry, updated_ats) do
    case updated_ats do
      [] ->
        entry

      updated_at ->
        [latest_updated_at | _] =
          Enum.sort(
            updated_at,
            &(DateTime.compare(&1, &2) == :gt)
          )

        {:ok, updated_entry} =
          Repo.update(Entry.changeset(entry, %{updated_at: latest_updated_at}))

        updated_entry
    end
  end

  defp update_data_objects(data_objects) do
    {may_be_updated_data_objects, updated_ats} =
      Enum.reduce(data_objects, {[], []}, fn
        data_object_params, {may_be_updated_data_objects, updated_ats} ->
          case update_data_object(data_object_params) do
            {:ok, updated} ->
              {
                [updated | may_be_updated_data_objects],
                [updated.updated_at | updated_ats]
              }

            {_, errors} ->
              id_errors = {data_object_params.id, errors}

              {
                [id_errors | may_be_updated_data_objects],
                updated_ats
              }
          end
      end)

    {Enum.reverse(may_be_updated_data_objects), updated_ats}
  end

  def update_entry1(%{entry_id: entry_id} = params, experience) do
    from(
      e in Entry,
      where: e.id == ^entry_id,
      where: e.experience_id == ^experience.id
    )
    |> Repo.all()
    |> case do
      [] ->
        {
          :error,
          %{
            entry_id: entry_id,
            error: @entry_not_found
          }
        }

      [entry] ->
        {
          may_be_updated_data_objects,
          updated_ats
        } = update_data_objects(params.data_objects)

        may_be_updated_entry = updated_entry_updated_at(entry, updated_ats)

        %{
          entry_id: entry_id,
          updated_at: may_be_updated_entry.updated_at,
          data_objects: may_be_updated_data_objects
        }
    end
  rescue
    error ->
      Logger.error(fn ->
        [
          @update_entry_exception_header,
          inspect(params),
          @stacktrace,
          Exception.format(:error, error, __STACKTRACE__)
          |> Ebnis.prettify_with_new_line()
        ]
      end)

      {
        :error,
        %{
          entry_id: entry_id,
          error: @entry_not_found
        }
      }
  end
end
