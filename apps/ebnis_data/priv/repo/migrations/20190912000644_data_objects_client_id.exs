defmodule EbnisData.Repo.Migrations.DataObjectsClientId do
  use Ecto.Migration

  def change do
    alter table(:data_objects) do
      add(:client_id, :string)
    end

    :data_objects
    |> unique_index([:client_id, :entry_id])
    |> create()
  end
end
