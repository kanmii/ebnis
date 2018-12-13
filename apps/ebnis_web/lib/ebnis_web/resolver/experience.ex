defmodule EbnisWeb.Resolver.Experience do
  alias EbnisWeb.Resolver

  def create(_, %{exp: attrs}, %{context: %{current_user: user}}) do
    case attrs
         |> Map.put(:user_id, user.id)
         |> EbData.create_exp() do
      {:ok, exp} ->
        {:ok, exp}

      {:error, changeset} ->
        {:error, stringify_changeset_error(changeset)}
    end
  end

  defp stringify_changeset_error(changeset) do
    field_def_errors =
      Enum.reduce(
        changeset.changes.field_defs,
        [],
        fn
          %{valid?: false, errors: errors}, acc ->
            [Resolver.changeset_errors_to_map(errors) | acc]

          _field, acc ->
            acc
        end
      )

    errors =
      case {field_def_errors, changeset.errors} do
        {[], []} ->
          %{}

        {[], other_errors} ->
          Resolver.changeset_errors_to_map(other_errors)

        {field_def_errors, other_errors} ->
          Resolver.changeset_errors_to_map(other_errors)
          |> Map.put(:field_defs, field_def_errors)
      end

    Jason.encode!(errors)
  end

  def get_exp(_, %{exp: %{id: id}}, %{context: %{current_user: user}}) do
    case EbData.get_exp(id, user.id) do
      nil ->
        {:error, "Experience definition not found"}

      exp ->
        {:ok, exp}
    end
  end

  def get_exp(_, _, _) do
    Resolver.unauthorized()
  end

  def get_user_exps(_, _, %{context: %{current_user: user}}) do
    {:ok, EbData.get_user_exps(user.id)}
  end

  def get_user_exps(_, _, _) do
    Resolver.unauthorized()
  end
end
