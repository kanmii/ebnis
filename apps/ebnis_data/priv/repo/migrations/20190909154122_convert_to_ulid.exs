defmodule EbnisData.Repo.Migrations.ConvertToUlid do
  use Ecto.Migration
  import Ecto.Query
  alias EbnisData.Repo

  def up do
    up_user_schema()
    up_credentials_schema()
    up_experience_schema()
    up_entries_schema()
    up_definitions_schema()
    up_data_objects_schema()

    flush()

    up_user_data()
    make_bin_col_not_null("users")
    create_id_pk("users")

    up_credentials_data()
    make_bin_col_not_null("credentials")
    make_bin_col_not_null("credentials", :user_id)
    create_id_pk("credentials")
    make_col_foreign_key("credentials", "user_id", "users")
    up_create_credentials_index()

    up_experiences_data()
    make_bin_col_not_null("experiences")
    make_bin_col_not_null("experiences", :user_id)
    create_id_pk("experiences")
    make_col_foreign_key("experiences", "user_id", "users")
    up_create_experiences_index()

    up_entries_data()
    make_bin_col_not_null("entries")
    make_bin_col_not_null("entries", :experience_id)
    create_id_pk("entries")
    make_col_foreign_key("entries", "experience_id", "experiences")
    up_create_entries_index()

    up_definitions_data()
    make_bin_col_not_null("data_definitions")
    make_bin_col_not_null("data_definitions", :experience_id)
    create_id_pk("data_definitions")
    make_col_foreign_key("data_definitions", "experience_id", "experiences")
    up_definitions_index()

    up_data_objects_data()
    make_bin_col_not_null("data_objects")
    make_bin_col_not_null("data_objects", :definition_id)
    make_bin_col_not_null("data_objects", :entry_id)
    create_id_pk("data_objects")
    make_col_foreign_key("data_objects", "definition_id", "data_definitions")
    make_col_foreign_key("data_objects", "entry_id", "entries")
    up_data_objects_index()
  end

  def down do
    down_user_schema()
    down_credentials_schema()
    down_experience_schema()
    down_entries_schema()
    down_definitions_schema()
    down_data_objects_schema()
  end

  defp up_user_schema do
    :experiences
    |> constraint(:experiences_user_id_fkey)
    |> drop()

    :credentials
    |> constraint(:credentials_user_id_fkey)
    |> drop()

    table = "users"

    drop_pkey_constraint(table)
    rename_column(table, :id, :old_id)

    alter table(table) do
      modify(:old_id, :bigint, null: true)
      add(:id, :binary_id)
    end
  end

  defp up_user_data do
    from(
      u in "users",
      select: u.old_id
    )
    |> Repo.all()
    |> Enum.map(fn old_id ->
      from(
        u in "users",
        where: u.old_id == ^old_id,
        update: [
          set: [
            id: ^ulid_id()
          ]
        ]
      )
      |> Repo.update_all([])
    end)
  end

  defp down_user_schema do
    :experiences
    |> constraint(:experiences_user_id_fkey)
    |> drop()

    :credentials
    |> constraint(:credentials_user_id_fkey)
    |> drop()

    table = "users"

    drop_pkey_constraint(table)

    alter table(table) do
      remove(:id)
    end

    rename_column(table, :old_id, :id)

    alter table(table) do
      modify(:id, :bigint, null: false)
    end

    create_id_pk(table)
  end

  defp up_credentials_schema do
    table = "credentials"

    table
    |> index([:user_id, :source])
    |> drop()

    table
    |> index([:source, :token])
    |> drop()

    drop_pkey_constraint(table)
    rename_column(table, :id, :old_id)
    rename_column(table, :user_id, :old_user_id)

    alter table(table) do
      modify(:old_user_id, :bigint, null: true)
      modify(:old_id, :bigint, null: true)
      add(:id, :binary_id)
      add(:user_id, :binary_id)
    end
  end

  defp up_create_credentials_index do
    table = "credentials"

    table
    |> unique_index([:user_id, :source])
    |> create()

    # we will not touch it on rollback because it was originally not unique but
    # this migration corrects that and should not roll it back
    table
    |> unique_index([:source, :token])
    |> create()
  end

  defp up_credentials_data do
    from(
      c in "credentials",
      select: c.old_id
    )
    |> Repo.all()
    |> Enum.map(fn old_id ->
      from(
        c in "credentials",
        where: c.old_id == ^old_id,
        join: u in "users",
        on: c.old_user_id == u.old_id,
        update: [
          set: [
            id: ^ulid_id(),
            user_id: u.id
          ]
        ]
      )
      |> Repo.update_all([])
    end)
  end

  defp down_credentials_schema do
    table = "credentials"

    drop_pkey_constraint(table)

    alter table(table) do
      remove(:id)
      remove(:user_id)
    end

    rename_column(table, :old_id, :id)
    rename_column(table, :old_user_id, :user_id)

    alter table(table) do
      modify(:user_id, :bigint, null: false)
      modify(:id, :bigint, null: false)
    end

    create_id_pk(table)
    make_col_foreign_key(table, "user_id", "users")

    table
    |> unique_index([:user_id, :source])
    |> create()
  end

  defp up_experience_schema do
    :data_definitions
    |> constraint(:data_definitions_experience_id_fkey)
    |> drop()

    :entries
    |> constraint(:entries_exp_id_fkey)
    |> drop()

    table = "experiences"

    table
    |> index([:user_id])
    |> drop()

    table
    |> index([:user_id, :title])
    |> drop()

    table
    |> index([:client_id, :user_id])
    |> drop()

    drop_pkey_constraint(table)
    rename_column(table, :id, :old_id)
    rename_column(table, :user_id, :old_user_id)

    alter table(table) do
      modify(:old_user_id, :bigint, null: true)
      modify(:old_id, :bigint, null: true)
      add(:id, :binary_id)
      add(:user_id, :binary_id)
    end
  end

  defp up_experiences_data() do
    from(
      e in "experiences",
      select: e.old_id
    )
    |> Repo.all()
    |> Enum.map(fn old_id ->
      from(
        e in "experiences",
        where: e.old_id == ^old_id,
        join: u in "users",
        on: e.old_user_id == u.old_id,
        update: [
          set: [
            id: ^ulid_id(),
            user_id: u.id
          ]
        ]
      )
      |> Repo.update_all([])
    end)
  end

  defp up_create_experiences_index do
    table = "experiences"

    table
    |> index([:user_id])
    |> create()

    table
    |> unique_index([:user_id, :title])
    |> create()

    table
    |> unique_index([:client_id, :user_id])
    |> create()
  end

  defp down_experience_schema do
    :data_definitions
    |> constraint(:data_definitions_experience_id_fkey)
    |> drop()

    :entries
    |> constraint(:entries_experience_id_fkey)
    |> drop()

    table = "experiences"

    table
    |> index([:user_id, :title])
    |> drop()

    table
    |> index([:client_id, :user_id])
    |> drop()

    drop_pkey_constraint(table)

    alter table(table) do
      remove(:id)
      remove(:user_id)
    end

    rename_column(table, :old_id, :id)
    rename_column(table, :old_user_id, :user_id)

    alter table(table) do
      modify(:user_id, :bigint, null: false)
      modify(:id, :bigint, null: false)
    end

    table
    |> index([:user_id])
    |> create()

    table
    |> index([:user_id, :title])
    |> create()

    table
    |> index([:client_id, :user_id])
    |> create()

    create_id_pk(table)
    make_col_foreign_key(table, "user_id", "users")
  end

  defp up_entries_schema do
    :data_objects
    |> constraint(:data_objects_entry_id_fkey)
    |> drop()

    table = "entries"

    table
    |> index([:client_id, :exp_id])
    |> drop()

    table
    |> index([:exp_id])
    |> drop()

    drop_pkey_constraint(table)
    rename_column(table, :id, :old_id)
    rename_column(table, :exp_id, :old_experience_id)

    alter table(table) do
      add(:id, :binary_id)
      add(:experience_id, :binary_id)
      modify(:old_id, :bigint, null: true)
      modify(:old_experience_id, :bigint, null: true)
    end
  end

  defp up_entries_data do
    from(
      e in "entries",
      select: e.old_id
    )
    |> Repo.all()
    |> Enum.map(fn old_id ->
      from(
        e in "entries",
        where: e.old_id == ^old_id,
        join: ex in "experiences",
        on: e.old_experience_id == ex.old_id,
        update: [
          set: [
            id: ^ulid_id(),
            experience_id: ex.id
          ]
        ]
      )
      |> Repo.update_all([])
    end)
  end

  defp up_create_entries_index do
    table = "entries"

    table
    |> unique_index([:client_id, :experience_id])
    |> create()

    table
    |> index([:experience_id])
    |> create()
  end

  defp down_entries_schema do
    :data_objects
    |> constraint(:data_objects_entry_id_fkey)
    |> drop()

    table = "entries"

    table
    |> unique_index([:client_id, :experience_id])
    |> drop()

    table
    |> index([:experience_id])
    |> drop()

    drop_pkey_constraint(table)

    alter table(table) do
      remove(:id)
      remove(:experience_id)
    end

    rename_column(table, :old_id, :id)
    rename_column(table, :old_experience_id, :exp_id)

    alter table(table) do
      modify(:id, :bigint, null: false)
      modify(:exp_id, :bigint, null: false)
    end

    create_id_pk(table)
    make_col_foreign_key(table, "exp_id", "experiences")

    table
    |> unique_index([:client_id, :exp_id])
    |> create()

    table
    |> index([:exp_id])
    |> create()
  end

  defp up_definitions_schema do
    :data_objects
    |> constraint(:data_objects_definition_id_fkey)
    |> drop()

    table = "data_definitions"

    drop_pkey_constraint(table)

    table
    |> index([:name, :experience_id])
    |> drop()

    table
    |> index([:experience_id])
    |> drop()

    rename_column(table, :id, :old_id)
    rename_column(table, :experience_id, :old_experience_id)

    alter table(table) do
      add(:id, :binary_id)
      add(:experience_id, :binary_id)
      modify(:old_id, :binary_id, null: true)
      modify(:old_experience_id, :bigint, null: true)
    end
  end

  defp up_definitions_data do
    from(
      d in "data_definitions",
      select: d.old_id
    )
    |> Repo.all()
    |> Enum.map(fn old_id ->
      #    old_id = Ecto.UUID.cast!(old_id)

      from(
        d in "data_definitions",
        where: d.old_id == ^old_id,
        join: e in "experiences",
        on: d.old_experience_id == e.old_id,
        update: [
          set: [
            id: ^ulid_id(),
            experience_id: e.id
          ]
        ]
      )
      |> Repo.update_all([])
    end)
  end

  defp up_definitions_index do
    table = "data_definitions"

    table
    |> unique_index([:name, :experience_id])
    |> create()

    table
    |> index([:experience_id])
    |> create()
  end

  defp down_definitions_schema do
    :data_objects
    |> constraint(:data_objects_definition_id_fkey)
    |> drop()

    table = "data_definitions"

    drop_pkey_constraint(table)

    table
    |> index([:name, :experience_id])
    |> drop()

    table
    |> index([:experience_id])
    |> drop()

    alter table(table) do
      remove(:id)
      remove(:experience_id)
    end

    rename_column(table, :old_id, :id)
    rename_column(table, :old_experience_id, :experience_id)

    alter table(table) do
      modify(:id, :binary_id, null: false)
      modify(:experience_id, :bigint, null: false)
    end

    create_id_pk(table)
    make_col_foreign_key(table, "experience_id", "experiences")

    table
    |> unique_index([:name, :experience_id])
    |> create()

    table
    |> index([:experience_id])
    |> create()
  end

  defp up_data_objects_schema do
    table = "data_objects"

    drop_pkey_constraint(table)

    table
    |> index([:entry_id, :definition_id])
    |> drop()

    table
    |> index([:definition_id])
    |> drop()

    table
    |> index([:entry_id])
    |> drop()

    rename_column(table, :id, :old_id)
    rename_column(table, :definition_id, :old_definition_id)
    rename_column(table, :entry_id, :old_entry_id)

    alter table(table) do
      add(:id, :binary_id)
      add(:definition_id, :binary_id)
      add(:entry_id, :binary_id)
      modify(:old_id, :binary_id, null: true)
      modify(:old_definition_id, :binary_id, null: true)
      modify(:old_entry_id, :bigint, null: true)
    end
  end

  defp up_data_objects_data do
    from(
      d in "data_objects",
      select: d.old_id
    )
    |> Repo.all()
    |> Enum.map(fn old_id ->
      # old_id = Ecto.UUID.cast!(old_id)

      from(
        d in "data_objects",
        where: d.old_id == ^old_id,
        join: dd in "data_definitions",
        on: d.old_definition_id == dd.old_id,
        join: e in "entries",
        on: d.old_entry_id == e.old_id,
        update: [
          set: [
            id: ^ulid_id(),
            definition_id: dd.id,
            entry_id: e.id
          ]
        ]
      )
      |> Repo.update_all([])
    end)
  end

  defp up_data_objects_index do
    table = "data_objects"

    table
    |> unique_index([:entry_id, :definition_id])
    |> create()

    table
    |> index([:definition_id])
    |> create()

    table
    |> index([:entry_id])
    |> create()
  end

  defp down_data_objects_schema do
    table = "data_objects"

    drop_pkey_constraint(table)

    table
    |> index([:entry_id, :definition_id])
    |> drop()

    table
    |> index([:definition_id])
    |> drop()

    table
    |> index([:entry_id])
    |> drop()

    alter table(table) do
      remove(:id)
      remove(:definition_id)
      remove(:entry_id)
    end

    rename_column(table, :old_id, :id)
    rename_column(table, :old_definition_id, :definition_id)
    rename_column(table, :old_entry_id, :entry_id)

    alter table(table) do
      modify(:id, :binary_id, null: false)
      modify(:definition_id, :binary_id, null: false)
      modify(:entry_id, :bigint, null: false)
    end

    table
    |> unique_index([:entry_id, :definition_id])
    |> create()

    table
    |> index([:definition_id])
    |> create()

    table
    |> index([:entry_id])
    |> create()

    make_col_foreign_key(table, "definition_id", "data_definitions")
    make_col_foreign_key(table, "entry_id", "entries")
    create_id_pk(table)
  end

  defp rename_column(table, from_col, to_col) do
    table
    |> table()
    |> rename(from_col, to: to_col)
  end

  defp ulid_id() do
    Ecto.ULID.bingenerate()
  end

  defp drop_pkey_constraint(table) do
    table
    |> constraint("#{table}_pkey")
    |> drop()
  end

  defp create_id_pk(table) do
    execute("ALTER TABLE #{table} ADD PRIMARY KEY (id)")
  end

  defp make_bin_col_not_null(table, col \\ :id) do
    alter table(table) do
      modify(col, :binary_id, null: false)
    end
  end

  defp make_col_foreign_key(table, col, ref_table, ref_col \\ "id") do
    execute("""
      ALTER TABLE #{table}
      ADD CONSTRAINT #{table}_#{col}_fkey
      FOREIGN KEY (#{col})
      REFERENCES #{ref_table} (#{ref_col})
      ON DELETE CASCADE
    """)
  end
end
