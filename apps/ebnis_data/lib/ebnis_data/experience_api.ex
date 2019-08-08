defmodule EbnisData.ExperienceApi do
  require Logger

  import Ecto.Query, warn: true

  alias EbnisData.Repo
  alias EbnisData.Experience
  alias Ecto.Changeset

  def list_experiences do
    query_with_data_definitions()
    |> Repo.all()
  end

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
          "\n\nError while getting experience with:",
          "\n\tid: #{id}",
          "\n\tUser ID: #{user_id}",
          "\n\n---------------STACKTRACE---------\n\n",
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
        |> query()
        |> Absinthe.Relay.Connection.from_query(
          &Repo.all(&1),
          pagination_args
        )
    end
  end

  defp query_with_data_definitions(args \\ nil) do
    query =
      Experience
      |> join(:inner, [e], fd in assoc(e, :data_definitions))
      |> preload([_, fd], data_definitions: fd)

    case args do
      nil ->
        query

      _ ->
        Enum.reduce(args, query, &query(&2, &1))
    end
  end

  defp query(args) do
    Enum.reduce(args, Experience, &query(&2, &1))
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
          id :: integer() | binary(),
          user_id :: integer() | binary(),
          update_args :: %{
            optional(:title) => binary(),
            optional(:description) => binary()
          }
        ) :: {:error, binary()}
  def update_experience(_, _, attrs) when attrs == %{} do
    {:error, "nothing to update"}
  end

  def update_experience(id, user_id, attrs) do
    case get_experience(id, user_id) do
      nil ->
        {:error, "can not find experience"}

      experience ->
        experience
        |> Experience.changeset(attrs)
        |> Repo.update()
    end
  end
end
