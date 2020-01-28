defmodule EbnisData.Resolver do
  @moduledoc """
  Helper utilities for resolvers
  """

  @unauthorized "Unauthorized"

  @spec unauthorized() :: {:error, [{:message, <<_::96>>}, ...]}
  def unauthorized do
    {:error, message: @unauthorized}
  end

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
end
