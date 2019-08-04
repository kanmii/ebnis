defmodule EbnisData.EntryResolver do
  import Absinthe.Resolution.Helpers, only: [on_load: 2]

  alias EbnisData.Resolver
  alias EbnisData.Entry
  alias EbnisData.EntryApi

  def create(_, %{input: attrs}, %{context: %{current_user: user}}) do
    case attrs
         |> Map.put(
           :exp_id,
           Resolver.convert_from_global_id(attrs.exp_id, :experience)
         )
         |> Map.put(:user_id, user.id)
         |> EntryApi.create_entry() do
      {:ok, entry} ->
        {:ok,
         %Entry{
           entry
           | exp_id: Resolver.convert_to_global_id(entry.exp_id, :experience)
         }}

      {:error, changeset} ->
        {:error, stringify_changeset_error(changeset)}

      _ ->
        {:error, "Server error"}
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
            errors =
              EntryApi.mapify_entry_field_error(
                changes.def_id,
                errors,
                index
              )

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
        %{context: %{current_user: %{id: user_id}}}
      ) do
    result =
      entries
      |> Enum.map(
        &Map.merge(
          &1,
          %{
            user_id: user_id,
            exp_id: Resolver.convert_from_global_id(&1.exp_id, :experience)
          }
        )
      )
      |> EntryApi.create_entries()
      |> Enum.reduce([], &create_entries_reduce_result_fn/2)

    {:ok, result}
  end

  def create_entries(_, _) do
    Resolver.unauthorized()
  end

  defp create_entries_reduce_result_fn({k, v}, acc) do
    value =
      create_entries_convert_to_global_experience_id(
        k,
        v
      )

    case value[:errors] do
      nil ->
        [value | acc]

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

        value =
          Map.put(
            value,
            :errors,
            errors
          )

        [value | acc]
    end
  end

  defp create_entries_convert_to_global_experience_id(
         experience_db_id,
         create_entries_value
       ) do
    experience_global_id =
      experience_db_id
      |> Resolver.convert_to_global_id(:experience)

    create_entries_value
    |> Enum.map(fn
      {:experience_id, _} ->
        {:experience_id, experience_global_id}

      {:entries, entries} ->
        {:entries,
         Enum.map(
           entries,
           &Map.put(&1, :exp_id, experience_global_id)
         )}

      {:errors, errors} ->
        {
          :errors,
          Enum.map(errors, &Map.put(&1, :experience_id, experience_global_id))
        }
    end)
    |> Enum.into(%{})
  end

  def update_entry(
        %{input: %{id: id} = args},
        %{context: %{current_user: _}}
      ) do
    args = Map.delete(args, :id)

    case Resolver.convert_from_global_id(id, :entry) do
      :error ->
        {:error, "Invalid ID"}

      id ->
        case EntryApi.update_entry(id, args) do
          {:ok, updated_entry} ->
            {:ok, %{entry: updated_entry}}

          {:error, %{fields_errors: _} = errors} ->
            {:ok, errors}

          error ->
            error
        end
    end
  end

  def update_entry(_, _) do
    Resolver.unauthorized()
  end

  def delete_entry(%{id: id}, %{context: %{current_user: _}}) do
    case Resolver.convert_from_global_id(id, :entry) do
      :error ->
        {:error, "Invalid ID"}

      id ->
        EntryApi.delete_entry(id)
    end
  end

  def delete_entry(_, _) do
    Resolver.unauthorized()
  end
end
