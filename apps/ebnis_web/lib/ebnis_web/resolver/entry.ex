defmodule EbnisWeb.Resolver.Entry do
  import Absinthe.Resolution.Helpers, only: [on_load: 2]

  alias EbnisWeb.Resolver
  alias EbData.DefaultImpl.User

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
        %{create_entries: attrs},
        %{context: %{current_user: user}}
      ) do
    result =
      attrs
      |> Map.put(:user_id, user.id)
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
  def list_experiences_entries(%{input: input}, %{context: %{current_user: user}}) do
    entries_connections =
      EbData.list_experiences_entries(
        user.id,
        input.experiences_ids,
        input.pagination
      )

    {:ok, entries_connections}
  end

  def list_experiences_entries(_, _, _) do
    Resolver.unauthorized()
  end
end
