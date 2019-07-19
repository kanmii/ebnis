defmodule EbData.DefaultImpl do
  require Logger
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
  alias EbData.Resolver
  alias Ecto.Changeset
  alias EbData.FieldType
  alias EbData.DefaultImpl.Field
  alias EbData.DefaultImpl.FieldDef

  @behaviour Impl

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

  @spec save_offline_experience(
          attrs ::
            Impl.save_offline_experience_attributes_t()
        ) ::
          Impl.save_offline_experience_success_t() | Impl.save_offline_experience_failure_t()
  def save_offline_experience(attrs) do
    case create_exp(Map.put(attrs, :custom_requireds, [:client_id])) do
      {:ok, %Experience{} = experience} ->
        entries = attrs[:entries] || []

        {valid_entries, entries_errors_changesets} =
          Entry.save_offline_experience_validate_entries(entries, experience)

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

  def get_experience(id, user_id) do
    Experience
    |> where([e], e.id == ^id and e.user_id == ^user_id)
    |> Repo.one()
  end

  def get_experience(id), do: Repo.get(Experience, id)

  @spec get_experiences(args :: Impl.get_experiences_args_t()) ::
          {:ok, Absinthe.Relay.Connection.t()} | {:error, any}
  def get_experiences(args) do
    query = query_experience(args)

    case args[:pagination] do
      nil ->
        experiences = Repo.all(query)

        experience_connection = %{
          edges: Enum.map(experiences, &%{node: &1, cursor: ""}),
          page_info: %{
            has_next_page: false,
            has_previous_page: false
          }
        }

        {:ok, experience_connection}

      pagination_args ->
        Absinthe.Relay.Connection.from_query(
          query,
          &Repo.all(&1),
          pagination_args
        )
    end
  end

  def get_exp_field_defs(exp_id, user_id) do
    Experience
    |> where([e], e.id == ^exp_id and e.user_id == ^user_id)
    |> select([e], e.field_defs)
    |> Repo.one()
  end

  defp query_experience(%{} = args) do
    Enum.reduce(args, Experience, &query_experience(&2, &1))
  end

  defp query_experience(queryable, {:user_id, id}) do
    where(queryable, [e], e.user_id == ^id)
  end

  defp query_experience(queryable, {:id, id}) do
    where(queryable, [e], e.id == ^id)
  end

  defp query_experience(queryable, {:ids, ids}) do
    where(queryable, [e], e.id in ^ids)
  end

  defp query_experience(queryable, _) do
    queryable
  end

  @spec delete_experience(id :: String.t()) ::
          {:ok, Experience.t()}
          | {:error, Changeset.t()}
  def delete_experience(id) do
    case Experience
         |> where([e], e.id == ^id)
         |> Repo.all() do
      [] ->
        {:error, "Experience not found"}

      [experience] ->
        Repo.delete(experience)
    end
  end

  @spec update_experience(id :: String.t(), args :: Impl.update_experience_args_t()) ::
          {:ok, Experience.t()} | {:error, Changeset.t() | String.t()}
  def update_experience(_id, args) when args == %{} do
    {:error, "Nothing to update"}
  end

  def update_experience(id, %{} = args) do
    case Experience
         |> where([e], e.id == ^id)
         |> Repo.all() do
      [] ->
        {:error, "Experience does not exist"}

      [experience] ->
        put_field_definition_in_experience_update_args(
          args[:field_definitions],
          experience.field_defs
        )
        |> case do
          {nil, _} ->
            experience
            |> Experience.changeset_for_update(args)
            |> Repo.update()

          {field_definitions_to_be_updated, []} ->
            args =
              Map.put(
                args,
                :field_defs,
                field_definitions_to_be_updated
              )

            experience
            |> Experience.changeset_for_update(args)
            |> Repo.update()

          {_, field_definitions_changesets} ->
            changeset = Experience.changeset_for_update(experience, args)

            {
              :error,
              update_in(
                changeset.changes[:field_defs],
                fn _ -> field_definitions_changesets end
              )
            }
        end
    end
  end

  # what if wrong definition id was supplied
  defp put_field_definition_in_experience_update_args(nil, _) do
    {nil, nil}
  end

  defp put_field_definition_in_experience_update_args([], _) do
    {nil, nil}
  end

  defp put_field_definition_in_experience_update_args(
         definition_updates,
         field_definitions
       ) do
    updates_map =
      Enum.reduce(
        definition_updates,
        %{},
        &Map.put(&2, &1.id, &1.name)
      )

    Enum.reduce(field_definitions, {[], []}, fn
      definition, {valids, invalids} ->
        definition = Map.from_struct(definition)

        case updates_map[definition.id] do
          nil ->
            {[definition | valids], invalids}

          name ->
            updated_definition = Map.put(definition, :name, name)

            case FieldDef.changeset(%FieldDef{}, updated_definition) do
              %{valid?: true} ->
                {[updated_definition | valids], invalids}

              changeset ->
                changeset = Changeset.put_change(changeset, :id, definition.id)
                {valids, [changeset | invalids]}
            end
        end
    end)
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
  def create_entries([]) do
    %{}
  end

  def create_entries(entries) do
    Enum.reduce(entries, %{}, fn entry, acc ->
      id = Resolver.convert_to_global_id(entry.exp_id, :experience)

      case create_entry(entry) do
        {:ok, created} ->
          created = Map.put(created, :exp_id, id)
          initial = %{entries: [created], experience_id: id}

          Map.update(acc, id, initial, fn value ->
            update_in(value, [:entries], &[created | &1 || []])
          end)

        {:error, changeset} ->
          error = %{
            client_id: entry[:client_id],
            error: changeset,
            experience_id: id
          }

          initial = %{errors: [error], experience_id: id, entries: []}

          Map.update(acc, id, initial, fn value ->
            update_in(value, [:errors], &[error | &1 || []])
          end)
      end
    end)
  end

  def get_entry(id), do: Repo.get(Entry, id)

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

  @spec update_entry(id :: String.t(), attrs :: Impl.update_entry_args_t()) ::
          {:ok, Entry.t()}
          | {
              :error,
              Changeset.t() | String.t() | %{fields_errors: [Map.t()]}
            }
  def update_entry(id, args) do
    query = where(Entry, [e], e.id == ^id)

    case query
         |> preload([_, ex], exp: ex)
         |> join(:inner, [e], ex in assoc(e, :exp))
         |> Repo.all() do
      [] ->
        {:error, "Entry not found"}

      [entry] ->
        entry.exp.field_defs
        |> update_entry_validate_fields(args[:fields])
        |> case do
          {valid_fields, []} ->
            now =
              DateTime.utc_now()
              |> DateTime.truncate(:second)

            valid_fields = Enum.reverse(valid_fields)

            {1, [updated_entry]} =
              query
              |> select([e], e)
              |> update(
                [e],
                set: [fields: ^valid_fields, updated_at: ^now]
              )
              |> Repo.update_all([])

            {:ok, updated_entry}

          {_, fields_errors} ->
            {:error, %{fields_errors: Enum.reverse(fields_errors)}}
        end
    end
  end

  defp update_entry_validate_fields(definitions, fields) do
    definitions_map =
      definitions
      |> Enum.reduce(%{}, &Map.put(&2, &1.id, :ok))

    fields
    |> Enum.reduce({[], []}, fn
      field, {valids, invalids} ->
        case definitions_map[field.def_id] do
          nil ->
            error = %{
              def_id: field.def_id,
              error: %{
                def_id: "does not exist"
              }
            }

            {valids, [error | invalids]}

          _type ->
            case FieldType.parse(field.data) do
              :error ->
                error = %{
                  def_id: field.def_id,
                  error: %{
                    data: "is invalid"
                  }
                }

                {valids, [error | invalids]}

              _ ->
                {[struct(Field, field) | valids], invalids}
            end
        end
    end)
  end

  @spec delete_entry(id :: String.t()) ::
          {:ok, Entry.t()}
          | {:error, Changeset.t() | String.t()}
  def delete_entry(id) do
    case Entry
         |> where([e], e.id == ^id)
         |> Repo.all() do
      [] ->
        {:error, "Entry does not exist"}

      [entry] ->
        Repo.delete(entry)
    end
  end

  #########################  END ENTRIES #####################################
end
