defmodule EbnisWeb.Resolver do
  import Absinthe.Relay.Node, only: [from_global_id: 2, to_global_id: 3]

  @moduledoc """
  Helper utilities for resolvers
  """

  alias EbnisWeb.Schema

  @unauthorized "Unauthorized"

  @spec unauthorized() :: {:error, [{:message, <<_::96>>}, ...]}
  def unauthorized do
    {:error, message: @unauthorized}
  end

  @doc """
  Take an error returned by applying Ecto.Repo.transaction to a Multi
  operation and return a string representation.
  """
  @spec transaction_errors_to_string(%Ecto.Changeset{}, Multi.name()) :: String.t()
  def transaction_errors_to_string({:error, changeset}, failed_operation),
    do: transaction_errors_to_string(changeset, failed_operation)

  def transaction_errors_to_string(%{} = changeset, failed_operation) do
    %{
      name: failed_operation,
      errors: changeset_errors_to_map(changeset.errors)
    }
    |> Jason.encode!()
  end

  def changeset_errors_to_map(errors),
    do:
      errors
      |> Enum.map(fn
        {k, {v, opts}} ->
          {k, error_value(v, opts)}

        kv ->
          kv
      end)
      |> Enum.into(%{})

  defp error_value(v, opts) do
    case(Keyword.fetch(opts, :count)) do
      :error ->
        v

      {:ok, count} ->
        String.replace(v, "%{count}", to_string(count))
    end
  end

  def resolve_internal_id(%{id: id}, _, _) do
    {:ok, id}
  end

  def convert_from_global(global_id, node_type) do
    case from_global_id(global_id, Schema) do
      {:ok, %{id: internal_id, type: ^node_type}} ->
        internal_id

      _ ->
        :error
    end
  end

  def convert_to_global_id(id, node_type) do
    to_global_id(node_type, id, Schema)
  end
end
