defmodule EbnisData.Resolver.ExperienceResolver do
  import Absinthe.Resolution.Helpers, only: [on_load: 2]

  alias EbnisData.Resolver
  alias EbnisData.Experience
  alias EbnisData.Resolver.Entry, as: EntryResolver

  @experience_not_found "Experience not found"

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
          %{
            errors: create_experience_errors_from_changeset(changeset)
          }
        }
    end
  end

  def create_experience(_, _) do
    Resolver.unauthorized()
  end

  defp create_experience_errors_from_changeset(changeset) do
    case changeset.errors do
      [] ->
        %{}

      errors ->
        changeset_errors_to_map(errors)
    end
    |> data_definition_changeset_to_error_map(changeset.changes.data_definitions)
  end

  defp data_definition_changeset_to_error_map(errors, changesets) do
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

      {data_definitions_errors, _} ->
        Map.put(errors, :data_definitions_errors, data_definitions_errors)
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
    |> Resolver.convert_from_global_id(:experience)
    |> EbnisData.get_experience(user_id)
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
          Enum.map(ids, &Resolver.convert_from_global_id(&1, :experience))
        )
    end
    |> Map.put(:user_id, user.id)
    |> EbnisData.get_experiences()
  end

  def get_experiences(_, _) do
    Resolver.unauthorized()
  end

  def entries(experience, args, %{context: ctx}) do
    experience_id = experience.id

    Dataloader.load(
      ctx.loader,
      :data,
      {:one, Experience},
      entries: {experience_id, args}
    )
    |> on_load(fn loader ->
      entries_connection =
        Dataloader.get(
          loader,
          :data,
          {:one, Experience},
          entries: {experience_id, args}
        )

      {:ok, entries_connection}
    end)
  end

  def save_offline_experiences(
        %{input: experiences},
        %{context: %{current_user: %{id: user_id}}}
      ) do
    {
      :ok,
      experiences
      |> Enum.with_index()
      |> Enum.map(&save_offline_experience(&1, user_id))
    }
  end

  def save_offline_experiences(_, _) do
    Resolver.unauthorized()
  end

  defp save_offline_experience({experience, index}, user_id) do
    case experience
         |> Map.put(:user_id, user_id)
         |> EbnisData.save_offline_experience() do
      {:ok, experience, []} ->
        %{experience: experience}

      {:ok, experience, entries_changesets} ->
        experience_id =
          Resolver.convert_to_global_id(
            experience.id,
            :experience
          )

        errors =
          Enum.map(
            entries_changesets,
            &%{
              errors: EntryResolver.entry_changeset_errors_to_map(&1),
              experience_id: experience_id,
              client_id: &1.changes.client_id
            }
          )

        %{experience: experience, entries_errors: errors}

      {:error, changeset} ->
        %{
          experience_errors: %{
            index: index,
            client_id: experience[:client_id] || index,
            errors: create_experience_errors_from_changeset(changeset)
          }
        }
    end
  end

  def delete_experience(%{id: id}, %{context: %{current_user: user}}) do
    id
    |> Resolver.convert_from_global_id(:experience)
    |> EbnisData.delete_experience(user.id)
    |> case do
      :error ->
        {:error, @experience_not_found}

      {:ok, experience} ->
        {:ok, experience}
    end
  end

  def delete_experience(_, _) do
    Resolver.unauthorized()
  end

  def update_experience(
        %{input: %{id: id} = args},
        %{context: %{current_user: user}}
      ) do
    id
    |> Resolver.convert_from_global_id(:experience)
    |> EbnisData.update_experience(user.id, Map.delete(args, :id))
    |> case do
      {:ok, experience} ->
        {:ok, %{experience: experience}}

      {:error, %{} = changeset} ->
        {
          :ok,
          %{
            errors: Resolver.changeset_errors_to_map(changeset.errors)
          }
        }

      {:error, error} ->
        {:error, error}
    end
  end

  def update_experience(_, _) do
    Resolver.unauthorized()
  end

  def update_definitions(
        %{input: inputs},
        %{context: %{current_user: %{id: user_id}}}
      ) do
    case EbnisData.update_definitions(inputs, user_id) do
      %{experience: experience} = result ->
        {
          :ok,
          %{
            experience: experience,
            definitions:
              Enum.map(
                result.definitions,
                &map_update_definition_result/1
              )
          }
        }

      {:error, error} ->
        {:error, error}
    end
  end

  def update_definitions(_, _) do
    Resolver.unauthorized()
  end

  defp map_update_definition_result(%{definition: definition}) do
    %{definition: definition}
  end

  defp map_update_definition_result(%{errors: errors}) do
    %{
      errors: %{
        id: errors.id,
        errors: Resolver.changeset_errors_to_map(errors.errors)
      }
    }
  end
end
