defmodule EbnisData do
  require Logger
  import Ecto.Query, warn: false
  import Ebnis

  alias EbnisData.Repo
  alias EbnisData.Registration
  alias EbnisData.Credential
  alias EbnisData.User
  alias Ecto.Multi
  alias EbnisData.EntryApi
  alias EbnisData.ExperienceApi

  @authenticate_user_exception_header "\n\nException while authenticating user with username:"

  def register(%{} = params) do
    Multi.new()
    |> Registration.create(params)
    |> Repo.transaction()
    |> case do
      {:ok, %{user: user, credential: credential}} ->
        user =
          Map.put(user, :credential, %{
            credential
            | token: nil,
              password: nil
          })

        {:ok, user}

      {:error, failed_operations, changeset, _successes} ->
        {:error, failed_operations, changeset}
    end
  end

  def authenticate(%{email: email, password: password} = _params) do
    Credential
    |> join(:inner, [c], assoc(c, :user))
    |> where([c, u], u.email == ^email)
    |> preload([c, u], user: u)
    |> Repo.one()
    |> case do
      nil ->
        {:error, "Invalid email/password"}

      %Credential{} = cred ->
        try do
          if Pbkdf2.verify_pass(password, cred.token) do
            {:ok, cred}
          else
            {:error, "Invalid email/password"}
          end
        rescue
          error ->
            Logger.error(fn ->
              [
                @authenticate_user_exception_header,
                cred.user.email,
                stacktrace_prefix(),
                :error
                |> Exception.format(error, __STACKTRACE__)
                |> prettify_with_new_line()
              ]
            end)

            {:error, "Invalid email/password"}
        end
    end
  end

  ################################## USERS ##################################

  @doc """
  Gets a single user.

  Raises `Ecto.NoResultsError` if the User does not exist.

  ## Examples

      iex> get(123)
      %User{}

      iex> get(456)
      ** nil

  """
  def get_user(id), do: Repo.get(User, id)

  @doc """
  Updates a user.

  ## Examples

      iex> update_user(user, %{field: new_value})
      {:ok, %User{}}

      iex> update_user(user, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def update_user(%User{} = user, attrs) do
    user
    |> User.changeset(attrs)
    |> Repo.update()
  end

  ################################## EXPERIENCES #############################

  defdelegate get_experience(id, user_id), to: ExperienceApi
  defdelegate get_experiences(args), to: ExperienceApi
  defdelegate save_offline_experience(args), to: ExperienceApi
  defdelegate create_experience(args), to: ExperienceApi
  defdelegate delete_experience(id, user_id), to: ExperienceApi
  defdelegate update_experience(update_args, user_id), to: ExperienceApi
  defdelegate update_definitions(inputs, user_id), to: ExperienceApi

  #########################  END  EXPERIENCES ###############################

  ################################ START ENTRY SECTION #########

  defdelegate create_entry(attrs), to: EntryApi
  defdelegate create_entries(attrs), to: EntryApi
  defdelegate delete_entry(attrs), to: EntryApi
  defdelegate update_data_object(arg), to: EntryApi
  defdelegate get_entry(id), to: EntryApi
  defdelegate update_entry(params, user_id), to: EntryApi

  defdelegate get_paginated_entries(experiences_ids_pagination_args_tuples, repo_opts),
    to: EntryApi

  ################################ END ENTRY SECTION #################
end
