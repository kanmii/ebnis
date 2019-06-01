defmodule EbnisWeb.Resolver.Entry do
  import Absinthe.Resolution.Helpers, only: [on_load: 2]

  alias EbnisWeb.Resolver

  def create(_, %{entry: attrs}, %{context: %{current_user: user}}) do
    case attrs
         |> Map.put(:user_id, user.id)
         |> EbData.create_entry() do
      {:ok, entry} ->
        {:ok, entry}

      {:error, changeset} ->
        {:error, stringify_changeset_error(changeset)}
    end
  end

  defp stringify_changeset_error(changeset) do
    field_errors =
      changeset.changes.fields
      |> Enum.with_index()
      |> Enum.reduce(
        [],
        fn
          {%{valid?: false, errors: errors, changes: changes}, index}, acc ->
            errors = %{
              meta: %{
                def_id: changes.def_id,
                index: index
              },
              errors: Resolver.changeset_errors_to_map(errors)
            }

            [errors | acc]

          _field, acc ->
            acc
        end
      )

    errors =
      case {field_errors, changeset.errors} do
        {[], []} ->
          %{}

        {[], other_errors} ->
          Resolver.changeset_errors_to_map(other_errors)

        {field_errors, other_errors} ->
          Resolver.changeset_errors_to_map(other_errors)
          |> Map.put(:fields, field_errors)
      end

    Jason.encode!(errors)
  end

  def get_exp_entries(
        _,
        %{entry: %{exp_id: id}},
        %{context: %{current_user: user}}
      ) do
    case EbData.get_exp_entries(id, user.id) do
      nil ->
        {:error, "experience not found"}

      exp ->
        {:ok, exp}
    end
  end

  def get_exp_entries(_, _, _) do
    Resolver.unauthorized()
  end

  def exp(%{} = entry, _, %{context: %{loader: loader}}) do
    loader
    |> Dataloader.load(:data, :exp, entry)
    |> on_load(&{:ok, Dataloader.get(&1, :data, :exp, entry)})
  end

  def create_entries(
        _,
        %{create_entries: attrs},
        %{context: %{current_user: user}}
      ) do
    result_list =
      attrs
      |> Map.put(:user_id, user.id)
      |> EbData.create_entries()
      |> Enum.map(fn {:ok, result} -> result end)

    {:ok, result_list}
  end

  def create_entries(_, _, _) do
    Resolver.unauthorized()
  end
end
