defmodule EbData.DefaultImpl.Registration do
  use Ecto.Schema

  import Ecto.Changeset

  alias Ecto.Changeset
  alias Ecto.Multi
  alias EbData.DefaultImpl.User
  alias EbData.DefaultImpl.Credential
  alias EbData.DefaultImpl.Repo

  @required_fields [
    :name,
    :email,
    :source,
    :password
  ]

  embedded_schema do
    field(:name, :string)
    field(:email, :string)
    field(:source, :string)
    field(:password, :string)
    field(:password_confirmation, :string)
  end

  @doc ~S"""
     changeset
  """
  def changeset(%__MODULE__{} = reg, params \\ %{}) do
    reg
    |> cast(params, @required_fields)
    |> validate_length(:password, min: 4, max: 200)
    |> validate_confirmation(:password)
    |> User.validate_create()
    |> Credential.validate()
  end

  def validate(_repo, _changes, params) do
    changes = changeset(%__MODULE__{}, params)

    case changes.valid? do
      true ->
        {:ok, changes}

      _ ->
        {:error, apply_action(changes, :insert)}
    end
  end

  def insert_user(_repo, _changes, params) do
    create_user(params)
  end

  def insert_credential(_repo, %{user: user}, params) do
    user
    |> Ecto.build_assoc(:credential)
    |> Credential.changeset(params)
    |> create_credential()
  end

  def create(multi, params) do
    multi
    |> Multi.run(:registration, __MODULE__, :validate, [params])
    |> Multi.run(:user, __MODULE__, :insert_user, [params])
    |> Multi.run(:credential, __MODULE__, :insert_credential, [params])
  end

  @doc """
  Creates a credential.

  ## Examples

      iex> create_credential(%{field: value})
      {:ok, %Credential{}}

      iex> create_credential(%{field: bad_value})
      {:error, Changeset{}}

  """
  def create_credential(%Changeset{} = changes) do
    Repo.insert(changes)
  end

  def create_credential(attrs) do
    %Credential{}
    |> Credential.changeset(attrs)
    |> create_credential()
  end

  @doc """
  Creates a user.

  ## Examples

      iex> create_user(%{field: value})
      {:ok, %User{}}

      iex> create_user(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def create_user(attrs \\ %{}) do
    %User{}
    |> User.changeset(attrs)
    |> Repo.insert()
  end
end
