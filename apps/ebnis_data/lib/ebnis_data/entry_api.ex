defmodule EbnisData.EntryApi do
  require Logger
  import Ecto.Query, warn: false

  alias EbnisData.Repo
  alias EbnisData.Entry
  alias EbnisData.FieldType
  alias EbnisData.Field
  alias EbnisData.Entry1
  alias EbnisData.EntryData
  alias Ecto.Changeset
  alias Ecto.Multi
  alias Absinthe.Relay.Connection

  @type create_entries_attributes_t :: [Map.t()]

  @type create_entries_returned_t :: %{
          required(String.t()) => %{
            exp_id: String.t(),
            entries: [Entry.t()],
            errors: [
              %{
                client_id: String.t(),
                error: Changeset.t()
              }
            ]
          }
        }

  @type update_entry_args_t :: %{
          fields: [
            %{
              def_id: String.t(),
              data: %{required(String.t()) => String.t()}
            }
          ]
        }

  @entry_multi_key "e"
  @create_entry_catch_all_error "an error occurred: unable to create entry"
  @create_entry_exception_header "Exception thrown while creating entry:\n\t"

  def create_entry(%{} = attrs) do
    %Entry{}
    |> Entry.changeset_one(attrs)
    |> Repo.insert()
  rescue
    error ->
      Logger.error(fn ->
        [
          @create_entry_exception_header,
          :error
          |> Exception.format(error, __STACKTRACE__)
          |> Ebnis.prettify_with_new_line()
        ]
      end)

      :error
  end

  defp validate_experience(data_definitions, data_list) do
    data_definitions_id_map =
      data_definitions
      |> Enum.reduce(%{}, &Map.put(&2, &1.id, &1.type))

    {status, result, _} =
      data_list
      |> Enum.reduce({:ok, [], []}, fn data_object, {status, acc, seen} ->
        changeset = EntryData.changeset(%EntryData{}, data_object)
        field_definition_id = data_object.field_definition_id
        definition_type = data_definitions_id_map[field_definition_id]
        [data_type] = Map.keys(data_object.data)

        cond do
          definition_type == nil ->
            changeset =
              changeset
              |> Changeset.add_error(
                :field_definition,
                "does not exist"
              )

            {:error, [changeset | acc], seen}

          Enum.member?(seen, field_definition_id) ->
            changeset =
              changeset
              |> Changeset.add_error(
                :field_definition_id,
                "has already been taken"
              )

            {:error, [changeset | acc], seen}

          data_type != definition_type ->
            changeset =
              changeset
              |> Changeset.add_error(
                :data,
                "has invalid data type: '#{data_type}' instead of '#{definition_type}'"
              )

            {:error, [changeset | acc], seen}

          true ->
            seen = [field_definition_id | seen]
            {status, [changeset | acc], seen}
        end
      end)

    {status, Enum.reverse(result)}
  end

  @doc false
  defp create_entry_multi(_, _, attrs) do
    %Entry1{}
    |> Entry1.changeset(attrs)
    |> Repo.insert()
  end

  defp create_data_list(%{@entry_multi_key => entry}, data_list_changesets) do
    entry_id = entry.id

    {multi, _} =
      data_list_changesets
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

  @spec create_entry1(
          attrs :: %{
            experience_id: integer() | binary(),
            user_id: integer() | binary()
          }
        ) ::
          {:error, Changeset.t()}
          | {:ok, Entry1.t()}
  def create_entry1(%{user_id: user_id, experience_id: experience_id} = attrs) do
    attrs = Map.put(attrs, :exp_id, experience_id)

    case EbnisData.get_experience1(experience_id, user_id) do
      nil ->
        fake_changeset = %{
          errors: [experience: {"does not exist", []}],
          changes: Map.put(attrs, :entry_data_list, [])
        }

        {:error, fake_changeset}

      experience ->
        case validate_experience(
               experience.field_definitions,
               attrs.entry_data_list
             ) do
          {:ok, data_list_changesets} ->
            Multi.new()
            |> Multi.run(@entry_multi_key, &create_entry_multi(&1, &2, attrs))
            |> Multi.merge(&create_data_list(&1, data_list_changesets))
            |> Repo.transaction()
            |> case do
              {:ok, result} ->
                {:ok, process_create_entry_result(result)}

              {:error, @entry_multi_key, changeset, _rest} ->
                {:error, put_empty_data_objects_changes(changeset)}

              {:error, index, changeset, _rest} ->
                {
                  :error,
                  data_list_changesets
                  |> List.replace_at(index, changeset)
                  |> fake_changeset_with_data_objects(attrs)
                }
            end

          {:error, data_list_changesets} ->
            {
              :error,
              fake_changeset_with_data_objects(data_list_changesets, attrs)
            }
        end
    end
  rescue
    error ->
      Logger.error(fn ->
        [
          @create_entry_exception_header,
          :error
          |> Exception.format(error, __STACKTRACE__)
          |> Ebnis.prettify_with_new_line()
        ]
      end)

      fake_changeset = %{errors: [entry: {@create_entry_catch_all_error, []}]}
      {:error, fake_changeset}
  end

  defp process_create_entry_result(result) do
    {entry, data_list_map} = Map.pop(result, @entry_multi_key)

    data_list =
      data_list_map
      |> Enum.sort_by(fn {index, _} -> index end)
      |> Enum.map(fn {_, v} -> v end)

    %{entry | entry_data_list: data_list}
  end

  defp fake_changeset_with_data_objects(changesets, attrs) do
    %{
      errors: [],
      changes: Map.put(attrs, :entry_data_list, changesets)
    }
  end

  defp put_empty_data_objects_changes(changeset) do
    Changeset.put_change(changeset, :entry_data_list, [])
  end

  def list_entries1 do
    query_with_data_list()
    |> Repo.all()
  end

  defp query_with_data_list do
    Entry1
    |> join(:inner, [e], dl in assoc(e, :entry_data_list))
    |> preload([_, dl], entry_data_list: dl)
  end

  @spec create_entries(attr :: create_entries_attributes_t()) ::
          create_entries_returned_t()
  def create_entries([]) do
    %{}
  end

  def create_entries(entries) do
    Enum.reduce(entries, %{}, fn entry, acc ->
      id = entry.exp_id

      case create_entry(entry) do
        {:ok, created} ->
          created = Map.put(created, :exp_id, id)
          initial = %{entries: [created], experience_id: id}

          Map.update(acc, id, initial, fn value ->
            update_in(value, [:entries], &[created | &1 || []])
          end)

        {:error, changeset} ->
          error = %{
            client_id: entry[:client_id],
            error: changeset,
            experience_id: id
          }

          initial = %{errors: [error], experience_id: id, entries: []}

          Map.update(acc, id, initial, fn value ->
            update_in(value, [:errors], &[error | &1 || []])
          end)
      end
    end)
  end

  def get_entry(id), do: Repo.get(Entry, id)

  @spec get_paginated_entries(
          experience_id :: String.t(),
          pagination_args :: Connection.Options.t(),
          query :: Ecto.Queryable.t() | nil
        ) :: Connection.t()
  def get_paginated_entries(
        experience_id,
        pagination_args,
        query \\ nil,
        repo_opts \\ []
      ) do
    {:ok, entries_connection} =
      (query || Entry)
      |> join(:inner, [ee], e in assoc(ee, :exp))
      |> where([_, e], e.id == ^experience_id)
      |> order_by([ee], desc: ee.updated_at)
      |> Connection.from_query(
        &Repo.all(&1, repo_opts),
        pagination_args
      )

    entries_connection
  end

  defp get_paginated_query({experience_id, pagination_args}, opts) do
    pagination = pagination_args[:pagination] || %{first: 100}

    {
      :ok,
      offset,
      limit
    } = Connection.offset_and_limit_for_query(pagination, opts)

    query =
      Entry1
      |> where([e], e.exp_id == ^experience_id)
      |> limit(^(limit + 1))
      |> offset(^offset)

    {query, {limit, offset}}
  end

  @spec get_paginated_entries_1(
          [{integer() | binary(), map()}],
          list()
        ) :: [Connection.t()]
  def get_paginated_entries_1(
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
        [
          %{
            edges: [],
            page_info: %{
              start_cursor: "",
              end_cursor: "",
              has_previous_page: false,
              has_next_page: false
            }
          }
        ]

      records_union ->
        records_union = Enum.group_by(records_union, & &1.exp_id)

        Enum.map(
          experiences_ids_pagination_args,
          fn {experience_id, _} ->
            records = records_union[experience_id]
            {limit, offset} = trackers[experience_id]

            {:ok, connection} =
              Connection.from_slice(
                Enum.take(records, limit),
                offset,
                []
              )

            connection
          end
        )
    end
  end

  @spec update_entry(id :: String.t(), attrs :: update_entry_args_t()) ::
          {:ok, Entry.t()}
          | {
              :error,
              Changeset.t() | String.t() | %{fields_errors: [Map.t()]}
            }
  def update_entry(id, args) do
    query = where(Entry, [e], e.id == ^id)

    case query
         |> preload([_, ex], exp: ex)
         |> join(:inner, [e], ex in assoc(e, :exp))
         |> Repo.all() do
      [] ->
        {:error, "Entry not found"}

      [entry] ->
        entry.exp.field_defs
        |> update_entry_validate_fields(args[:fields])
        |> case do
          {valid_fields, []} ->
            now =
              DateTime.utc_now()
              |> DateTime.truncate(:second)

            valid_fields = Enum.reverse(valid_fields)

            {1, [updated_entry]} =
              query
              |> select([e], e)
              |> update(
                [e],
                set: [fields: ^valid_fields, updated_at: ^now]
              )
              |> Repo.update_all([])

            {:ok, updated_entry}

          {_, fields_errors} ->
            {:error, %{fields_errors: Enum.reverse(fields_errors)}}
        end
    end
  end

  defp update_entry_validate_fields(definitions, fields) do
    definitions_map =
      definitions
      |> Enum.reduce(%{}, &Map.put(&2, &1.id, :ok))

    fields
    |> Enum.reduce({[], []}, fn
      field, {valids, invalids} ->
        case definitions_map[field.def_id] do
          nil ->
            error = %{
              def_id: field.def_id,
              error: %{
                def_id: "does not exist"
              }
            }

            {valids, [error | invalids]}

          _type ->
            case FieldType.parse(field.data) do
              :error ->
                error = %{
                  def_id: field.def_id,
                  error: %{
                    data: "is invalid"
                  }
                }

                {valids, [error | invalids]}

              _ ->
                {[struct(Field, field) | valids], invalids}
            end
        end
    end)
  end

  @spec delete_entry(id :: String.t()) ::
          {:ok, Entry.t()}
          | {:error, Changeset.t() | String.t()}
  def delete_entry(id) do
    case Entry
         |> where([e], e.id == ^id)
         |> Repo.all() do
      [] ->
        {:error, "Entry does not exist"}

      [entry] ->
        Repo.delete(entry)
    end
  end

  @spec mapify_entry_field_error(
          def_id :: String.t(),
          errors :: [Map.t()],
          index :: Integer.t() | nil
        ) :: Map.t()
  def mapify_entry_field_error(def_id, errors, index \\ nil) do
    meta = %{
      def_id: def_id
    }

    meta = if(index, do: Map.put(meta, :index, index), else: meta)

    %{
      meta: meta,
      errors: EbnisData.changeset_errors_to_map(errors)
    }
  end
end
