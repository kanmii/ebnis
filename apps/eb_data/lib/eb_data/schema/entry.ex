defmodule EbData.Schema.Entry do
  use Absinthe.Schema.Notation
  use Absinthe.Relay.Schema.Notation, :modern

  alias EbData.Resolver.Entry, as: Resolver

  @desc "An entry field"
  object :field do
    field(:def_id, non_null(:id))
    field(:data, non_null(:entry_field_json))
  end

  @desc "An Experience entry that supports relay"
  node object(:entry) do
    @desc "Internal ID of the schema. Field `id` is the global opaque ID"
    field(
      :_id,
      non_null(:id),
      resolve: &EbData.Resolver.resolve_internal_id/3
    )

    @desc ~S"""
      The ID of experience to which this entry belongs.
    """
    field(:exp_id, non_null(:id))

    @desc ~S"""
      The client ID which indicates that an entry has been created while server
      is offline and is to be saved with the server, the client ID uniquely
      identifies this entry and will be used prevent conflict while saving entry
      created while server offline.
    """
    field(:client_id, :id)

    @desc "The experience object to which this entry belongs"
    field :exp, non_null(:experience) do
      resolve(&Resolver.exp/3)
    end

    @desc "The data fields belonging to this entry"
    field(:fields, :field |> list_of() |> non_null())

    field(:inserted_at, non_null(:iso_datetime))
    field(:updated_at, non_null(:iso_datetime))
  end

  object :create_entries_error do
    @desc ~S"""
      The client ID of the entry which fails to save
    """
    field(:client_id, non_null(:string))

    @desc ~S"""
      The failure error
    """
    field(:error, non_null(:string))

    @desc ~S"""
      The experience ID of the entry which fails to save
    """
    field(:experience_id, non_null(:string))
  end

  @desc ~S"""
    Data structure returned when creating multiple entries simultaneously.

    It looks like so:
    `typescript
    {
      successes?: [
        {
          expId: string;
          entries: Entry[]
        }
      ],

      failures?: [
        {
          clientId: string;
          error: string
        }
      ]
    }
    `

    The inserts that succeed go into the `successes` field while those that fail
    go into `failures` field. Each field is an array of maps with a key `index` which maps to the index of the object in user's input from which we attempted to create the entry. The `index` is so that user knows how to map
    from the response we returned to the input the user supplied.

    In addition, we only get `successes` field if at least one input succeeds
    and we only get `failures` field if at least one input fails
  """
  object :create_entries_response do
    field(:experience_id, non_null(:id))

    @desc ~S"""
      The entries that were successfully inserted
    """
    field(:entries, :entry |> list_of() |> non_null())

    @desc ~S"""
      List of error objects denoting entries that fail to insert
    """
    field(:errors, :create_entries_error |> list_of())
  end

  object :experience_id_to_entry_connection do
    field(:exp_id, non_null(:id))
    field(:entry_connection, :entry_connection |> non_null())
  end

  object :entry_field_error do
    field(:def_id, :id)
    field(:data, :string)
  end

  object :entry_field_error_meta do
    field(:def_id, non_null(:id))
    field(:error, :entry_field_error)
  end

  object :entry_update_returned do
    field(:entry, :entry)
    field(:fields_errors, list_of(:entry_field_error_meta))
  end

  ############################## INPUTS #######################################

  @desc ~S"""
    Variables for creating an entry field

    It is of the form:
    {
      defId: string;
      data: JSON_string;
    }

    The `defId` key comes from experience to which this entry is associated and
    using this `defId`, we will retrieve the associated field definition for
    each field so as to ensure that we are storing valid JSON string data for
    the field. For instance, if user submits a field with JSON string data:
        {date: "2016-05-10"}
    and defId:
        field_definition_id_10000
    but when we query the experience for field definition id
    `field_definition_id_10000`, it tells us it should be associated with an
    integer data, then we will return error with explanation `invalid data type`
    for this field.
  """
  input_object :create_field do
    @desc ~S"""
      The experience definition ID for which the experience data is to be
      generated. If the associated experience of this entry has been created
      offline, then this field **MUST BE THE SAME** as `createField.clientId`
      and will be rejected if not.
    """
    field(:def_id, non_null(:id))

    @desc ~S"""
      The data of this entry. It is a JSON string of the form:

      ```json
        {date: '2017-01-01'}
        {integer: 4}
      ```
    """
    field(:data, non_null(:entry_field_json))
  end

  @desc "Variables for creating an experience entry"
  input_object :create_entry_input do
    @desc ~S"""
      The global ID of the experience or if the associated
      experience has been created offline, then this must be the same as the
      `experience.clientId` and will be enforced as such.
    """
    field(:exp_id, non_null(:id))

    @desc "fields making up the experience entry"
    field(:fields, :create_field |> list_of() |> non_null())

    @desc ~S"""
      Client id for entries created while server is offline and to be saved.
    """
    field(:client_id, :id)

    @desc "If entry is created on the client, it might include timestamps"
    field(:inserted_at, :iso_datetime)
    field(:updated_at, :iso_datetime)
  end

  @desc "Variables for updating an experience entry"
  input_object :update_entry_input do
    @desc ~S"""
        The ID of entry to be updated
    """

    field(:id, non_null(:id))

    @desc "fields making up the experience entry"
    field(:fields, :create_field |> list_of() |> non_null())
  end

  ############################# END INPUTS ##################################

  ################### mutations #########################################

  @desc "Mutations allowed on Experience entry object"
  object :entry_mutation do
    @desc ~S"""
      Create an experience

      The error returned will be of the form:
      {
        expId?: "does not exist",
        fields?: [
          {
            meta: {
              defId: defId,
              index: fieldIndex
            },
            errors: {
              defId: "does not exist" | "has already been taken"
            }
          }
        ]
      }
    """
    field :create_entry, :entry do
      arg(:input, non_null(:create_entry_input))

      resolve(&Resolver.create/3)
    end

    @desc ~S"""
      Create several entries, for several experiences
    """
    field :create_entries, list_of(:create_entries_response) do
      arg(:create_entries, :create_entry_input |> list_of() |> non_null())

      resolve(&Resolver.create_entries/2)
    end

    field :update_entry, :entry_update_returned do
      arg(:input, non_null(:update_entry_input))

      resolve(&Resolver.update_entry/2)
    end

    field :delete_entry, :entry do
      arg(:id, non_null(:id))

      resolve(&Resolver.delete_entry/2)
    end
  end

  ################### END MUTATIONS #########################################

  ################### QUERIES #########################################

  connection(node_type: :entry)
end
