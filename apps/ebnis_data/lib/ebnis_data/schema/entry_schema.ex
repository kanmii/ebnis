defmodule EbnisData.Schema.Entry do
  use Absinthe.Schema.Notation
  use Absinthe.Relay.Schema.Notation, :modern

  import Absinthe.Resolution.Helpers, only: [dataloader: 1]

  alias EbnisData.Resolver.EntryResolver
  alias EbnisData.Resolver

  @desc """
      An entry data object
  """
  object :data_object do
    field(:id, non_null(:id))
    field(:data, non_null(:entry_field_json))
    field(:definition_id, non_null(:id))
  end

  @desc """
    An Experience entry that supports relay
  """
  node object(:entry) do
    @desc ~S"""
      The ID of experience to which this entry belongs.
    """
    field :experience_id, non_null(:id) do
      resolve(fn root, _, _ ->
        {
          :ok,
          root.exp_id
          |> Resolver.convert_to_global_id(:experience)
        }
      end)
    end

    @desc ~S"""
      The client ID which indicates that an entry has been created while server
      is offline and is to be saved. The client ID uniquely
      identifies this entry and will be used prevent conflict while saving entry
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

    field(:inserted_at, non_null(:iso_datetime))
    field(:updated_at, non_null(:iso_datetime))
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
      While saving an offline entry, its experience ID must be same as
      experience.clientId if saving entry via offline experience
    """
    field(:experience_id, :string)

    @desc ~S"""
      May be because client ID is not unique for experience
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

  ############################# END OBJECTS ##################################

  ############################# INPUTS ##################################

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
    field(:data, non_null(:entry_field_json))
  end

  @desc """
    Variables for creating an experience entry
  """
  input_object :create_entry_input do
    @desc ~S"""
      The global ID of the experience or if the associated
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
    field(:inserted_at, :iso_datetime)
    field(:updated_at, :iso_datetime)
  end

  input_object :create_entries_input do
    @desc ~S"""
      The global ID of the experience or if the associated
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
    field(:inserted_at, :iso_datetime)
    field(:updated_at, :iso_datetime)
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
    field(:data, non_null(:entry_field_json))
  end

  ############################# END INPUTS ##################################

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
  end

  ################### END MUTATIONS #########################################

  connection(node_type: :entry)
end
