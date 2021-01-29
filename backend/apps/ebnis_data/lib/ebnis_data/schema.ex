defmodule EbnisData.Schema do
  use Absinthe.Schema
  use Absinthe.Relay.Schema, :modern

  alias EbnisData.Repo
  alias EbnisData.Experience

  import_types(Absinthe.Type.Custom)
  import_types(EbnisData.Schema.Types)
  import_types(EbnisData.Schema.Credential)
  import_types(EbnisData.Schema.User)
  import_types(EbnisData.Schema.Experience)

  query do
    import_fields(:user_query)
    import_fields(:experience_queries)
  end

  mutation do
    import_fields(:user_mutation)
    import_fields(:experience_mutations)
  end

  subscription do
    import_fields(:experience_subscriptions)
  end

  def context(ctx) do
    loader =
      Dataloader.new()
      |> Dataloader.add_source(
        :data,
        Dataloader.Ecto.new(Repo, query: &my_data/2, run_batch: &run_batch/5)
      )

    Map.put(ctx, :loader, loader)
  end

  def plugins do
    [Absinthe.Middleware.Dataloader] ++ Absinthe.Plugin.defaults()
  end

  def my_data(queryable, _params) do
    queryable
  end

  def run_batch(
        Experience,
        _query,
        :entries,
        experiences_ids_pagination_args,
        repo_opts
      ) do
    EbnisData.data_loader_get_entries(
      experiences_ids_pagination_args,
      repo_opts
    )
  end

  # Fallback to original run_batch
  def run_batch(queryable, query, col, inputs, repo_opts) do
    Dataloader.Ecto.run_batch(Repo, queryable, query, col, inputs, repo_opts)
  end
end
