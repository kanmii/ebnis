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

  ##########################   END EXPERIENCES ###############################

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

  defconstp impl do
    Application.get_env(:eb_data, :impl, DefaultImpl)
  end
end
