defmodule EbnisData.Schema.Entry do
  use Absinthe.Schema.Notation
  use Absinthe.Relay.Schema.Notation, :modern

  import Absinthe.Resolution.Helpers, only: [dataloader: 1]

  alias EbnisData.Resolver.EntryResolver

  @desc """
      An entry data object
  """
  object :data_object do
    field(:id, non_null(:id))
    field(:data, non_null(:data_json))
    field(:definition_id, non_null(:id))

    @desc ~S"""
      Client ID indicates that data object was created offline
    """
    field(:client_id, :id)

    field(:inserted_at, non_null(:datetime))
    field(:updated_at, non_null(:datetime))
  end

  @desc """
    An Experience entry that supports relay
  """
  object :entry do
    @desc "Entry ID"
    field(:id, non_null(:id))

    @desc ~S"""
      The ID of experience to which this entry belongs.
    """
    field(:experience_id, non_null(:id))

    @desc ~S"""
      The client ID which indicates that an entry has been created while server
      is offline and is to be saved. The client ID uniquely
      identifies this entry and will be used to prevent conflict while saving entry
      created offline and must thus be non null in this situation.
    """
    field(:client_id, :id)

    @desc """
      The experience object to which this entry belongs
    """
    field(
      :experience,
      non_null(:experience),
      resolve: dataloader(:data)
    )

    @desc """
      The list of data belonging to this entry.
    """
    field(
      :data_objects,
      :data_object
      |> list_of()
      |> non_null()
    )

    field(:inserted_at, non_null(:datetime))
    field(:updated_at, non_null(:datetime))

    @desc ~S"""
      Indicates whether entry has been modified offline, in which case this
      property will be true, otherwise it will be falsy
    """
    field(:mod_offline, :boolean)
  end

  @desc ~S"""
    Entry data object error (errors field) while creating an entry
  """
  object :data_object_error do
    field(:definition, :string)
    field(:definition_id, :string)
    field(:data, :string)
  end

  @desc ~S"""
    Entry data object errors while creating an entry
  """
  object :data_objects_errors do
    field(:client_id, :string)
    field(:index, non_null(:integer))
    field(:errors, non_null(:data_object_error))
  end

  @desc ~S"""
    Object returned when entry created
  """
  object :create_entry_response do
    field(:entry, :entry)
    field(:errors, :create_entry_errors)
  end

  object :create_entry_errors do
    @desc ~S"""
      Did we fail because there are errors in the data object object?
    """
    field(:data_objects_errors, list_of(:data_objects_errors))

    @desc ~S"""
      Did we fail because, say, we did could not fetch the experience
    """
    field(:experience, :string)

    @desc ~S"""
      An offline entry of offline experience must have its experience ID same as
      experience.clientId.
    """
    field(:experience_id, :string)

    @desc ~S"""
      May be we failed because entry.clientId is already taken by another
      entry belonging to the experience.
    """
    field(:client_id, :string)

    @desc ~S"""
      A catch-all field for when we are unable to create an entry
    """
    field(:entry, :string)
  end

  @desc ~S"""
    Error object returned if we are creating multiple entries simultaneously.
    This will be returned by a single entry which fails to save.
  """
  object :create_entries_errors do
    @desc ~S"""
      The client ID of the entry which fails to save
    """
    field(:client_id, non_null(:string))

    @desc ~S"""
      The experience ID of the entry which fails to save
    """
    field(:experience_id, non_null(:string))

    field(:errors, non_null(:create_entry_errors))
  end

  object :create_entries_response do
    @desc ~S"""
      Experience ID of an entry we are trying to create
    """
    field(:experience_id, non_null(:id))

    @desc ~S"""
      The entries that were successfully inserted for a particular
      experience ID
    """
    field(:entries, :entry |> list_of() |> non_null())

    @desc ~S"""
      List of error objects denoting entries that fail to insert for
      a particular experience ID
    """
    field(:errors, :create_entries_errors |> list_of())
  end

  object :update_data_object_response do
    field(:data_object, :data_object)
    field(:errors, :data_object_error)
  end

  object :update_data_objects_response do
    @desc ~S"""
      The index of the data object in the list of data objects
    """
    field(:index, non_null(:integer))

    @desc ~S"""
      The ID of data object to be updated
    """
    field(:id, non_null(:id))

    @desc ~S"""
      If we are successful, then user gets back this object representing
      successful update
    """
    field(:data_object, :data_object)

    @desc ~S"""
      Represents errors relating to the fields of the data object
    """
    field(:field_errors, :data_object_error)

    @desc ~S"""
      For errors unrelated to the fields of the data object (e.g. we
      could not find the subject in the DB)
    """
    field(:string_error, :string)
  end

  @desc ~S"""
    All errors related to entry.dataObject creation/update in one field as
    compared to dataObjectError (which will soon be deprecated in favour of this
    field
  """
  object :data_object_full_error do
    field(:id, non_null(:id))
    field(:definition, :string)
    field(:definition_id, :string)
    field(:client_id, :string)

    @desc ~S"""
      Error related to the data e.g. a string was supplied for a decimal field.
    """
    field(:data, :string)

    @desc ~S"""
      For generic errors unrelated to the fields of the data object e.g.
      not found error
    """
    field(:error, :string)
  end

  @desc ~S"""
    Errors response on data object update - used in graphql union
  """
  object :data_object_full_errors do
    field(:errors, non_null(:data_object_full_error))
  end

  @desc ~S"""
    Response on successful entry or data object update
  """
  object :data_object_success do
    field(:data_object, non_null(:data_object))
  end

  @desc ~S"""
    On data object update, we will return either DataObjectSuccess or
    or DataObjectFullErrors
  """
  union :update_data_object_union do
    types([:data_object_success, :data_object_full_errors])
    resolve_type(&EntryResolver.update_data_object_union/2)
  end

  @desc ~S"""
    Returned when updating several entries
  """
  union :update_entries_union do
    types([:update_entries_some_success, :update_entries_all_fail])
    resolve_type(&EntryResolver.update_entries_union/2)
  end

  @desc ~S"""
    When none of the entries to be updated succeeds e.g. because of
    authorization error
  """
  object :update_entries_all_fail do
    field(:error, non_null(:string))
  end

  @desc ~S"""
    When updating entries, there is at least one success
  """
  object :update_entries_some_success do
    field(
      :entries,
      :update_entry_union
      |> non_null()
      |> list_of()
      |> non_null()
    )
  end

  union :update_entry_union do
    types([:update_entry_errors, :update_entry_some_success])
    resolve_type(&EntryResolver.update_entry_union/2)
  end

  object :update_entry_errors do
    field(:errors, :update_entry_error)
  end

  @desc ~S"""
    If when updating an entry, the entry is not found in the DB, there is no
    point taking a look at its data objects. We return this error to indicate
    such failure
  """
  object :update_entry_error do
    field(:entry_id, non_null(:id))
    field(:error, non_null(:string))
  end

  @desc ~S"""
    If at least one data object member of an entry can be updated, then this
    is the response sent
  """
  object :update_entry_some_success do
    field(:entry, non_null(:update_entry))
  end

  @desc ~S"""
    Response sent after entry is updated.
  """
  object :update_entry do
    field(:entry_id, non_null(:id))

    field(
      :data_objects,
      :update_data_object_union
      |> non_null()
      |> list_of()
      |> non_null()
    )

    @desc ~S"""
      If any entry data objects is updated, then the entry itself will
      be updated to the latest dataObject.updatedAt
    """
    field(:updated_at, :datetime)
  end

  ############################# END OBJECTS SECTION #############

  ############################# INPUTS SECTION #######################

  @desc ~S"""
    Variables for creating an entry field
  """
  input_object :create_data_object do
    @desc ~S"""
      The experience definition ID for which the experience data is to be
      generated. If the associated experience of this entry has been created
      offline, then this field **MUST BE THE SAME** as
      `createEntryData.clientId` and will be rejected if not.
    """
    field(:definition_id, non_null(:id))

    @desc ~S"""
      The data of this entry. It is a JSON string of the form:

      ```json
        {date: '2017-01-01'}
        {integer: 4}
      ```
    """
    field(:data, non_null(:data_json))

    @desc ~S"""
      Indicates that data object was created offline
    """
    field(:client_id, :id)

    @desc """
      If data objects is created on the client, it might include timestamps
    """
    field(:inserted_at, :datetime)
    field(:updated_at, :datetime)
  end

  @desc """
    Variables for creating an experience entry
  """
  input_object :create_entry_input do
    @desc ~S"""
      The ID of the experience or if the associated
      experience has been created offline, then this must be the same as the
      `experience.clientId` and will be enforced as such.
    """
    field(:experience_id, non_null(:id))

    @desc """
      The entry data object for the experience entry
    """
    field(
      :data_objects,
      :create_data_object
      |> list_of()
      |> non_null()
    )

    @desc ~S"""
      Client id for entries created while server is offline and to be saved.
    """
    field(:client_id, :id)

    @desc """
      If entry is created on the client, it might include timestamps
    """
    field(:inserted_at, :datetime)
    field(:updated_at, :datetime)
  end

  input_object :create_entries_input do
    @desc ~S"""
      The ID of the experience or if the associated
      experience has been created offline, then this must be the same as the
      `experience.clientId` and will be enforced as such.
    """
    field(:experience_id, non_null(:id))

    @desc """
      The entry data object for the experience entry
    """
    field(
      :data_objects,
      :create_data_object
      |> list_of()
      |> non_null()
    )

    @desc ~S"""
      Unlike the `clientId` of `createEntryInput`, this field must not be
      null as it serves as the identifier for the entry in the list of
      entries to be created
    """
    field(:client_id, non_null(:id))

    @desc """
      If entry is created on the client, it might include timestamps
    """
    field(:inserted_at, :datetime)
    field(:updated_at, :datetime)
  end

  input_object :update_data_object_input do
    @desc ~S"""
      The ID of the data object we wish to update
    """
    field(:id, non_null(:id))

    @desc ~S"""
      The data object of the new value. It is of the form:

      ```json
        {"integer":1}
      ```
    """
    field(:data, non_null(:data_json))

    @desc """
      If updated offline, it might include timestamps
    """
    field(:updated_at, :datetime)
  end

  @desc ~S"""
    An input object for updating an entry when updating several entries at once
  """
  input_object :update_entry_input do
    field(:entry_id, non_null(:id))

    field(
      :data_objects,
      :update_data_object_input
      |> non_null()
      |> list_of()
      |> non_null()
    )
  end

  ############################# END INPUTS SECTION #######################

  ################### MUTATIONS #########################################

  @desc """
    Mutations allowed on Experience entry object
  """
  object :entry_mutations do
    @desc ~S"""
      Create an experience entry
    """
    field :create_entry, :create_entry_response do
      arg(:input, non_null(:create_entry_input))

      resolve(&EntryResolver.create/2)
    end

    @desc ~S"""
      Create several entries, for one or more experiences
    """
    field :create_entries, list_of(:create_entries_response) do
      arg(:input, :create_entries_input |> list_of() |> non_null())

      resolve(&EntryResolver.create_entries/2)
    end

    @desc ~S"""
      Delete an entry
    """
    field :delete_entry, :entry do
      arg(:id, non_null(:id))

      resolve(&EntryResolver.delete/2)
    end

    @desc ~S"""
      Update an entry data object
    """

    field :update_data_object, :update_data_object_response do
      arg(:input, non_null(:update_data_object_input))

      resolve(&EntryResolver.update_data_object/2)
    end

    @desc ~S"""
      Update several data objects at once - prefer using this for data objects
      belonging to same entry as it will be easier to deal with
    """
    field :update_data_objects, list_of(:update_data_objects_response) do
      arg(
        :input,
        :update_data_object_input
        |> non_null()
        |> list_of()
        |> non_null()
      )

      resolve(&EntryResolver.update_data_objects/2)
    end

    @desc ~S"""
      Update several entries at once
    """
    field :update_entries, :update_entries_union do
      arg(
        :input,
        :update_entry_input
        |> non_null()
        |> list_of()
        |> non_null()
      )

      resolve(&EntryResolver.update_entries/2)
    end
  end

  ################### END MUTATIONS #########################################

  connection(node_type: :entry)
end
