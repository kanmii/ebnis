defmodule EbnisData.User.Resolver do
  alias EbnisData.User
  alias EbnisData.Resolver
  alias EbnisData.Guardian, as: GuardianApp

  def create(_root, %{registration: params}, _info) do
    with {:ok, user} <- EbnisData.register(params),
         {:ok, jwt, _claim} <- GuardianApp.encode_and_sign(user) do
      EbnisEmails.send_welcome(user.email)

      {:ok, %User{user | jwt: jwt}}
    else
      {:error, failed_operations, changeset} ->
        {
          :error,
          Resolver.transaction_errors_to_string(changeset, failed_operations)
        }

      error ->
        {:error, inspect(error)}
    end
  end

  def update(_, %{user: %{jwt: jwt} = params}, _info) do
    with {:ok, user, _claim} <- GuardianApp.resource_from_token(jwt),
         {:ok, created_user} <- EbnisData.update_user(user, params),
         {:ok, new_jwt, _claim} <- GuardianApp.encode_and_sign(created_user) do
      {:ok, %User{created_user | jwt: new_jwt}}
    else
      {:error, %Ecto.Changeset{} = changeset} ->
        errors =
          Resolver.changeset_errors_to_map(changeset.errors)
          |> Jason.encode!()

        {:error, errors}

      _ ->
        Resolver.unauthorized()
    end
  end

  def login(_root, %{login: params}, _info) do
    with {:ok, %{user: user}} <- EbnisData.authenticate(params),
         {:ok, jwt, _claim} <- GuardianApp.encode_and_sign(user) do
      {:ok, %User{user | jwt: jwt}}
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
end
