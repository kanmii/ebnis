defmodule EbnisData.ExperienceApi do
  require Logger

  import Ecto.Query, warn: true

  alias EbnisData.Repo
  alias EbnisData.Experience
  alias Ecto.Changeset
  alias EbnisData.DataDefinition

  @get_experience_exception_header "\n\nException while getting experience with:"
  @stacktrace "\n\n---------------STACKTRACE---------\n\n"

  @bad_request "bad request"

  @update_definitions_exception_header "\n\nException while updating definitions with:"

  @experience_does_not_exist "experience does not exist"

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
          @stacktrace,
          :error
          |> Exception.format(error, __STACKTRACE__)
          |> Ebnis.prettify_with_new_line()
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

  def create_experience(attrs) do
    attrs =
      Map.update(
        attrs,
        :custom_requireds,
        [:data_definitions],
        &[:data_definitions | &1]
      )

    %Experience{}
    |> Experience.changeset(attrs)
    |> Repo.insert()
  end

  @spec save_offline_experience(
          attrs ::
            %{
              user_id: String.t(),
              experience: Map.t()
            }
        ) ::
          {:ok, Experience.t(), [%Changeset{}]} | {:error, %Changeset{}}
  def save_offline_experience(attrs) do
    case attrs
         |> Map.put(:custom_requireds, [:client_id])
         |> create_experience() do
      {:ok, %Experience{} = experience} ->
        entries = attrs[:entries] || []

        {created_entries, entries_changesets} =
          validate_create_offline_entries(entries, experience)

        experience_with_entries = %Experience{
          experience
          | entries: created_entries
        }

        {:ok, experience_with_entries, entries_changesets}

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  defp validate_create_offline_entries([], _) do
    {[], []}
  end

  defp validate_create_offline_entries(entries, experience) do
    definitions_map = definition_client_id_map(experience)

    associations = %{
      experience_id: experience.id,
      user_id: experience.user_id
    }

    experience_client_id = experience.client_id

    Enum.reduce(
      entries,
      {[], []},
      fn entry, acc ->
        entry_experience_client_id = entry.experience_id

        case entry_experience_client_id == experience_client_id do
          true ->
            create_offline_entry(entry, definitions_map, associations, acc)

          _ ->
            offline_entry_add_error(entry, acc)
        end
      end
    )
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

  defp create_offline_entry(
         entry,
         definitions_map,
         associations,
         {created_entries, with_errors}
       ) do
    with {:ok, entry} <-
           update_data_objects_with_definition_ids(
             entry,
             definitions_map
           ),
         {:ok, created} <-
           entry
           |> Map.merge(associations)
           |> EbnisData.create_entry() do
      {[created | created_entries], with_errors}
    else
      {:error, changeset} ->
        {created_entries, [changeset | with_errors]}
    end
  end

  defp definition_client_id_map(experience) do
    Enum.reduce(
      experience.data_definitions,
      %{},
      &Map.put(&2, &1.client_id, &1.id)
    )
  end

  defp update_data_objects_with_definition_ids(entry, definitions_map) do
    Enum.reduce(
      entry.data_objects,
      {:ok, [], []},
      fn object, acc ->
        definition_client_id = object.definition_id

        case definitions_map[definition_client_id] do
          nil ->
            map_fake_entry_data_object_changeset(
              acc,
              object,
              [
                definition_id:
                  "data definition client ID '#{definition_client_id}' does not exist"
              ],
              false
            )

          definition_id ->
            changes =
              Map.put(
                object,
                :definition_id,
                definition_id
              )

            map_fake_entry_data_object_changeset(acc, changes, [], true)
        end
      end
    )
    |> case do
      {:ok, valids, _} ->
        {:ok, %{entry | data_objects: Enum.reverse(valids)}}

      {:error, _, changesets} ->
        {
          :error,
          %{
            changes: Map.put(entry, :data_objects, Enum.reverse(changesets)),
            errors: []
          }
        }
    end
  end

  defp map_fake_entry_data_object_changeset(
         {status, valids, changesets},
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
      nil ->
        :error

      experience ->
        Repo.delete(experience)
    end
  end

  @spec update_experience(
          update_args :: %{
            optional(:title) => binary(),
            optional(:description) => binary()
          },
          user_id :: integer() | binary()
        ) :: {:error, binary()}
  def update_experience(_, attrs) when attrs == %{} do
    {:error, "nothing to update"}
  end

  def update_experience(attrs, user_id) do
    case get_experience(attrs.id, user_id) do
      nil ->
        {:error, @experience_does_not_exist}

      experience ->
        experience
        |> Experience.changeset(attrs)
        |> Repo.update()
    end
  end

  def update_definitions(
        %{
          experience_id: experience_id,
          definitions: inputs
        },
        user_id
      ) do
    case get_experience(experience_id, user_id) do
      nil ->
        {:error, @experience_does_not_exist}

      experience ->
        definitions = Enum.map(inputs, &get_update_definition/1)

        %{
          experience:
            update_experience_when_definitions_updated(
              experience,
              definitions
            ),
          definitions: definitions
        }
    end
  rescue
    error ->
      Logger.error(fn ->
        [
          @update_definitions_exception_header,
          inspect({inputs, user_id}),
          @stacktrace,
          Exception.format(:error, error, __STACKTRACE__)
        ]
      end)

      {:error, @bad_request}
  end

  def update_definitions(_, _) do
    {:error, @bad_request}
  end

  defp get_update_definition(input) do
    id = input.id

    with %{} = definition <- get_definition(id),
         changeset <- DataDefinition.changeset(definition, input),
         {:ok, definition} <- Repo.update(changeset) do
      %{definition: definition}
    else
      nil ->
        changeset = %{
          errors: [
            definition: {"does not exist", []}
          ]
        }

        %{
          errors: %{
            id: id,
            errors: changeset.errors
          }
        }

      {:error, changeset} ->
        %{
          errors: %{
            id: id,
            errors: changeset.errors
          }
        }
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

  defp update_experience_when_definitions_updated(
         experience,
         definitions
       ) do
    case map_update_definitions_results_to_ids(definitions) do
      {_, []} ->
        experience

      {updated_definitions_map, [updated_at | _]} ->
        {:ok, updated_experience} =
          experience
          |> Experience.changeset(%{updated_at: updated_at})
          |> Repo.update()

        %Experience{
          updated_experience
          | data_definitions:
              Enum.map(
                updated_experience.data_definitions,
                &Map.get(updated_definitions_map, &1.id, &1)
              )
        }
    end
  end

  defp map_update_definitions_results_to_ids(definitions) do
    {map, dates} =
      definitions
      |> Enum.reduce(
        {%{}, []},
        fn
          %{definition: definition}, {acc, dates} ->
            {
              Map.put(acc, definition.id, definition),
              [definition.updated_at | dates]
            }

          _, acc ->
            acc
        end
      )

    {map, Enum.sort(dates, &<=/2)}
  end
end
