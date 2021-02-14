defmodule EbnisData.Repo.Migrations.ModifyEmbeddedFields do
  use Ecto.Migration

  def change do
    alter table("experiences") do
      modify(
        :field_defs,
        :jsonb,
        null: true
      )
    end

    alter table("entries") do
      modify(
        :fields,
        :jsonb,
        null: true
      )
    end
  end
end
