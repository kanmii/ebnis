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

  @error_not_found "entry not found"
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
    definitions_id_to_type_map =
      Enum.reduce(
        data_definitions,
        %{},
        &Map.put(&2, &1.id, &1.type)
      )

    {status, result, seen} =
      data_list
      |> Enum.reduce({:ok, [], %{}}, fn data_object, {status, acc, seen} = acc_ ->
        definition_id = data_object.definition_id
        definition_type = definitions_id_to_type_map[definition_id]
        [data_type] = Map.keys(data_object.data)

        cond do
          # This will mostly be due to the fact that we are creating several
          # entries simultaneously and a data_object.definition_id does not
          # match data_definition.client_id
          definition_id == nil ->
            acc_

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

    data_definitions
    |> Enum.reduce([], fn definition, acc ->
      definition_id = definition.id

      case seen[definition_id] do
        nil ->
          changeset =
            add_error_make_fake_data_object_changeset(
              %{
                definition_id: definition_id
              },
              :definition_id,
              "data definition ID/clientId #{definition_id}/#{definition.client_id} is missing"
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

  @spec get_paginated_entries(
          [{integer() | binary(), map()}],
          list()
        ) :: [Connection.t()]
  def get_paginated_entries(
        experiences_ids_pagination_args,
        repo_opts
      ) do
    [
      {experience_id, pagination_args} = _head | tail
    ] = experiences_ids_pagination_args

    pagination = pagination_args[:pagination] || %{first: 100}

    {
      :ok,
      offset,
      limit
    } = Connection.offset_and_limit_for_query(pagination, [])

    experience_ids = [experience_id | Enum.map(tail, fn {id, _} -> id end)]

    query =
      from(ent in Entry,
        as: :ents,
        join: ex in assoc(ent, :experience),
        as: :exs,
        where: ex.id in ^experience_ids,
        inner_lateral_join:
          top_two in subquery(
            from(ent1 in Entry,
              where: [experience_id: parent_as(:exs).id],
              limit: ^(limit + 1),
              offset: ^offset,
              order_by: [desc: ent1.inserted_at, asc: ent1.id]
            )
          ),
        on: top_two.id == ent.id,
        join: d0 in assoc(ent, :data_objects),
        preload: [data_objects: d0]
      )

    query
    |> Repo.all(repo_opts)
    |> case do
      [] ->
        Enum.map(experience_ids, fn _ -> @empty_relay_connection end)

      entries ->
        experience_id_to_entry_map =
          entries
          |> Enum.group_by(& &1.experience_id)

        Enum.map(
          experience_ids,
          fn experience_id ->
            case experience_id_to_entry_map[experience_id] do
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
          end
        )
    end
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
        {id, @error_not_found}

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

      {id, @error_not_found}
  end

  defp update_data_object(params) do
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

  def update_entry(%{entry_id: entry_id} = params, experience) do
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

  def create_entry(attrs, experience) do
    case validate_data_objects_with_definitions(
           experience.data_definitions,
           attrs.data_objects
         ) do
      {:ok, data_objects_changesets} ->
        Multi.new()
        |> Multi.run(
          @entry_multi_key,
          &create_entry_multi(
            &1,
            &2,
            Map.put(attrs, :experience_id, experience.id)
          )
        )
        |> Multi.merge(&create_data_objects_multi(&1, data_objects_changesets))
        |> Repo.transaction()
        |> case do
          {:ok, result} ->
            process_create_entry_result(result)

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
