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

  defp validate_fields_for_one(%Changeset{} = changeset, exp_id, user_id) do
    case get_field_definition_info_from_exp(exp_id, user_id) do
      {:error, nil} ->
        add_exp_does_not_exist_error_to_changeset(changeset)

      field_id_to_type_mappings ->
        put_change(
          changeset,
          :fields,
          validate_fields(field_id_to_type_mappings, changeset.changes.fields)
        )
    end
  end

  defp add_exp_does_not_exist_error_to_changeset(changeset) do
    add_error(changeset, :exp_id, "does not exist", validation: :assoc)
  end

  @spec changeset_many(
          changesets :: [%Changeset{}],
          exp_id :: binary(),
          user_id :: binary()
        ) ::
          {[{Map.t(), Integer.t()}], [{{:error, %Changeset{}}, Integer.t()}]}
  def changeset_many(changesets, exp_id, user_id) do
    {valid_changesets_with_indices, non_valid_changesets_with_indices, _} =
      Enum.reduce(
        changesets,
        {[], [], 0},
        &separate_valid_from_non_valid_changesets/2
      )

    case get_field_definition_info_from_exp(exp_id, user_id) do
      {:error, nil} ->
        entries_with_errors =
          Enum.reduce(
            valid_changesets_with_indices,
            non_valid_changesets_with_indices,
            &reduce_add_errors_to_all_changesets_with_indices/2
          )

        {[], entries_with_errors}

      field_id_to_type_mappings ->
        {
          valid_changesets_with_indices,
          more_non_valid_changesets_with_indices
        } =
          Enum.reduce(
            valid_changesets_with_indices,
            {[], []},
            &reduce_separate_changesets_with_indices_with_field_errors(
              &1,
              &2,
              field_id_to_type_mappings
            )
          )

        now =
          DateTime.utc_now()
          |> DateTime.truncate(:second)

        entries_to_insert =
          Enum.map(
            valid_changesets_with_indices,
            &map_valid_changesets_with_indices_to_insert_data(&1, now)
          )

        {
          entries_to_insert,
          Enum.concat(
            non_valid_changesets_with_indices,
            more_non_valid_changesets_with_indices
          )
        }
    end
  end

  # In this function, we validate that
  # 1. all field.def_id exist as field_def.id on the experience struct
  # otherwise: add error :def_id, "does not exist", validation: :assoc
  # 2. every field.def_id is unique. Otherwise:
  # add error :def_id, "has already been taken", validation: :uniqueness
  # 3. the data in the field corresponds to the data type in the field
  # definition otherwise add error "invalid data type"
  # 4. every field definition in experience has corresponding entry in user
  # supplied field. E.g. if field definition is of the form:
  #   [
  #     %{def_id: "1", type: "integer"},
  #     %{def_id: "2", type: "decimal"}
  #   ]
  # but user supplied:
  #   [
  #     %{def_id: "2", type: "decimal"}
  #   ]
  # notice that:
  #   %{def_id: "1", type: "integer"},
  # is missing in user supplied value
  # Thus we will create a field changeset and set data to blank so that it
  # errors
  defp validate_fields(
         map_of_id_type_from_exp_field_defs,
         fields_changesets
       ) do
    {fields_changesets, user_field_def_ids} =
      Enum.reduce(
        # represents list of all fields that will be used to create an entry
        fields_changesets,
        {[], []},
        fn field_changeset, {fields_changesets_acc, user_field_def_ids} ->
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

              Enum.member?(user_field_def_ids, def_id) ->
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

          {
            [new_changeset | fields_changesets_acc],
            [def_id | user_field_def_ids]
          }
        end
      )

    fields_missing_from_definitions =
      Enum.reduce(
        map_of_id_type_from_exp_field_defs,
        [],
        fn {def_id, _type}, acc ->
          case Enum.member?(user_field_def_ids, def_id) do
            true ->
              acc

            _ ->
              [Field.changeset(%Field{}, %{def_id: def_id}) | acc]
          end
        end
      )

    fields_changesets
    |> Enum.reverse()
    |> Enum.concat(fields_missing_from_definitions)
  end

  defp get_field_definition_info_from_exp(exp_id, user_id) do
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
         {valid_changesets, non_valid_changesets, index}
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

  defp reduce_add_errors_to_all_changesets_with_indices({changeset, index}, acc) do
    [
      {{:error, add_exp_does_not_exist_error_to_changeset(changeset)}, index} | acc
    ]
  end

  defp reduce_separate_changesets_with_indices_with_field_errors(
         {changeset, index},
         {valid_changesets, non_valid_changesets},
         field_id_to_type_mappings
       ) do
    fields_changesets =
      validate_fields(
        field_id_to_type_mappings,
        changeset.changes.fields
      )

    no_field_changeset_with_error? =
      Enum.reduce(fields_changesets, true, fn
        %{valid?: true}, true ->
          true

        _, _ ->
          false
      end)

    case no_field_changeset_with_error? do
      true ->
        {[{changeset, index} | valid_changesets], non_valid_changesets}

      _ ->
        changeset_with_error = {
          :error,
          put_change(changeset, :fields, fields_changesets)
        }

        {
          valid_changesets,
          [{changeset_with_error, index} | non_valid_changesets]
        }
    end
  end

  defp map_valid_changesets_with_indices_to_insert_data(
         {changeset, index},
         now
       ) do
    fields_structs =
      Enum.map(
        changeset.changes.fields,
        &struct(Field, &1.changes)
      )

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
end
