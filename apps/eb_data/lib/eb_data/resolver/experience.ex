defmodule EbData.Resolver.Experience do
  import Absinthe.Resolution.Helpers, only: [on_load: 2]

  alias EbData.Resolver
  alias EbData.DefaultImpl.Entry
  alias EbData.Resolver.Entry, as: EntryResolver
  alias Ecto.Changeset
  # alias EbData.Impl

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
    case EbData.save_offline_experience(
           Map.put(
             experience,
             :user_id,
             user_id
           )
         ) do
      {:ok, experience, []} ->
        %{experience: experience}

      {:ok, experience, entries_errors} ->
        errors =
          Enum.map(
            entries_errors,
            &%{
              error: EntryResolver.stringify_changeset_error(&1),
              experience_id: experience.id,
              client_id: &1.changes.client_id
            }
          )

        %{experience: experience, entries_errors: errors}

      {:error, changeset} ->
        %{
          experience_error: %{
            error: stringify_changeset_error(changeset),
            index: index,
            client_id: experience[:client_id]
          }
        }
    end
  end

  def create(%{input: attrs}, %{context: %{current_user: user}}) do
    case attrs
         |> Map.put(:user_id, user.id)
         |> EbData.create_exp() do
      {:ok, exp} ->
        {:ok, exp}

      {:error, changeset} ->
        {:error, stringify_changeset_error(changeset)}
    end
  end

  def create(_, _) do
    Resolver.unauthorized()
  end

  defp stringify_changeset_error(changeset) do
    field_def_errors =
      Enum.reduce(
        changeset.changes[:field_defs] || [],
        [],
        fn
          %{valid?: false, errors: errors}, acc ->
            [EbData.changeset_errors_to_map(errors) | acc]

          _field, acc ->
            acc
        end
      )

    errors =
      case {field_def_errors, changeset.errors} do
        {[], []} ->
          %{}

        {[], other_errors} ->
          EbData.changeset_errors_to_map(other_errors)

        {field_def_errors, other_errors} ->
          EbData.changeset_errors_to_map(other_errors)
          |> Map.put(:field_defs, field_def_errors)
      end

    Jason.encode!(errors)
  end

  def get_experience(%{id: global_id}, %{context: %{current_user: user}}) do
    id = Resolver.convert_from_global_id(global_id, :experience)

    case EbData.get_experience(id, user.id) do
      nil ->
        {:error, "Experience definition not found"}

      exp ->
        {:ok, exp}
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
    |> EbData.get_experiences()
  end

  def get_experiences(_, _) do
    Resolver.unauthorized()
  end

  def entries(
        %{} = experience,
        %{pagination: args},
        %{context: %{loader: loader}}
      ) do
    loader
    |> Dataloader.load(
      :data,
      {:one, Entry},
      paginated_entries: {experience, args}
    )
    |> on_load(fn loader ->
      {:ok,
       Dataloader.get(
         loader,
         :data,
         {:one, Entry},
         paginated_entries: {experience, args}
       )}
    end)
  end

  def entries(%{} = experience, _args, context) do
    # get first 100 entries by default
    entries(experience, %{pagination: %{first: 100}}, context)
  end

  @spec delete_experience(%{id: String.t()}, any) ::
          {:error, binary | [{:message, <<_::96>>}, ...]} | {:ok, true}
  def delete_experience(%{id: id}, %{context: %{current_user: _}}) do
    case Resolver.convert_from_global_id(id, :experience) do
      :error ->
        {:error, "Invalid ID"}

      id ->
        EbData.delete_experience(id)
    end
  end

  def delete_experience(_, _) do
    Resolver.unauthorized()
  end

  def update_experience(
        %{input: %{id: id} = args},
        %{context: %{current_user: _}}
      ) do
    args = Map.delete(args, :id)

    case Resolver.convert_from_global_id(id, :experience) do
      :error ->
        {:error, "Invalid ID"}

      id ->
        case EbData.update_experience(id, args) do
          {:error, %Changeset{errors: errors, changes: changes}} ->
            field_defs = changes[:field_defs]

            errors =
              errors
              |> update_experience_changeset_errors_to_map()
              |> update_experience_fields_changeset_errors_to_map(field_defs)

            {:ok, errors}

          {:ok, experience} ->
            {:ok, %{experience: experience}}

          {:error, error} ->
            {:error, error}
        end
    end
  end

  def update_experience(_, _) do
    Resolver.unauthorized()
  end

  defp update_experience_changeset_errors_to_map([]) do
    %{}
  end

  defp update_experience_changeset_errors_to_map(errors) do
    %{
      experience_error: EbData.changeset_errors_to_map(errors)
    }
  end

  defp update_experience_fields_changeset_errors_to_map(errors, nil) do
    errors
  end

  defp update_experience_fields_changeset_errors_to_map(errors, changesets) do
    Enum.reduce(
      changesets,
      [],
      fn
        %{valid?: true}, acc ->
          acc

        %{errors: errors, changes: %{id: id}}, acc ->
          [Map.put(EbData.changeset_errors_to_map(errors), :id, id) | acc]
      end
    )
    |> case do
      [] ->
        errors

      field_errors ->
        Map.put(
          errors,
          :field_definitions_errors,
          field_errors
        )
    end
  end
end
