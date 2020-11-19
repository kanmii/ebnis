defmodule EbnisData.Repo.Migrations.CreateAuths do
  use Ecto.Migration

  def change do
    create table(:auths, primary_key: false) do
      add(
        :id,
        :binary_id,
        null: false,
        primary_key: true
      )

      add(:email, :string, null: false)
      add(:password_hash, :string)

      timestamps()
    end

    create(unique_index(:auths, [:email]))
  end
end
