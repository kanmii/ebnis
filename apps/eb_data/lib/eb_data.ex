defmodule EbData do
  import Constantizer

  alias EbData.DefaultImpl
  alias EbData.Impl
  alias EbData.DefaultImpl.Experience
  alias Ecto.Changeset

  @behaviour Impl

  #################################### ACCOUNTS ################################

  def register(params), do: impl().register(params)

  def authenticate(params), do: impl().authenticate(params)

  #################################### CREDENTIAL ##############################

  def list_credential(params), do: impl().list_credential(params)
  def get_credential(id), do: impl().get_credential(id)

  def update_credential(schema, params),
    do: impl().update_credential(schema, params)

  def delete_credential(schema), do: impl().delete_credential(schema)

  def change_credential(schema, params),
    do: impl().change_credential(schema, params)

  ################################### USERS ####################################

  def list_user, do: impl().list_user()
  def get_user(id), do: impl().get_user(id)
  def update_user(schema, params), do: impl().update_user(schema, params)
  def delete_user(schema), do: impl().delete_user(schema)

  def get_user_by(attrs) when is_map(attrs) or is_list(attrs),
    do: impl().get_user_by(attrs)

  ################################## EXPERIENCES ###############################

  def create_exp(attrs) do
    impl().create_exp(attrs)
  end

  def get_experience(id, user_id) do
    impl().get_experience(id, user_id)
  end

  def get_experience(id) do
    impl().get_experience(id)
  end

  def get_exp_field_defs(exp_id, user_id) do
    impl().get_exp_field_defs(exp_id, user_id)
  end

  @spec get_experiences(args :: Impl.get_experiences_args_t()) ::
          {:ok, Absinthe.Relay.Connection.t()} | {:error, any}
  def get_experiences(args) do
    impl().get_experiences(args)
  end

  @spec save_offline_experience(attr :: Impl.save_offline_experience_attributes_t()) ::
          Impl.save_offline_experience_success_t() | Impl.save_offline_experience_failure_t()
  def save_offline_experience(attrs) do
    impl().save_offline_experience(attrs)
  end

  @spec delete_experience(id :: String.t()) :: {:ok, Experience.t()} | {:error, Changeset.t()}
  def delete_experience(id) do
    impl().delete_experience(id)
  end

  @spec update_experience(id :: String.t(), args :: Impl.update_experience_args_t()) ::
          {:ok, Experience.t()} | {:error, Changeset.t() | String.t()}
  def update_experience(id, args) do
    impl().update_experience(id, args)
  end

  ##########################   END EXPERIENCES ###############################

  ##########################   ENTRIES ######################################
  def create_entry(attrs) do
    impl().create_entry(attrs)
  end

  @spec create_entries(attr :: Impl.create_entries_attributes_t()) ::
          Impl.create_entries_returned_t()

  def create_entries(attrs) do
    impl().create_entries(attrs)
  end

  def get_entry(id), do: impl().get_entry(id)

  def get_paginated_entries(
        experience_id,
        pagination_args,
        query \\ nil,
        repo_opts \\ []
      ) do
    impl().get_paginated_entries(
      experience_id,
      pagination_args,
      query,
      repo_opts
    )
  end

  @spec update_entry(id :: String.t(), attrs :: Impl.update_entry_args_t()) ::
          {:ok, Entry.t()}
          | {
              :error,
              Changeset.t() | String.t() | %{fields_errors: [Map.t()]}
            }
  def update_entry(id, args) do
    impl().update_entry(id, args)
  end

  @spec mapify_entry_field_error(
          def_id :: String.t(),
          errors :: [Map.t()],
          index :: Integer.t() | nil
        ) :: Map.t()
  def mapify_entry_field_error(def_id, errors, index \\ nil) do
    meta = %{
      def_id: def_id
    }

    meta = if(index, do: Map.put(meta, :index, index), else: meta)

    %{
      meta: meta,
      errors: changeset_errors_to_map(errors)
    }
  end

  @spec delete_entry(id :: String.t()) ::
          {:ok, Entry.t()}
          | {:error, Changeset.t() | String.t()}
  def delete_entry(id) do
    impl().delete_entry(id)
  end

  ################################ END ENTRIES ###############################

  ################################ UTILITIES #################################

  def changeset_errors_to_map(errors),
    do:
      errors
      |> Enum.map(fn
        {k, {v, opts}} ->
          {k, error_value(v, opts)}

        kv ->
          kv
      end)
      |> Enum.into(%{})

  defp error_value(v, opts) do
    case(Keyword.fetch(opts, :count)) do
      :error ->
        v

      {:ok, count} ->
        String.replace(v, "%{count}", to_string(count))
    end
  end

  ################################ END UTILITIES #############################

  defconstp impl do
    Application.get_env(:eb_data, :impl, DefaultImpl)
  end
end
