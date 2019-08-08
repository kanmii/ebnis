defmodule EbnisData do
  require Logger
  import Ecto.Query, warn: false

  alias Ecto.Changeset
  alias EbnisData.Experience
  alias EbnisData.Repo
  alias EbnisData.Registration
  alias EbnisData.Credential
  alias EbnisData.User
  alias Ecto.Multi
  alias EbnisData.EntryApi
  alias EbnisData.ExperienceApi

  @type save_offline_experience_attributes_t ::
          %{
            user_id: String.t(),
            experience: Map.t()
          }

  @type save_offline_experience_success_t ::
          {:ok, Experience.t(), [%Changeset{}]}

  @type save_offline_experience_failure_t :: {:error, %Changeset{}}

  @type get_experiences_args_t :: %{
          pagination_args: Absinthe.Relay.Connection.Options.t(),
          user_id: binary() | Integer.t(),
          ids: [binary() | Integer.t()],
          client_ids: [binary() | Integer.t()]
        }

  @type update_experience_args_t :: %{
          title: String.t(),
          description: binary(),
          field_definitions: [
            %{
              id: String.t(),
              name: String.t()
            }
          ]
        }

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
        if Bcrypt.verify_pass(password, cred.token) do
          {:ok, cred}
        else
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

  defdelegate list_experiences(), to: ExperienceApi
  defdelegate get_experience(id, user_id), to: ExperienceApi
  defdelegate get_experiences(args), to: ExperienceApi
  defdelegate save_offline_experience(args), to: ExperienceApi
  defdelegate create_experience(args), to: ExperienceApi
  defdelegate delete_experience(id, user_id), to: ExperienceApi
  defdelegate update_experience(id, user_id, update_args), to: ExperienceApi

  #########################  END  EXPERIENCES ###############################

  ################################ START ENTRY #############################

  defdelegate create_entry(attrs), to: EntryApi
  defdelegate list_entries(), to: EntryApi
  defdelegate create_entries(attrs), to: EntryApi
  defdelegate delete_entry(attrs), to: EntryApi
  defdelegate update_data_object(arg), to: EntryApi
  defdelegate get_entry(id), to: EntryApi

  defdelegate get_paginated_entries(experiences_ids_pagination_args_tuples, repo_opts),
    to: EntryApi

  ################################ END ENTRY #############################
end
