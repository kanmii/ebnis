defmodule EbnisData.Repo.Migrations.DropEmbeddedFields do
  use Ecto.Migration

  def change do
    alter table("experiences") do
      remove(:field_defs)
    end

    "experiences"
    |> index([:field_defs], name: "experiences_field_defs")
    |> drop_if_exists()

    alter table("entries") do
      remove(:fields)
    end

    "entries"
    |> index([:fields], name: "entries_fields")
    |> drop_if_exists()
  end
end
