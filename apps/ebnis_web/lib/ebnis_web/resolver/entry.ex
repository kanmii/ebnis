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

    # test for where field has error e.g. invalid data type

    {:ok, mapify_successes_and_failures(result)}
  end

  def create_entries(_, _) do
    Resolver.unauthorized()
  end

  defp mapify_successes_and_failures({[], []}) do
    %{}
  end

  defp mapify_successes_and_failures({successes, []}) do
    successes =
      successes
      |> Enum.group_by(& &1.exp_id)
      |> Enum.reduce([], fn {exp_id, entries}, acc ->
        [%{exp_id: exp_id, entries: entries} | acc]
      end)

    %{successes: successes}
  end

  defp mapify_successes_and_failures({[], failures}) do
    failures =
      Enum.map(
        failures,
        &%{
          client_id: &1.changes.client_id,
          error: stringify_changeset_error(&1)
        }
      )

    %{failures: failures}
  end

  defp mapify_successes_and_failures({successes, failures}) do
    Map.merge(
      mapify_successes_and_failures({successes, []}),
      mapify_successes_and_failures({[], failures})
    )
  end

  @spec list_experiences_entries(
          %{
            input: %{
              experiences_ids: [String.t()],
              pagination: Absinthe.Relay.Connection.Options.t()
            }
          },
          %{context: %{current_user: %User{}}}
        ) :: {:ok, [Absinthe.Relay.Connection.t()]}
  def list_experiences_entries(
        %{input: input},
        %{context: %{current_user: user}}
      ) do
    internal_experience_ids =
      Enum.map(
        input.experiences_ids,
        &Resolver.convert_from_global_id(&1, :experience)
      )

    entries_connections =
      EbData.list_experiences_entries(
        user.id,
        internal_experience_ids,
        input.pagination
      )

    {:ok, entries_connections}
  end

  def list_experiences_entries(_, _, _) do
    Resolver.unauthorized()
  end
end
