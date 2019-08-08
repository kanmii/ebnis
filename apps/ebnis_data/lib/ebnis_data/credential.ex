defmodule EbnisData.Credential do
  use Ecto.Schema

  import Ecto.Changeset
  import Bcrypt, only: [hash_pwd_salt: 1]

  alias Ecto.Changeset
  alias EbnisData.User

  schema "credentials" do
    field(:source, :string)
    # the encrypted password or token from auth source e.g. google
    field(:token, :string)

    # in case user chooses to use password as source
    field(:password, :string, virtual: true)

    belongs_to(:user, User)
    timestamps()
  end

  @doc false
  def changeset(%__MODULE__{} = credential, attrs) do
    credential
    |> cast(attrs, [:source, :token, :user_id, :password])
    |> validate()
  end

  def create_new_changeset(%__MODULE__{} = credential, attrs) do
    changeset(credential, attrs)
    |> hash_password()
  end

  def validate(%Changeset{} = changes) do
    changes
    |> validate_required([:source])
    |> unique_constraint(:source, name: :credential_user_id_source_index)
  end

  defp hash_password(
         %Changeset{valid?: true, changes: %{source: "password", password: password}} = changes
       ) do
    put_change(changes, :token, hash_pwd_salt(password))
  end
end
