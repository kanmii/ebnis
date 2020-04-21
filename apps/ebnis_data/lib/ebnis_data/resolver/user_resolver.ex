defmodule EbnisData.User.Resolver do
  alias EbnisData.User
  alias EbnisData.Resolver
  alias EbnisData.Guardian, as: GuardianApp

  def create(%{input: params}, _info) do
    with {:ok, user} <- EbnisData.register(params),
         {:ok, jwt, _claim} <- GuardianApp.encode_and_sign(user) do
      EbnisEmails.send_welcome(user.email)

      user = %User{
        user
        | jwt: jwt
      }

      {
        :ok,
        %{
          user: user
        }
      }
    else
      {:error, _failed_operations, changeset} ->
        errors = Resolver.changeset_errors_to_map(changeset.errors)

        {
          :ok,
          %{
            errors: errors
          }
        }
    end
  end

  def update(%{input: %{jwt: jwt} = params}, _info) do
    with {:ok, user, _claim} <- GuardianApp.resource_from_token(jwt),
         {:ok, created_user} <- EbnisData.update_user(user, params),
         {:ok, new_jwt, _claim} <- GuardianApp.encode_and_sign(created_user) do
      user = %User{
        created_user
        | jwt: new_jwt
      }

      {
        :ok,
        %{
          user: user
        }
      }
    end
  end

  def refresh(_root, %{refresh: %{jwt: jwt}}, _info) do
    with {:ok, _claims} <- GuardianApp.decode_and_verify(jwt),
         {:ok, _old, {new_jwt, _claims}} = GuardianApp.refresh(jwt),
         {:ok, user, _claims} <- GuardianApp.resource_from_token(jwt) do
      {:ok, %User{user | jwt: new_jwt}}
    else
      {:error, errs} ->
        {
          :error,
          Jason.encode!(%{
            error: errs
          })
        }
    end
  end

  def login_union(%{user: _}, _) do
    :user_success
  end

  def login_union(%{error: _}, _) do
    :login_error
  end

  def login(%{input: params}, _) do
    with {:ok, %{user: user}} <- EbnisData.authenticate(params),
         {:ok, jwt, _claim} <- GuardianApp.encode_and_sign(user) do
      user = %User{user | jwt: jwt}

      {
        :ok,
        %{
          user: user
        }
      }
    else
      {:error, errs} ->
        {
          :ok,
          %{
            error: errs
          }
        }
    end
  end

  def registration_union(%{user: _}, _) do
    :user_success
  end

  def registration_union(%{errors: _}, _) do
    :registration_errors
  end

  def update_union(%{user: _}, _) do
    :user_success
  end

  def update_union(%{errors: _}, _) do
    :update_user_errors
  end
end
