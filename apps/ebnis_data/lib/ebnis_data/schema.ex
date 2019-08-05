defmodule EbnisData.Schema do
  use Absinthe.Schema
  use Absinthe.Relay.Schema, :modern

  alias EbnisData.Repo
  alias EbnisData.Entry
  alias EbnisData.EntryApi
  alias EbnisData.Experience1

  import_types(Absinthe.Type.Custom)
  import_types(EbnisData.Schema.Types)
  import_types(EbnisData.Schema.Credential)
  import_types(EbnisData.Schema.User)
  import_types(EbnisData.Schema.Experience)
  import_types(EbnisData.Schema.Experience1)
  import_types(EbnisData.Schema.FieldDef)
  import_types(EbnisData.Schema.FieldDefinition)
  import_types(EbnisData.EntrySchema)
  import_types(EbnisData.Schema.Entry1)

  query do
    import_fields(:user_query)
    import_fields(:experience_query)
    import_fields(:experience_queries)
  end

  mutation do
    import_fields(:user_mutation)
    import_fields(:experience_mutation)
    import_fields(:entry_mutation)
    import_fields(:experience_mutations)
    import_fields(:entry_mutations)
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
        Entry,
        query,
        :paginated_entries,
        list_experiences_pagination_args,
        repo_opts
      ) do
    Enum.map(list_experiences_pagination_args, fn {experience, args} ->
      EntryApi.get_paginated_entries(experience.id, args, query, repo_opts)
    end)
  end

  def run_batch(
        Experience1,
        _query,
        :entries,
        experiences_ids_pagination_args_tuples,
        repo_opts
      ) do
    EbnisData.get_paginated_entries_1(
      experiences_ids_pagination_args_tuples,
      repo_opts
    )
  end

  def run_batch(queryable, query, col, inputs, repo_opts) do
    Dataloader.Ecto.run_batch(Repo, queryable, query, col, inputs, repo_opts)
  end
end
