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

  defp stringify_changeset_error(changeset) do
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
        _,
        %{create_entries: %{exp_id: experience_id} = attrs},
        %{context: %{current_user: user}}
      ) do
    result =
      attrs
      |> Map.merge(%{
        user_id: user.id,
        exp_id: Resolver.convert_from_global_id(experience_id, :experience)
      })
      |> EbData.create_entries()
      |> Enum.reduce({[], []}, &separate_successes_and_failures/2)

    # test for where field has error e.g. invalid data type

    {:ok, mapify_successes_and_failures(result)}
  end

  def create_entries(_, _, _) do
    Resolver.unauthorized()
  end

  defp separate_successes_and_failures({{:ok, entry}, index}, {oks, errors}) do
    {[%{index: index, entry: entry} | oks], errors}
  end

  defp separate_successes_and_failures(
         {{:error, error}, index},
         {oks, errors}
       ) do
    {
      oks,
      [%{index: index, error: stringify_changeset_error(error)} | errors]
    }
  end

  defp mapify_successes_and_failures({[], []}) do
    %{}
  end

  defp mapify_successes_and_failures({successes, []}) do
    %{successes: successes}
  end

  defp mapify_successes_and_failures({[], failures}) do
    %{failures: failures}
  end

  defp mapify_successes_and_failures({successes, failures}) do
    %{successes: successes, failures: failures}
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
