defmodule EbnisData.ExperienceApi do
  require Logger

  import Ecto.Query, warn: true

  alias EbnisData.Repo
  alias EbnisData.Experience1

  def list_experiences1 do
    query_with_field_definitions()
    |> Repo.all()
  end

  def get_experience1(id, user_id) do
    %{id: id, user_id: user_id}
    |> query_with_field_definitions()
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

  @spec get_experiences1(
          args :: %{
            pagination: Absinthe.Relay.Connection.Options.t(),
            user_id: binary() | Integer.t(),
            ids: [binary() | Integer.t()],
            client_ids: [binary() | Integer.t()]
          }
        ) ::
          {:ok, Absinthe.Relay.Connection.t()} | {:error, any}
  def get_experiences1(args) do
    case args[:pagination] do
      nil ->
        experiences =
          args
          |> query_with_field_definitions()
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

  defp query_with_field_definitions(args \\ nil) do
    query =
      Experience1
      |> join(:inner, [e], fd in assoc(e, :field_definitions))
      |> preload([_, fd], field_definitions: fd)

    case args do
      nil ->
        query

      _ ->
        Enum.reduce(args, query, &query(&2, &1))
    end
  end

  defp query(args) do
    Enum.reduce(args, Experience1, &query(&2, &1))
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
end
