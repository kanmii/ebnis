defmodule EbnisData do
  require Logger
  import Ecto.Query, warn: false

  alias EbnisData.Repo
  alias EbnisData.Registration
  alias EbnisData.Credential
  alias EbnisData.User
  alias Ecto.Multi
  alias EbnisData.EntryApi
  alias EbnisData.ExperienceApi
  alias EbnisData.CommentApi

  @authenticate_user_exception_header "\n\nException while authenticating user with username:"

  @empty_relay_connection %{
    edges: [],
    page_info: %{
      start_cursor: "",
      end_cursor: "",
      has_previous_page: false,
      has_next_page: false
    }
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

        key = Ebnis.make_cache_key(:user, user.id)
        Cachex.put(:ebnis_cache, key, user)

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
            user = cred.user
            key = Ebnis.make_cache_key(:user, user.id)
            Cachex.put(:ebnis_cache, key, user)

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
                Ebnis.stacktrace_prefix(),
                :error
                |> Exception.format(error, __STACKTRACE__)
                |> Ebnis.prettify_with_new_line()
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
  def get_user(id) do
    key = Ebnis.make_cache_key(:user, id)

    Cachex.fetch(:ebnis_cache, key, fn ->
      case Repo.get(User, id) do
        nil ->
          {:ignore, nil}

        user ->
          {:commit, user}
      end
    end)
    |> case do
      {_, %User{} = user} ->
        user

      _ ->
        nil
    end
  end

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

  def get_empty_relay_connection do
    @empty_relay_connection
  end

  ################################## EXPERIENCES #############################

  defdelegate get_experience(id, user_id), to: ExperienceApi

  defdelegate get_experiences(args), to: ExperienceApi

  defdelegate create_experience(args), to: ExperienceApi

  defdelegate delete_experience(id, user_id), to: ExperienceApi

  defdelegate update_experience(update_args, user_id), to: ExperienceApi

  defdelegate pre_fetch_experiences(args, user_id), to: ExperienceApi

  #########################  END  EXPERIENCES ###############################

  ################################ START ENTRY SECTION #########

  defdelegate data_loader_get_entries(
                experiences_ids_pagination_args_tuples,
                repo_opts
              ),
              to: EntryApi

  defdelegate get_entries(args), to: EntryApi

  defdelegate get_experience_id_to_entry_connection_map(a, b), to: EntryApi

  defdelegate get_data_object(id), to: EntryApi

  defdelegate get_data_objects(ids), to: EntryApi

  defdelegate get_paginated_entries(
                experiences_ids,
                pagination_args,
                repo_opts
              ),
              to: EntryApi

  defdelegate create_experience_comment(params),
    to: CommentApi

  defdelegate create_entry_comment(params),
    to: CommentApi

  ################################ END ENTRY SECTION #################
end
