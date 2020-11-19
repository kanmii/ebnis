defmodule EbnisData.Users.Auth do
  use Ecto.Schema
  use Pow.Ecto.Schema

  @primary_key {:id, Ecto.ULID, autogenerate: true}
  schema "auths" do
    pow_user_fields()

    timestamps()
  end
end
