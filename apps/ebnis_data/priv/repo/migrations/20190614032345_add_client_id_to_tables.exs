defmodule EbnisData.Repo.Migrations.AddClientIdToTables do
  use Ecto.Migration

  def up do
    alter table(:experiences) do
      add(:client_id, :string)
    end

    :experiences
    |> unique_index([:client_id, :user_id])
    |> create()

    alter table(:entries) do
      add(:client_id, :string)
    end

    :entries
    |> unique_index([:client_id, :exp_id])
    |> create()
  end

  def down do
    :experiences
    |> index([:client_id, :user_id])
    |> drop()

    alter table(:experiences) do
      remove(:client_id)
    end

    :entries
    |> index([:client, :exp_id])
    |> drop()

    alter table(:entries) do
      remove(:client_id)
    end
  end
end
