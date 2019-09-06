defmodule EbnisData.Repo.Migrations.UlidIds do
  use Ecto.Migration

  def up do
    alter table(:users) do
      add(:old_id, :integer)
      add(:temp_id, :binary_id)
    end

    :users
    |> unique_index([:temp_id])
    |> create()

    alter table(:credentials) do
      add(:old_id, :integer)
      add(:temp_id, :binary_id)

      add(
        :user_temp_id,
        references(
          :users,
          column: :temp_id,
          type: :binary_id,
          on_delete: :delete_all
        )
      )
    end

    :credentials
    |> constraint(:credentials_user_id_fkey)
    |> drop()

    alter table(:experiences) do
      add(:old_id, :integer)
      add(:temp_id, :binary_id)

      add(
        :user_temp_id,
        references(
          :users,
          on_delete: :delete_all,
          type: :binary_id,
          column: :temp_id
        )
      )
    end

    :experiences
    |> unique_index([:temp_id])
    |> create()

    :experiences
    |> constraint("experiences_user_id_fkey")
    |> drop()

    alter table(:entries) do
      add(:old_id, :integer)
      add(:temp_id, :binary_id)

      add(
        :experience_id,
        references(
          :experiences,
          type: :binary_id,
          column: :temp_id,
          on_delete: :delete_all
        )
      )
    end

    :entries
    |> unique_index([:temp_id])
    |> create()

    :entries
    |> constraint("entries_exp_id_fkey")
    |> drop()

    :entries
    |> index([:client_id, :exp_id])
    |> drop()

    alter table(:data_definitions) do
      add(:old_id, :uuid)
      add(:temp_id, :binary_id)

      add(
        :temp_experience_id,
        references(
          :experiences,
          type: :binary_id,
          column: :temp_id,
          on_delete: :delete_all
        )
      )
    end

    :data_definitions
    |> unique_index([:temp_id])
    |> create()

    :data_definitions
    |> index([:name, :experience_id])
    |> drop()

    :data_definitions
    |> constraint("data_definitions_experience_id_fkey")
    |> drop()

    alter table(:data_objects) do
      add(:old_id, :uuid)
      add(:temp_id, :binary_id)

      add(
        :temp_definition_id,
        references(
          :data_definitions,
          type: :binary_id,
          column: :temp_id,
          on_delete: :delete_all
        )
      )

      add(
        :temp_entry_id,
        references(
          :entries,
          type: :binary_id,
          column: :temp_id,
          on_delete: :delete_all
        )
      )
    end

    :data_objects
    |> constraint("data_objects_definition_id_fkey")
    |> drop()

    :data_objects
    |> constraint("data_objects_entry_id_fkey")
    |> drop()

    :data_objects
    |> index([:entry_id, :definition_id])
    |> drop()

    flush()
    gen_temp_ids()
  end

  def down do
    alter table(:data_objects) do
      remove(:old_id)
      remove(:temp_id)
      remove(:temp_definition_id)
      remove(:temp_entry_id)
    end

    execute(
      "ALTER TABLE data_objects ADD CONSTRAINT data_objects_definition_id_fkey FOREIGN KEY (definition_id) REFERENCES data_definitions (id) ON DELETE CASCADE"
    )

    execute(
      "ALTER TABLE data_objects ADD CONSTRAINT data_objects_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE"
    )

    :data_objects
    |> unique_index([:entry_id, :definition_id])
    |> create()

    alter table(:data_definitions) do
      remove(:old_id)
      remove(:temp_id)
      remove(:temp_experience_id)
    end

    execute(
      "ALTER TABLE data_definitions ADD CONSTRAINT data_definitions_experience_id_fkey FOREIGN KEY (experience_id) REFERENCES experiences(id) ON DELETE CASCADE"
    )

    :data_definitions
    |> unique_index([:name, :experience_id])
    |> create()

    alter table(:entries) do
      remove(:old_id)
      remove(:temp_id)
      remove(:experience_id)
    end

    execute(
      "ALTER TABLE entries ADD CONSTRAINT entries_exp_id_fkey FOREIGN KEY (exp_id) REFERENCES experiences(id) ON DELETE CASCADE"
    )

    :entries
    |> unique_index([:client_id, :exp_id])
    |> create()

    alter table(:experiences) do
      remove(:old_id)
      remove(:temp_id)
      remove(:user_temp_id)
    end

    execute(
      "ALTER TABLE experiences ADD CONSTRAINT experiences_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"
    )

    alter table(:credentials) do
      remove(:old_id)
      remove(:temp_id)
      remove(:user_temp_id)
    end

    execute(
      "ALTER TABLE credentials ADD CONSTRAINT credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"
    )

    alter table(:users) do
      remove(:old_id)
      remove(:temp_id)
    end
  end

  defp gen_temp_ids do
    import Ecto.Query
    alias EbnisData.Repo

    {:ok, _} =
      Repo.transaction(fn ->
        [
          "users",
          "credentials",
          "experiences",
          "entries",
          "data_definitions",
          "data_objects"
        ]
        |> Enum.map(fn table ->
          table
          |> select([m], m.id)
          |> Repo.all()
          |> Enum.map(fn id ->
            set = [temp_id: ulid_id(), old_id: id]

            from(
              m in table,
              where: m.id == ^id,
              update: [set: ^update]
            )
            |> Repo.update_all([])
          end)
        end)
      end)
  end

  defp ulid_id() do
    Ecto.ULID.bingenerate()
  end
end
