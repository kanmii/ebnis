defmodule EbData.DefaultImpl do
  import Ecto.Query, warn: false
  import Comeonin.Bcrypt, only: [{:dummy_checkpw, 0}, {:checkpw, 2}]

  alias EbData.DefaultImpl.Repo
  alias EbData.DefaultImpl.Registration
  alias EbData.DefaultImpl.Credential
  alias EbData.DefaultImpl.User
  alias EbData.DefaultImpl.Experience
  alias EbData.DefaultImpl.Entry
  alias Ecto.Multi
  alias EbData.Impl

  @behaviour Impl

  # ACCOUNTS

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
        dummy_checkpw()
        {:error, "Invalid email/password"}

      %Credential{} = cred ->
        if checkpw(password, cred.token) do
          {:ok, cred}
        else
          {:error, "Invalid email/password"}
        end
    end
  end

  #################################### CREDENTIAL ##############################

  @doc """
  Returns the list of credentials.

  ## Examples

      iex> list_credential()
      [%Credential{}, ...]

  """
  def list_credential do
    Repo.all(Credential)
  end

  @doc """
  Gets a single credential.

  Raises `Ecto.NoResultsError` if the Credential does not exist.

  ## Examples

      iex> get_credential(123)
      %Credential{}

      iex> get_credential(456)
      ** nil

  """
  def get_credential(id), do: Repo.get(Credential, id)

  @doc """
  Updates a credential.

  ## Examples

      iex> update_credential(credential, %{field: new_value})
      {:ok, %Credential{}}

      iex> update_credential(credential, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def update_credential(%Credential{} = credential, attrs) do
    credential
    |> Credential.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a Credential.

  ## Examples

      iex> delete_credential(credential)
      {:ok, %Credential{}}

      iex> delete_credential(credential)
      {:error, %Ecto.Changeset{}}

  """
  def delete_credential(%Credential{} = credential) do
    Repo.delete(credential)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking credential changes.

  ## Examples

      iex> change_credential(credential, %{})
      %Ecto.Changeset{source: %Credential{}}

  """
  def change_credential(%Credential{} = credential, attrs \\ %{}) do
    Credential.changeset(credential, attrs)
  end

  ################################## USERS ##################################

  @doc """
  Returns the list of users.

  ## Examples

      iex> list_user()
      [%User{}, ...]

  """
  def list_user do
    Repo.all(User)
  end

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

  @doc """
  Deletes a User.

  ## Examples

      iex> delete_user(user)
      {:ok, %User{}}

      iex> delete_user(user)
      {:error, %Ecto.Changeset{}}

  """
  def delete_user(%User{} = user) do
    Repo.delete(user)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking user changes.

  ## Examples

      iex> change_user(user)
      %Ecto.Changeset{source: %User{}}

  """
  def change_user(%User{} = user, attrs \\ %{}) do
    User.changeset(user, attrs)
  end

  def get_user_by(attrs), do: Repo.get_by(User, attrs)

  ################################## EXPERIENCES ###############################

  def create_exp(attrs) do
    %Experience{}
    |> Experience.changeset(attrs)
    |> Repo.insert()
  end

  @spec sync_offline_experience(
          attrs ::
            Impl.sync_offline_experience_attributes_t()
        ) ::
          Impl.sync_offline_experience_success_t() | Impl.sync_offline_experience_failure_t()
  def sync_offline_experience(attrs) do
    case create_exp(Map.put(attrs, :custom_requireds, [:client_id])) do
      {:ok, %Experience{} = experience} ->
        entries = attrs[:entries] || []

        {valid_entries, entries_errors_changesets} =
          Entry.sync_offline_experience_validate_entries(entries, experience)

        {created_entries, entries_errors_changesets} =
          Enum.reduce(
            valid_entries,
            {[], entries_errors_changesets},
            fn entry_attrs, {valids, invalids} ->
              case create_entry(entry_attrs) do
                {:ok, entry} ->
                  {[entry | valids], invalids}

                {:error, changeset} ->
                  {valids, [changeset | invalids]}
              end
            end
          )

        experience_with_entries = %Experience{
          experience
          | entries: created_entries
        }

        {:ok, experience_with_entries, entries_errors_changesets}

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  def get_exp(id, user_id) do
    Experience
    |> where([e], e.id == ^id and e.user_id == ^user_id)
    |> Repo.one()
  end

  def get_exp(id), do: Repo.get(Experience, id)

  def get_user_exps(user_id, pagination_args) do
    Experience
    |> where([e], e.user_id == ^user_id)
    |> Absinthe.Relay.Connection.from_query(
      &Repo.all(&1),
      pagination_args
    )
  end

  def get_exp_field_defs(exp_id, user_id) do
    Experience
    |> where([e], e.id == ^exp_id and e.user_id == ^user_id)
    |> select([e], e.field_defs)
    |> Repo.one()
  end

  #########################  END  EXPERIENCES ###############################

  ############################## ENTRIES #####################################

  def create_entry(%{} = attrs) do
    %Entry{}
    |> Entry.changeset_one(attrs)
    |> Repo.insert()
  end

  @spec create_entries(attr :: Impl.create_entries_attributes_t()) ::
          Impl.create_entries_returned_t()
  def create_entries(%{entries: []}) do
    %{}
  end

  def create_entries(%{entries: entries, user_id: user_id} = _attrs) do
    Enum.reduce(entries, %{}, fn entry, acc ->
      id = entry.exp_id

      case create_entry(Map.put(entry, :user_id, user_id)) do
        {:ok, created} ->
          Map.update(acc, id, %{entries: [created], exp_id: id}, fn value ->
            update_in(value, [:entries], &[created | &1 || []])
          end)

        {:error, changeset} ->
          error = %{
            client_id: entry[:client_id],
            error: changeset
          }

          initial = %{errors: [error], exp_id: id, entries: []}

          Map.update(acc, id, initial, fn value ->
            update_in(value, [:errors], &[error | &1 || []])
          end)
      end
    end)
  end

  def get_entry(id), do: Repo.get(Entry, id)

  @spec list_entries_from_experiences_ids(args :: Impl.list_entries_from_experiences_ids_args_t()) ::
          Impl.list_entries_from_experiences_ids_return_t()
  def list_entries_from_experiences_ids(args) do
    %{
      experiences_ids: experiences_ids,
      pagination_args: pagination_args
    } = args

    Enum.map(experiences_ids, fn experience_id ->
      %{
        exp_id: experience_id,
        entry_connection: get_paginated_entries(experience_id, pagination_args)
      }
    end)
  end

  @spec get_paginated_entries(
          experience_id :: String.t(),
          pagination_args :: Absinthe.Relay.Connection.Options.t(),
          query :: Ecto.Queryable.t() | nil
        ) :: Absinthe.Relay.Connection.t()
  def get_paginated_entries(
        experience_id,
        pagination_args,
        query \\ nil,
        repo_opts \\ []
      ) do
    {:ok, entries_connection} =
      (query || Entry)
      |> join(:inner, [ee], e in assoc(ee, :exp))
      |> where([_, e], e.id == ^experience_id)
      |> order_by([ee], desc: ee.updated_at)
      |> Absinthe.Relay.Connection.from_query(
        &Repo.all(&1, repo_opts),
        pagination_args
      )

    entries_connection
  end

  #########################  END ENTRIES #####################################
end
