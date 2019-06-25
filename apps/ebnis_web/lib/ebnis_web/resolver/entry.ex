defmodule EbnisWeb.Resolver.Entry do
  import Absinthe.Resolution.Helpers, only: [on_load: 2]

  alias EbnisWeb.Resolver
  alias EbData.DefaultImpl.{User, Entry}

  def create(_, %{entry: attrs}, %{context: %{current_user: user}}) do
    case attrs
         |> Map.put(
           :exp_id,
           Resolver.convert_from_global_id(attrs.exp_id, :experience)
         )
         |> Map.put(:user_id, user.id)
         |> EbData.create_entry() do
      {:ok, entry} ->
        {:ok,
         %Entry{
           entry
           | exp_id: Resolver.convert_to_global_id(entry.exp_id, :experience)
         }}

      {:error, changeset} ->
        {:error, stringify_changeset_error(changeset)}
    end
  end

  def create(_, _, _) do
    Resolver.unauthorized()
  end

  def stringify_changeset_error(changeset) do
    errors =
      case {stringify_changeset_fields_error(changeset), changeset.errors} do
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

  defp stringify_changeset_fields_error(%{changes: %{fields: fields}}) do
    {field_errors, _} =
      Enum.reduce(
        fields,
        {[], 0},
        fn
          %{valid?: false, errors: errors, changes: changes}, {acc, index} ->
            errors = %{
              meta: %{
                def_id: changes.def_id,
                index: index
              },
              errors: Resolver.changeset_errors_to_map(errors)
            }

            {[errors | acc], index + 1}

          _field, {acc, index} ->
            {acc, index + 1}
        end
      )

    field_errors
  end

  defp stringify_changeset_fields_error(_) do
    []
  end

  def exp(%{} = entry, _, %{context: %{loader: loader}}) do
    loader
    |> Dataloader.load(:data, :exp, entry)
    |> on_load(&{:ok, Dataloader.get(&1, :data, :exp, entry)})
  end

  def create_entries(
        %{create_entries: entries},
        %{context: %{current_user: user}}
      ) do
    entries =
      Enum.map(
        entries,
        &Map.put(
          &1,
          :exp_id,
          Resolver.convert_from_global_id(&1.exp_id, :experience)
        )
      )

    result =
      %{
        user_id: user.id,
        entries: entries
      }
      |> EbData.create_entries()
      |> Enum.reduce([], fn {_, values}, acc ->
        case values[:errors] do
          nil ->
            [values | acc]

          errors ->
            errors =
              Enum.map(
                errors,
                &Map.put(
                  &1,
                  :error,
                  stringify_changeset_error(&1.error)
                )
              )

            values =
              Map.put(
                values,
                :errors,
                errors
              )

            [values | acc]
        end
      end)

    {:ok, result}
  end

  def create_entries(_, _) do
    Resolver.unauthorized()
  end

  @spec list_entries_from_experiences_ids(
          %{
            input: %{
              experiences_ids: [String.t()],
              pagination: Absinthe.Relay.Connection.Options.t()
            }
          },
          %{context: %{current_user: %User{}}}
        ) :: {:ok, [Absinthe.Relay.Connection.t()]}
  def list_entries_from_experiences_ids(
        %{input: input},
        %{context: %{current_user: user}}
      ) do
    internal_experience_ids =
      Enum.map(
        input.experiences_ids,
        &Resolver.convert_from_global_id(&1, :experience)
      )

    entries_connections =
      EbData.list_entries_from_experiences_ids(
        user.id,
        internal_experience_ids,
        input.pagination
      )

    {:ok, entries_connections}
  end

  def list_entries_from_experiences_ids(_, _, _) do
    Resolver.unauthorized()
  end
end
