defmodule EbnisData.Repo.Migrations.CommentsTables do
  use Ecto.Migration

  def change do
    create table(:comments, primary_key: false) do
      add(
        :id,
        :binary_id,
        null: false,
        primary_key: true
      )

      add(
        :text,
        :citext,
        null: false
      )

      timestamps()
    end

    create table("experiences_comments_xref", primary_key: false) do
      add(
        :id,
        :binary_id,
        null: false,
        primary_key: true
      )

      add(
        :experience_id,
        references(
          :experiences,
          type: :binary_id,
          on_delete: :delete_all
        )
      )

      add(
        :comment_id,
        references(
          :comments,
          type: :binary_id,
          on_delete: :delete_all
        )
      )
    end

    create table("entries_comments_xref", primary_key: false) do
      add(
        :id,
        :binary_id,
        null: false,
        primary_key: true
      )

      add(
        :entry_id,
        references(
          :entries,
          type: :binary_id,
          on_delete: :delete_all
        )
      )

      add(
        :comment_id,
        references(
          :comments,
          type: :binary_id,
          on_delete: :delete_all
        )
      )
    end
  end
end
