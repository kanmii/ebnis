defmodule EbnisData.ExperienceApi do
  require Logger

  import Ecto.Query, warn: true
  import Ebnis

  alias EbnisData.Repo
  alias EbnisData.Experience
  alias EbnisData.DataDefinition
  alias EbnisData.EntryApi

  @get_experience_exception_header "\n\nException while getting experience with:"
  @bad_request "bad request"
  @update_definitions_exception_header "\n\nException while updating definitions with:"
  @experience_can_not_be_created_exception_header "\n\nsomething is wrong - experience can not be created"
  @update_experience_exception_header "\n\nException while updating experience with:"
  @delete_experience_exception_header "\n\nException while deleting experience with:"

  @spec get_experience(id :: integer() | binary(), user_id :: integer() | binary()) ::
          Experience.t() | nil
  def get_experience(id, user_id) do
    %{id: id, user_id: user_id}
    |> query_with_data_definitions()
    |> Repo.all()
    |> case do
      [experience] ->
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

  @spec get_experiences(
          args :: %{
            pagination: Absinthe.Relay.Connection.Options.t(),
            user_id: binary() | Integer.t(),
            ids: [binary() | Integer.t()],
            client_ids: [binary() | Integer.t()]
          }
        ) ::
          {:ok, Absinthe.Relay.Connection.t()} | {:error, any}
  def get_experiences(args) do
    case args[:pagination] do
      nil ->
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

      pagination_args ->
        args
        |> query_with_data_definitions()
        |> Absinthe.Relay.Connection.from_query(
          &Repo.all(&1),
          pagination_args
        )
    end
  end

  defp query_with_data_definitions(args) do
    definitions_query =
      from(
        d in DataDefinition,
        order_by: [asc: d.id]
      )

    query =
      from(
        e in Experience,
        order_by: [desc: e.updated_at],
        preload: [data_definitions: ^definitions_query]
      )

    Enum.reduce(
      args,
      query,
      &query(&2, &1)
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

  defp offline_entry_add_error(
         entry,
         {created_entries, with_errors}
       ) do
    changeset = %{
      changes: entry,
      valid?: false,
      errors: [
        experience_id: {"is not the same as experience client ID", []}
      ]
    }

    {created_entries, [changeset | with_errors]}
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
    from(
      e in Experience,
      where: e.id == ^id and e.user_id == ^user_id
    )
    |> Repo.all()
    |> case do
      [experience] ->
        Repo.delete(experience)

      _ ->
        {:error, @bad_request}
    end
  rescue
    error ->
      Logger.error(fn ->
        [
          @delete_experience_exception_header,
          "\n\tid: #{id}",
          "\n\tUser ID: #{user_id}",
          stacktrace_prefix(),
          :error
          |> Exception.format(error, __STACKTRACE__)
          |> prettify_with_new_line()
        ]
      end)

      {:error, @bad_request}
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

    %{id: experience_id, user_id: user_id}
    |> query_with_data_definitions()
    |> Repo.all()
    |> case do
      [experience] ->
        Enum.reduce(
          update_params,
          %{},
          &update_experience_p(&2, &1, experience)
        )

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

  defp update_experience_p(acc, {:add_entries, inputs}, experience) do
    Map.merge(
      acc,
      %{
        updated_at: experience.updated_at,
        new_entries:
          Enum.map(
            inputs,
            &EntryApi.create_entry(&1, experience)
          )
      }
    )
  end

  defp update_experience_p(acc, {:update_entries, inputs}, experience) do
    Map.merge(
      acc,
      %{
        updated_at: experience.updated_at,
        updated_entries:
          Enum.map(
            inputs,
            &EntryApi.update_entry(&1, experience)
          )
      }
    )
  end

  defp update_experience_p(acc, {:update_definitions, inputs}, experience) do
    Map.merge(
      acc,
      %{
        updated_at: experience.updated_at,
        updated_definitions:
          Enum.map(
            inputs,
            &update_experiences_update_definition/1
          )
      }
    )
  end

  defp update_experience_p(acc, {:own_fields, attrs}, experience) do
    experience
    |> Experience.changeset(attrs)
    |> Repo.update()
    |> case do
      {:ok, updated_experience} ->
        Map.merge(
          acc,
          %{
            updated_at: updated_experience.updated_at,
            own_fields:
              Map.take(
                updated_experience,
                [:title, :description]
              )
          }
        )

      {:error, changeset} ->
        Map.merge(
          acc,
          %{
            updated_at: experience.updated_at,
            own_fields: {:error, changeset}
          }
        )
    end
  end

  defp update_experiences_update_definition(input) do
    id = input.id

    with %{} = definition <- get_definition(id),
         changeset <- DataDefinition.changeset(definition, input),
         {:ok, definition} <- Repo.update(changeset) do
      definition
    else
      nil ->
        {
          :error,
          %{
            id: id,
            error: "does not exist"
          }
        }

      {:error, changeset} ->
        {:error, changeset, id}
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

      {
        :error,
        %{
          id: input.id,
          error: @bad_request
        }
      }
  end

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
      {:ok, %Experience{} = experience} ->
        entries = attrs[:entries] || []

        {created_entries, entries_changesets} =
          validate_create_entries(entries, experience, attrs[:client_id])

        experience_with_entries = %Experience{
          experience
          | entries: Enum.reverse(created_entries)
        }

        {experience_with_entries, Enum.reverse(entries_changesets)}

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

    client_id_to_definition_id_map = make_client_id_to_definition_id_map(experience)

    Enum.reduce(
      entries_attrs,
      {[], []},
      fn attrs, {created_entries, changesets} ->
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
            {created_entries, [changeset | changesets]}

          entry ->
            {[entry | created_entries], [nil | changesets]}
        end
      end
    )
  end

  defp validate_create_entries(entries, experience, experience_client_id) do
    client_id_to_definition_id_map = make_client_id_to_definition_id_map(experience)

    associations = %{
      experience_id: experience.id,
      user_id: experience.user_id
    }

    Enum.reduce(
      entries,
      {[], []},
      fn attrs, acc ->
        case attrs[:experience_id] == experience_client_id do
          true ->
            create_offline_entry(
              experience,
              attrs,
              client_id_to_definition_id_map,
              associations,
              acc
            )

          _ ->
            offline_entry_add_error(attrs, acc)
        end
      end
    )
  end

  defp create_offline_entry(
         experience,
         attrs,
         client_id_to_definition_id_map,
         associations,
         {created_entries, with_errors}
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
      {[entry | created_entries], [nil | with_errors]}
    else
      {:error, changeset} ->
        {created_entries, [changeset | with_errors]}
    end
  end

  defp make_client_id_to_definition_id_map(experience) do
    Enum.reduce(
      experience.data_definitions,
      %{},
      &Map.put(&2, &1.client_id, &1.id)
    )
  end
end
