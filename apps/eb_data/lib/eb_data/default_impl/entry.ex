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
    field(:client_id, :string)
    belongs_to(:exp, Experience)
    embeds_many(:fields, Field)

    timestamps()
  end

  @doc "changeset"
  def changeset(%__MODULE__{} = schema, %{} = attrs) do
    schema
    |> changeset_cast_attrs(attrs)
    |> cast_embed(:fields, required: true)
    |> validate_required([:exp_id, :fields])
    |> unique_constraint(
      :client_id,
      name: :entries_client_id_exp_id_index
    )
  end

  @doc "changeset_cast_attrs"
  def changeset_cast_attrs(%__MODULE__{} = schema, %{} = attrs) do
    schema
    |> cast(attrs, [
      :exp_id,
      :client_id,
      :inserted_at,
      :updated_at
    ])
  end

  @doc "changeset_one"
  def changeset_one(%__MODULE__{} = schema, %{} = attrs) do
    changes = changeset(schema, attrs)

    validate_fields(changes, attrs.exp_id, attrs.user_id)
  end

  @spec changeset_many(
          changesets :: [%Changeset{}],
          exp_id :: binary(),
          user_id :: binary()
        ) ::
          {[Map.t()], [%Changeset{}]}
  def changeset_many(
        changesets,
        exp_id,
        user_id
      ) do
    case DefaultImpl.get_exp_field_defs(exp_id, user_id) do
      nil ->
        entries_with_errors =
          Enum.reduce(
            changesets,
            [],
            &[add_exp_does_not_exist_error(&1) | &2]
          )

        {[], entries_with_errors}

      field_defs ->
        {
          valid_changesets,
          non_valid_changesets
        } =
          Enum.reduce(
            changesets,
            {[], []},
            &changesets_validate_fields(&1, &2, field_defs)
          )

        timestamp = DateTime.truncate(DateTime.utc_now(), :second)

        entries_to_insert =
          Enum.map(
            valid_changesets,
            &map_changeset_to_insert_data(&1, timestamp)
          )

        {entries_to_insert, non_valid_changesets}
    end
  end

  defp validate_fields(%Changeset{valid?: false} = changeset, _, _) do
    changeset
  end

  defp validate_fields(%Changeset{} = changeset, exp_id, user_id) do
    case DefaultImpl.get_exp_field_defs(exp_id, user_id) do
      nil ->
        add_exp_does_not_exist_error(changeset)

      field_defs ->
        put_change(
          changeset,
          :fields,
          fields_valid_normal_experience?(
            field_defs,
            changeset.changes.fields
          )
        )
    end
  end

  # In this function, we validate that
  # 1. all field.def_id exist as field_def.id on the experience struct
  # otherwise: add error def id not exist error
  # 2. every field.def_id is unique. Otherwise:
  # add error def id not unique error
  # 3. the data in the field corresponds to the data type in the field
  # definition otherwise add invalid data type error
  # 4. every field definition in experience has corresponding entry in user
  # supplied field (missing field). E.g. if field definition is of the form:
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

  defp fields_valid_normal_experience?(
         field_defs,
         fields_changesets
       ) do
    {definition_id_to_type_map, definition_ids} =
      Enum.reduce(
        field_defs,
        {%{}, []},
        fn field_def, {map, definition_ids} ->
          id = field_def.id
          {Map.put(map, id, field_def.type), [id | definition_ids]}
        end
      )

    {fields_changesets, fields_def_ids} =
      Enum.reduce(
        # represents list of all fields that will be used to create an entry
        fields_changesets,
        {[], []},
        fn field_changeset, {fields_changesets_acc, fields_def_ids} ->
          def_id = field_changeset.changes.def_id

          [data_type | _] = Map.keys(field_changeset.changes.data)

          modified_changeset =
            cond do
              definition_id_to_type_map[def_id] == nil ->
                add_def_id_does_not_exist_error(field_changeset)

              Enum.member?(fields_def_ids, def_id) ->
                add_def_id_unique_error(field_changeset)

              definition_id_to_type_map[def_id] != data_type ->
                add_invalid_data_type_error(field_changeset)

              true ->
                field_changeset
            end

          fields_changesets_acc = [modified_changeset | fields_changesets_acc]
          {fields_changesets_acc, [def_id | fields_def_ids]}
        end
      )

    not_in_definitions =
      get_fields_missing_from_definitions(
        definition_ids,
        fields_def_ids
      )

    fields_changesets
    |> Enum.reverse()
    |> Enum.concat(not_in_definitions)
  end

  defp fields_valid_offline_experience?(
         fields,
         field_definitions
       ) do
    {client_id_to_definition_map, client_ids} =
      Enum.reduce(
        field_definitions,
        {%{}, []},
        fn field_def, {map, client_ids} ->
          client_id = field_def.client_id
          {Map.put(map, client_id, field_def), [client_id | client_ids]}
        end
      )

    {valid_fields, invalid_changesets, fields_def_ids} =
      Enum.reduce(
        fields,
        {[], [], []},
        fn field, {valid_fields, invalid_changesets, fields_def_ids} ->
          client_id = field.def_id
          definition = client_id_to_definition_map[client_id]
          [data_type | _] = Map.keys(field.data)

          case definition do
            %{id: def_id, type: type} ->
              struct_or_changeset =
                cond do
                  Enum.member?(fields_def_ids, client_id) ->
                    add_def_id_unique_error(field)

                  type != data_type ->
                    add_invalid_data_type_error(field)

                  true ->
                    field_struct =
                      struct!(
                        Field,
                        Map.put(field, :def_id, def_id)
                      )

                    field_struct
                end

              fields_def_ids = [client_id | fields_def_ids]

              case struct_or_changeset do
                %Field{} ->
                  valid_fields = [struct_or_changeset | valid_fields]
                  {valid_fields, invalid_changesets, fields_def_ids}

                changeset ->
                  invalid_changesets = [changeset | invalid_changesets]
                  {valid_fields, invalid_changesets, fields_def_ids}
              end

            nil ->
              changeset = add_def_id_does_not_exist_error(field)
              invalid_changesets = [changeset | invalid_changesets]
              {valid_fields, invalid_changesets, fields_def_ids}
          end
        end
      )

    not_in_definitions =
      get_fields_missing_from_definitions(
        client_ids,
        fields_def_ids
      )

    {valid_fields, Enum.concat(not_in_definitions, invalid_changesets)}
  end

  defp get_fields_missing_from_definitions(_definition_ids, []) do
    []
  end

  defp get_fields_missing_from_definitions(definition_ids, fields_def_ids) do
    Enum.reduce(
      definition_ids,
      [],
      &field_missing_from_definitions?(&1, &2, fields_def_ids)
    )
  end

  defp field_missing_from_definitions?(def_id, acc, fields_def_ids) do
    case Enum.member?(fields_def_ids, def_id) do
      true ->
        acc

      _ ->
        # by not adding data, we will get back changeset error
        changeset = Field.changeset(%Field{}, %{def_id: def_id})

        changeset =
          case Ecto.UUID.dump(def_id) do
            :error ->
              put_def_id_in_field_error_changeset(changeset, def_id)

            _ ->
              changeset
          end

        [changeset | acc]
    end
  end

  defp changesets_validate_fields(
         changeset,
         {valid_changesets, non_valid_changesets},
         definition_id_type_map
       ) do
    fields_changesets =
      fields_valid_normal_experience?(
        definition_id_type_map,
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
        {[changeset | valid_changesets], non_valid_changesets}

      _ ->
        changeset_with_error = put_change(changeset, :fields, fields_changesets)

        {valid_changesets, [changeset_with_error | non_valid_changesets]}
    end
  end

  defp map_changeset_to_insert_data(changeset, timestamp) do
    fields_structs =
      Enum.map(
        changeset.changes.fields,
        &struct(Field, &1.changes)
      )

    Map.merge(
      changeset.changes,
      %{
        fields: fields_structs,
        # we will update the changeset with timestamps because
        # we will be using Repo.insert_all which does not
        # autogenerate timestamps
        inserted_at: timestamp,
        updated_at: timestamp
      }
    )
  end

  def save_offline_experience_validate_entries(entries, experience) do
    experience_client_id = experience.client_id
    field_defs = experience.field_defs
    %{id: experience_id, user_id: user_id} = experience

    {valid_entries, rejected_changesets, _} =
      Enum.reduce(
        entries,
        {[], [], []},
        &save_offline_experience_validate_entry(
          &1,
          &2,
          {experience_client_id, field_defs, experience_id, user_id}
        )
      )

    {valid_entries, rejected_changesets}
  end

  defp save_offline_experience_validate_entry(
         entry,
         {accepted_entries, rejected_changesets, client_ids},
         {experience_client_id, field_defs, experience_id, user_id}
       ) do
    client_id = entry.client_id

    cond do
      entry.exp_id != experience_client_id ->
        changeset = add_exp_id_differs_from_client_id_error(entry)
        {accepted_entries, [changeset | rejected_changesets], client_ids}

      Enum.member?(client_ids, client_id) ->
        changeset =
          changeset_cast_attrs(
            %__MODULE__{},
            update_entry_with_numeric_experience_id(entry)
          )
          |> put_change(:exp_id, entry.exp_id)
          |> add_client_id_not_unique_error()

        {accepted_entries, [changeset | rejected_changesets], client_ids}

      true ->
        client_ids = [client_id | client_ids]

        {valid_fields, invalid_fields_changesets} =
          fields_valid_offline_experience?(
            entry.fields,
            field_defs
          )

        case invalid_fields_changesets do
          [] ->
            accepted_entry =
              Map.merge(entry, %{
                user_id: user_id,
                exp_id: experience_id,
                fields: Enum.map(valid_fields, &Map.from_struct/1)
              })

            accepted_entries = [accepted_entry | accepted_entries]
            {accepted_entries, rejected_changesets, client_ids}

          fields_changesets ->
            changeset =
              save_offline_experience_update_entry_with_field_errors(
                entry,
                fields_changesets
              )

            {accepted_entries, [changeset | rejected_changesets], client_ids}
        end
    end
  end

  defp save_offline_experience_update_entry_with_field_errors(
         entry,
         fields_changesets
       ) do
    %__MODULE__{}
    |> changeset_cast_attrs(update_entry_with_numeric_experience_id(entry))
    |> put_change(:exp_id, entry.exp_id)
    |> put_change(:fields, fields_changesets)
  end

  defp update_entry_with_numeric_experience_id(entry) do
    # the entry.exp_id that comes with offline experience is the offline
    # experience.client_id which may be non numeric, but when casting, exp_id
    # is expected to be numeric. So we change the exp_id to 1 (just a random
    # numeric number) so as not to get exp_id cast validation error
    Map.put(entry, :exp_id, 1)
  end

  defp add_exp_does_not_exist_error(changeset) do
    add_error(changeset, :exp_id, "does not exist", validation: :assoc)
  end

  def add_exp_id_differs_from_client_id_error(%{} = entry) do
    changeset = changeset_cast_attrs(%__MODULE__{}, entry)

    changeset_with_errors =
      add_error(
        changeset,
        :exp_id,
        "must be the same as offline experience client id",
        validation: :assoc
      )

    errors =
      remove_field_cast_validation_error(
        :exp_id,
        changeset_with_errors.errors
      )

    Map.put(changeset_with_errors, :errors, errors)
  end

  def add_client_id_not_unique_error(changeset) do
    add_error(
      changeset,
      :client_id,
      "has already been taken",
      validation: :unique
    )
  end

  defp add_def_id_does_not_exist_error(%Changeset{} = changeset) do
    add_error(changeset, :def_id, "does not exist", validation: :assoc)
  end

  defp add_def_id_does_not_exist_error(field) do
    %Field{}
    |> Field.changeset(field)
    |> add_error(
      :def_id,
      "differs from offline experience field definition client id",
      validation: :assoc
    )
    |> put_def_id_in_field_error_changeset(field.def_id)
  end

  defp add_def_id_unique_error(%Changeset{} = changeset) do
    add_error(
      changeset,
      :def_id,
      "has already been taken",
      validation: :uniqueness
    )
  end

  defp add_def_id_unique_error(field) do
    %Field{}
    |> Field.changeset(field)
    |> add_error(
      :def_id,
      "has already been taken",
      validation: :uniqueness
    )
    |> put_def_id_in_field_error_changeset(field.def_id)
  end

  defp add_invalid_data_type_error(%Changeset{} = changeset) do
    add_error(changeset, :def_id, "invalid data type")
  end

  defp add_invalid_data_type_error(field) do
    %Field{}
    |> Field.changeset(field)
    |> add_error(:def_id, "invalid data type")
    |> put_def_id_in_field_error_changeset(field.def_id)
  end

  defp put_def_id_in_field_error_changeset(changeset, def_id) do
    errors = remove_field_cast_validation_error(:def_id, changeset.errors)

    # we put the def_id into the changes because it would not have survived
    # cast, but it's needed in error reporting
    changeset = put_change(changeset, :def_id, def_id)

    Map.put(changeset, :errors, errors)
  end

  defp remove_field_cast_validation_error(field, errors) do
    Enum.reduce(errors, [], fn
      {^field, {_, [type: _, validation: :cast]}}, acc ->
        acc

      other, acc ->
        [other | acc]
    end)
  end
end
