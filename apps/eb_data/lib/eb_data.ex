defmodule EbData do
  import Constantizer

  alias EbData.DefaultImpl

  @behaviour EbData.Impl

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

  def get_user_exps(user_id) do
    impl().get_user_exps(user_id)
  end

  def create_entry(attrs) do
    impl().create_entry(attrs)
  end

  def get_exp_entries(exp_id, user_id) do
    impl().get_exp_entries(exp_id, user_id)
  end

  def get_entry(id), do: impl().get_entry(id)

  defconstp impl do
    Application.get_env(:eb_data, :impl, DefaultImpl)
  end
end
