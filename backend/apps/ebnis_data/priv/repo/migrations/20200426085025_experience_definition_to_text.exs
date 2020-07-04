defmodule EbnisData.Repo.Migrations.ExperienceDefinitionToText do
  use Ecto.Migration

  def change do
    alter table(:experiences) do
      modify(:description, :text)
    end
  end
end
