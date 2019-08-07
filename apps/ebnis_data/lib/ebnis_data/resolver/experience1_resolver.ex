defmodule EbnisData.Resolver.Experience1 do
  import Absinthe.Resolution.Helpers, only: [on_load: 2]

  alias EbnisData.Resolver
  alias EbnisData.Experience1
  alias EbnisData.Resolver.Entry1, as: Entry1Resolver

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
    |> field_definition_changeset_to_error_map(changeset.changes.field_definitions)
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
    experience_id = experience.id

    Dataloader.load(
      ctx.loader,
      :data,
      {:one, Experience1},
      entries: {experience_id, args}
    )
    |> on_load(fn loader ->
      entries_connection =
        Dataloader.get(
          loader,
          :data,
          {:one, Experience1},
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
         |> convert_entries_experience_ids_from_global()
         |> Map.put(:user_id, user_id)
         |> EbnisData.save_offline_experience1() do
      {:ok, experience, []} ->
        %{experience: experience}

      {:ok, experience, entries_changesets} ->
        experience_id =
          Resolver.convert_to_global_id(
            experience.id,
            :experience1
          )

        errors =
          Enum.map(
            entries_changesets,
            &%{
              errors: Entry1Resolver.entry_changeset_errors_to_map(&1),
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

  defp convert_entries_experience_ids_from_global(experience) do
    case experience[:entries] do
      nil ->
        experience

      entries ->
        %{
          experience
          | entries:
              Enum.map(
                entries,
                &update_in(&1.experience_id, fn id ->
                  Resolver.convert_from_global_id(id, :experience1)
                end)
              )
        }
    end
  end

  def delete_experience(%{id: id}, %{context: %{current_user: user}}) do
    id
    |> Resolver.convert_from_global_id(:experience1)
    |> EbnisData.delete_experience1(user.id)
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
end
