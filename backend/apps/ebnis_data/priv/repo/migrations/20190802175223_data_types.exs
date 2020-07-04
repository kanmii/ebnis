defmodule EbnisData.Repo.Migrations.FieldTypes do
  use Ecto.Migration

  def change do
    create table("data_types", primary_key: false) do
      add(:type, :citext, null: false, primary_key: true)
    end

    "data_types"
    |> unique_index(["type"])
    |> create()

    execute("""
      INSERT INTO data_types
      values ('single_line_text'),
            ('multi_line_text'),
            ('integer'),
            ('decimal'),
            ('date'),
            ('datetime')
    """)
  end
end
