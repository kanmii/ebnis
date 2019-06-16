defmodule EbnisWeb.Resolver.Experience do
  import Absinthe.Resolution.Helpers, only: [on_load: 2]

  alias EbnisWeb.Resolver
  alias EbData.DefaultImpl.Entry
  alias EbnisWeb.Resolver.Entry, as: EntryResolver
  # alias EbData.Impl

  def sync_offline_experience(
        %{input: %{} = attrs},
        %{context: %{current_user: user}}
      ) do
    case attrs
         |> Map.put(:user_id, user.id)
         |> EbData.sync_offline_experience() do
      {:ok, experience, []} ->
        {
          :ok,
          %{
            experience: experience,
            entries_errors: []
          }
        }

      {:ok, experience, entries_changeset_errors} ->
        entries_errors =
          Enum.map(
            entries_changeset_errors,
            fn error ->
              %{
                error: EntryResolver.stringify_changeset_error(error),
                experience_id: experience.id,
                client_id: error.changes.client_id
              }
            end
          )

        {
          :ok,
          %{
            experience: experience,
            entries_errors: entries_errors
          }
        }

      {:error, changeset} ->
        {:error, stringify_changeset_error(changeset)}
    end
  end

  def create(%{exp: attrs}, %{context: %{current_user: user}}) do
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
        changeset.changes.field_defs,
        [],
        fn
          %{valid?: false, errors: errors}, acc ->
            [Resolver.changeset_errors_to_map(errors) | acc]

          _field, acc ->
            acc
        end
      )

    errors =
      case {field_def_errors, changeset.errors} do
        {[], []} ->
          %{}

        {[], other_errors} ->
          Resolver.changeset_errors_to_map(other_errors)

        {field_def_errors, other_errors} ->
          Resolver.changeset_errors_to_map(other_errors)
          |> Map.put(:field_defs, field_def_errors)
      end

    Jason.encode!(errors)
  end

  def get_exp(%{exp: %{id: global_id}}, %{context: %{current_user: user}}) do
    id = Resolver.convert_from_global_id(global_id, :experience)

    case EbData.get_exp(id, user.id) do
      nil ->
        {:error, "Experience definition not found"}

      exp ->
        {:ok, exp}
    end
  end

  def get_exp(_, _) do
    Resolver.unauthorized()
  end

  def get_user_exps(args, %{context: %{current_user: user}}) do
    EbData.get_user_exps(user.id, args.pagination)
  end

  def get_user_exps(_, _) do
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
end
