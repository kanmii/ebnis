defmodule EbData do
  import Constantizer

  alias EbData.DefaultImpl
  alias EbData.Impl
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

  def get_exp(id, user_id) do
    impl().get_exp(id, user_id)
  end

  def get_exp(id) do
    impl().get_exp(id)
  end

  def get_exp_field_defs(exp_id, user_id) do
    impl().get_exp_field_defs(exp_id, user_id)
  end

  def get_user_exps(user_id, pagination_args) do
    impl().get_user_exps(user_id, pagination_args)
  end

  @spec sync_offline_experience(attr :: Impl.sync_offline_experience_attributes_t()) ::
          Impl.sync_offline_experience_success_t() | {:error, Changeset.t()}
  def sync_offline_experience(attrs) do
    impl().sync_offline_experience(attrs)
  end

  ##########################   END EXPERIENCES ###############################

  def create_entry(attrs) do
    impl().create_entry(attrs)
  end

  def create_entries(attrs) do
    impl().create_entries(attrs)
  end

  def get_entry(id), do: impl().get_entry(id)

  @spec list_experiences_entries(
          user_id :: String.t(),
          experiences_ids :: [String.t()],
          pagination_args :: Absinthe.Relay.Connection.Options.t()
        ) :: [Absinthe.Relay.Connection.t()]
  def list_experiences_entries(user_id, experiences_ids, pagination_args) do
    impl().list_experiences_entries(user_id, experiences_ids, pagination_args)
  end

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

  defconstp impl do
    Application.get_env(:eb_data, :impl, DefaultImpl)
  end
end
