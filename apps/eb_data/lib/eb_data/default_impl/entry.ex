defmodule EbData.DefaultImpl.Entry do
  use Ecto.Schema, warn: true

  import Ecto.Changeset

  alias Ecto.Changeset
  alias EbData.DefaultImpl.Experience
  alias EbData.DefaultImpl.Field
  alias EbData.DefaultImpl

  @moduledoc ~S"""
    For the changeset - when we are inserting an entry. The attribute expected
    is of the form:
      %{
        exp_id: :the_id_of_the_experience,
        user_id: :the_owner_of_the_experience,
        fields: [
          %{
            def_id: the_field_definition_id_from_field_def_child_of_experience,
            data: %{date: ~D[]} or %{:single_line_text: "some short text"}, etc
          }
        ]
      }
  """

  @timestamps_opts [type: :utc_datetime]
  schema "entries" do
    belongs_to(:exp, Experience)
    embeds_many(:fields, Field)

    timestamps()
  end

  @doc "changeset"
  def changeset(%__MODULE__{} = schema, %{} = attrs) do
    schema
    |> cast(attrs, [:exp_id])
    |> cast_embed(:fields, required: true)
    |> validate_required([:exp_id, :fields])
  end

  @doc "changeset_one"
  def changeset_one(%__MODULE__{} = schema, %{} = attrs) do
    changes = changeset(schema, attrs)

    validate_fields_for_one(changes, attrs.exp_id, attrs.user_id)
  end

  defp validate_fields_for_one(%Changeset{valid?: false} = changeset, _, _) do
    changeset
  end

  defp validate_fields_for_one(
         %Changeset{changes: changes} = changeset,
         exp_id,
         user_id
       ) do
    case get_field_defs(exp_id, user_id) do
      {:error, nil} ->
        add_error(changeset, :exp_id, "does not exist", validation: :assoc)

      map_of_id_type_from_exp_field_defs ->
        put_change(
          changeset,
          :fields,
          validate_fields(map_of_id_type_from_exp_field_defs, changes.fields)
        )
    end
  end

  @spec validate_fields_for_many(
          changesets :: [%Changeset{}],
          exp_id :: binary(),
          user_id :: binary()
        ) ::
          {[{Map.t(), Integer.t()}], [{{:error, %Changeset{}}, Integer.t()}]}
  def validate_fields_for_many(
        changesets,
        exp_id,
        user_id
      ) do
    {valid_changesets_with_indices, non_valid_changesets_with_indices, _} =
      Enum.reduce(
        changesets,
        {[], [], 0},
        &separate_valid_from_non_valid_changesets/2
      )

    case get_field_defs(exp_id, user_id) do
      {:error, nil} ->
        entries_with_errors =
          Enum.reduce(
            valid_changesets_with_indices,
            non_valid_changesets_with_indices,
            fn {changeset, index}, acc ->
              [
                {
                  {
                    :error,
                    add_error(
                      changeset,
                      :exp_id,
                      "does not exist",
                      validation: :assoc
                    )
                  },
                  index
                }
                | acc
              ]
            end
          )

        {[], entries_with_errors}

      map_of_id_type_from_exp_field_defs ->
        now =
          DateTime.utc_now()
          |> DateTime.truncate(:second)

        entries_to_insert =
          Enum.map(
            valid_changesets_with_indices,
            fn {changeset, index} ->
              fields_structs =
                validate_fields(
                  map_of_id_type_from_exp_field_defs,
                  changeset.changes.fields
                )
                |> Enum.map(fn field_changeset ->
                  changes = field_changeset.changes
                  struct(Field, changes)
                end)

              {
                Map.merge(
                  changeset.changes,
                  %{
                    fields: fields_structs,
                    # we will update the changeset with timestamps because
                    # we will be using Repo.insert_all which does not
                    # autogenerate timestamps
                    inserted_at: now,
                    updated_at: now
                  }
                ),
                index
              }
            end
          )

        {entries_to_insert, non_valid_changesets_with_indices}
    end
  end

  # In this function, we validate that
  # 1. that all field.def_id exist as field_def.id on the experience struct
  # otherwise: add error :def_id, "does not exist", validation: :assoc
  # 2. that every field.def_id is unique. Otherwise:
  # add error :def_id, "has already been taken", validation: :uniqueness
  # 3. that the data in the field is corresponds to the data type in the field
  # definition otherwise add error "invalid data type"
  defp validate_fields(
         map_of_id_type_from_exp_field_defs,
         fields_changesets
       ) do
    {fields_changesets, _} =
      Enum.reduce(
        fields_changesets,
        {[], []},
        fn field_changeset, {fields_changesets_acc, def_ids} ->
          def_id = field_changeset.changes.def_id

          [data_type | _] = Map.keys(field_changeset.changes.data)

          new_changeset =
            cond do
              map_of_id_type_from_exp_field_defs[def_id] == nil ->
                add_error(
                  field_changeset,
                  :def_id,
                  "does not exist",
                  validation: :assoc
                )

              Enum.member?(def_ids, def_id) ->
                add_error(
                  field_changeset,
                  :def_id,
                  "has already been taken",
                  validation: :uniqueness
                )

              map_of_id_type_from_exp_field_defs[def_id] != data_type ->
                add_error(
                  field_changeset,
                  :def_id,
                  "invalid data type"
                )

              true ->
                field_changeset
            end

          {[new_changeset | fields_changesets_acc], [def_id | def_ids]}
        end
      )

    Enum.reverse(fields_changesets)
  end

  defp get_field_defs(exp_id, user_id) do
    case DefaultImpl.get_exp_field_defs(exp_id, user_id) do
      nil ->
        {:error, nil}

      field_defs ->
        # make a mapping from field definition id to field type
        # %{"field_id_1" => "integer", "field_id_2" => "single_line_text"}

        Enum.reduce(
          field_defs,
          %{},
          &Map.put(&2, &1.id, &1.type)
        )
    end
  end

  defp separate_valid_from_non_valid_changesets(
         changeset,
         {
           valid_changesets,
           non_valid_changesets,
           index
         }
       ) do
    case changeset.valid? do
      true ->
        {
          [{changeset, index} | valid_changesets],
          non_valid_changesets,
          index + 1
        }

      false ->
        {
          valid_changesets,
          [{{:error, changeset}, index} | non_valid_changesets],
          index + 1
        }
    end
  end
end
