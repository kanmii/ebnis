defmodule EbnisData.Resolver.Experience1 do
  alias EbnisData.Resolver

  import Absinthe.Resolution.Helpers, only: [on_load: 2]

  def create_experience(
        %{input: attrs},
        %{context: %{current_user: %{id: id}}}
      ) do
    attrs
    |> Map.put(:user_id, id)
    |> EbnisData.create_experience()
    |> case do
      {:ok, experience} ->
        {
          :ok,
          %{
            experience: experience
          }
        }

      {:error, changeset} ->
        {
          :ok,
          changeset.errors
          |> experience_changeset_to_error_map()
          |> field_definition_changeset_to_error_map(changeset.changes.field_definitions)
        }
    end
  end

  def create_experience(_, _) do
    Resolver.unauthorized()
  end

  defp experience_changeset_to_error_map([]) do
    %{}
  end

  defp experience_changeset_to_error_map(errors) do
    %{
      experience_errors: changeset_errors_to_map(errors)
    }
  end

  defp field_definition_changeset_to_error_map(errors, changesets) do
    changesets
    |> Enum.reduce(
      {[], 0},
      fn
        %{valid?: false, errors: errors}, {acc, index} ->
          errors = %{
            index: index,
            errors: changeset_errors_to_map(errors)
          }

          {[errors | acc], index + 1}

        _, {acc, index} ->
          {acc, index + 1}
      end
    )
    |> case do
      {[], _} ->
        errors

      {field_definitions_errors, _} ->
        Map.put(errors, :field_definitions_errors, field_definitions_errors)
    end
  end

  defp changeset_errors_to_map(errors) do
    errors
    |> Enum.map(fn {k, {v, _}} -> {k, v} end)
    |> Enum.into(%{})
  end

  def get_experience(
        %{id: id},
        %{context: %{current_user: %{id: user_id}}}
      ) do
    id
    |> Resolver.convert_from_global_id(:experience1)
    |> EbnisData.get_experience1(user_id)
    |> case do
      nil ->
        {:error, "Experience definition not found"}

      experience ->
        {:ok, experience}
    end
  end

  def get_experience(_, _) do
    Resolver.unauthorized()
  end

  def get_experiences(
        %{input: args},
        %{context: %{current_user: user}}
      ) do
    case args[:ids] do
      nil ->
        args

      ids ->
        Map.put(
          args,
          :ids,
          Enum.map(ids, &Resolver.convert_from_global_id(&1, :experience1))
        )
    end
    |> Map.put(:user_id, user.id)
    |> EbnisData.get_experiences1()
  end

  def get_experiences(_, _) do
    Resolver.unauthorized()
  end

  def entries(experience, args, %{context: ctx}) do
    # %{pagination: pagination_args}

    ctx.loader
    |> Dataloader.load(:data, :entries, experience)
    |> on_load(fn loader ->
      entries =
        loader
        |> Dataloader.get(:data, :entries, experience)

      # figure out a way to use Connection.from_query
      Absinthe.Relay.Connection.from_list(
        entries,
        args[:pagination] || %{first: 100}
      )
    end)
  end
end
