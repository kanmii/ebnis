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
  # alias EbnisData.Experience1

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

  def create_entry(%{} = attrs) do
    %Entry{}
    |> Entry.changeset_one(attrs)
    |> Repo.insert()
  rescue
    error ->
      Logger.error(fn ->
        [
          "Exception thrown while creating entry:\n\t",
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

  defp create_data_list(%{"entry" => entry}, data_list_changesets) do
    entry_id = entry.id

    {multi, _} =
      data_list_changesets
      |> Enum.reduce({Multi.new(), 0}, fn data_changeset, {multi, index} ->
        multi =
          Multi.insert(
            multi,
            "d#{index}",
            data_changeset
            |> Changeset.put_change(:entry_id, entry_id),
            returning: true
          )

        {multi, index + 1}
      end)

    multi
  end

  def create_entry1(
        %{
          user_id: user_id,
          experience_id: experience_id
        } = attrs
      ) do
    attrs = Map.put(attrs, :exp_id, experience_id)

    case EbnisData.get_experience1(experience_id, user_id) do
      nil ->
        {
          :error,
          %Entry1{}
          |> Entry1.changeset(attrs)
          |> Changeset.add_error(:experience, "does not exist"),
          nil
        }

      experience ->
        case validate_experience(
               experience.field_definitions,
               attrs.entry_data_list
             ) do
          {:ok, data_list_changesets} ->
            Multi.new()
            |> Multi.run("entry", &create_entry_multi(&1, &2, attrs))
            |> Multi.merge(&create_data_list(&1, data_list_changesets))
            |> Repo.transaction()
            |> case do
              {:ok, result} ->
                {entry, data_list_map} = Map.pop(result, "entry")

                data_list =
                  data_list_map
                  |> Enum.sort_by(fn {"d" <> index, _} -> index end)
                  |> Enum.map(fn {_, v} -> v end)

                {:ok, %{entry | entry_data_list: data_list}}

              {:error, "entry", changeset, _rest} ->
                {:error, changeset, nil}

              {:error, "d" <> index, changeset, _rest} ->
                {:error, nil, String.to_integer(index), changeset}
            end

          {:error, data_list_changesets} ->
            {:error, nil, data_list_changesets}
        end
    end
  rescue
    error ->
      Logger.error(fn ->
        [
          "Exception thrown while creating entry:\n\t",
          :error
          |> Exception.format(error, __STACKTRACE__)
          |> Ebnis.prettify_with_new_line()
        ]
      end)

      :error
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
          pagination_args :: Absinthe.Relay.Connection.Options.t(),
          query :: Ecto.Queryable.t() | nil
        ) :: Absinthe.Relay.Connection.t()
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
      |> Absinthe.Relay.Connection.from_query(
        &Repo.all(&1, repo_opts),
        pagination_args
      )

    entries_connection
  end

  @spec get_paginated_entries_1(
          [{integer() | binary(), map()}],
          list()
        ) :: [Absinthe.Relay.Connection.t()]
  def get_paginated_entries_1(
        experiences_ids_pagination_args_tuples,
        repo_opts
      ) do
    experiences_ids_pagination_args_tuples
    |> Enum.map(fn {experience_id, pagination_args} ->
      {:ok, result} =
        Entry1
        |> where([e], e.exp_id == ^experience_id)
        |> Absinthe.Relay.Connection.from_query(
          &Repo.all(&1, repo_opts),
          pagination_args[:pagination] || %{first: 100}
        )

      result
    end)
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
