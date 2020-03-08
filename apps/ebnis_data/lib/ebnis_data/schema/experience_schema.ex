defmodule EbnisData.Schema.Experience do
  use Absinthe.Schema.Notation
  use Absinthe.Relay.Schema.Notation, :modern

  import Absinthe.Resolution.Helpers, only: [dataloader: 1]

  alias EbnisData.Resolver.ExperienceResolver

  ################################ START ENUMS SECTION ##################

  @desc "The possible data type that can be defined for an experience"
  enum :data_types do
    value(:single_line_text, as: "single_line_text")
    value(:multi_line_text, as: "multi_line_text")
    value(:integer, as: "integer")

    value(:decimal, as: "decimal")
    value(:date, as: "date")
    value(:datetime, as: "datetime")
  end

  ###################### END ENUM SECTION ###########################

  @desc ~S"""
    All errors related to entry.dataObject creation/update in one field as
    compared to dataObjectError (which will soon be deprecated in favour of this
    field
  """
  object :data_object_error do
    field(:meta, non_null(:data_object_error_meta))

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
  object :data_object_errors do
    field(:errors, non_null(:data_object_error))
  end

  @desc ~S"""
    Response on successful entry or data object update
  """
  object :data_object_success do
    field(:data_object, non_null(:data_object))
  end

  @desc ~S"""
    On data object update, we will return either DataObjectSuccess or
    or DataObjectErrors
  """
  union :update_data_object_union do
    types([:data_object_success, :data_object_errors])
    resolve_type(&ExperienceResolver.update_data_object_union/2)
  end

  union :update_entry_union do
    types([:update_entry_errors, :update_entry_some_success])
    resolve_type(&ExperienceResolver.update_entry_union/2)
  end

  object :update_entry_errors do
    field(:errors, non_null(:update_entry_error))
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

  @desc """
      An entry data object
  """
  object :data_object do
    field(:id, non_null(:id))

    @desc ~S"""
      Client ID indicates that data object was created offline
    """
    field(:client_id, :id)

    field(:data, non_null(:data_json))
    field(:definition_id, non_null(:id))

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

  @desc """
    Experience schema. Uses relay.
  """
  object :experience do
    @desc "The title of the experience"
    field(:id, non_null(:id))
    field(:title, non_null(:string))

    @desc "The description of the experience"
    field(:description, :string)

    @desc ~S"""
      The client ID. For experiences created on the client while server is
      offline and to be saved , the client ID uniquely identifies such and can
      be used to enforce uniqueness at the DB level. Not providing client_id
      assumes a fresh experience.
    """
    field(:client_id, :id)

    @desc "The field definitions used for the experience entries"
    field(
      :data_definitions,
      :data_definition
      |> non_null()
      |> list_of()
      |> non_null()
    )

    @desc "The entries of the experience - can be paginated"
    field :entries, :entry_connection |> non_null() do
      arg(:pagination, non_null(:pagination_input))

      resolve(&ExperienceResolver.entries/3)
    end

    field(:inserted_at, non_null(:datetime))
    field(:updated_at, non_null(:datetime))
    field(:has_unsaved, :boolean)
  end

  @desc "An Experience data definition Field"
  object :data_definition do
    field(:id, non_null(:id))

    @desc "Name of field e.g start, end, meal "
    field(:name, non_null(:string))

    @desc ~S"""
      String that uniquely identifies this data definition has been
      created offline. If an associated entry is also created
      offline, then `dataDefinition.definitionId` **MUST BE** the same as this
      field and will be validated as such.
    """
    field(:client_id, :id)

    @desc "The data type"
    field(:type, non_null(:data_types))

    field(:inserted_at, non_null(:datetime))
    field(:updated_at, non_null(:datetime))
  end

  object :experience_success do
    field(:experience, non_null(:experience))

    field(
      :entries_errors,
      :create_entry_error
      |> non_null()
      |> list_of()
    )
  end

  object :create_entry_success do
    field(:entry, non_null(:entry))
  end

  object :data_object_error_meta do
    field(:index, non_null(:integer))
    field(:id, :id)
    field(:client_id, :string)
  end

  object :create_entry_error_meta do
    field(:experience_id, non_null(:id))
    field(:index, non_null(:integer))
    field(:client_id, :id)
  end

  object :create_entry_error do
    field(:meta, non_null(:create_entry_error_meta))

    @desc ~S"""
      Did we fail because there are errors in the data object object?
    """
    field(:data_objects, list_of(:data_object_error))

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
    field(:error, :string)
  end

  object :create_entry_errors do
    field(:errors, non_null(:create_entry_error))
  end

  union :create_entry_union do
    types([:create_entry_success, :create_entry_errors])
    resolve_type(&ExperienceResolver.create_entry_union/2)
  end

  object :create_definition_errors do
    field(:index, non_null(:integer))

    @desc """
      name taken by another definition for the experience or name too short?
    """
    field(:name, :string)

    @desc """
      Using unapproved data type or data can not be cast to type?
    """
    field(:type, :string)
  end

  @desc """
    Experience field errors during creation
  """
  object :create_experience_error do
    field(:meta, non_null(:create_experience_error_meta))
    field(:title, :string)
    field(:data_definitions, list_of(:create_definition_errors))
    field(:user, :string)
    field(:client_id, :string)

    @desc ~S"""
      A catch all for error unrelated to fields of experience e.g. an exception
      was raised
    """
    field(:error, :string)
  end

  object :create_experience_error_meta do
    @desc ~S"""
      The index of the failing experience in the list of experiences input
    """
    field(:index, non_null(:integer))
    field(:client_id, :string)
  end

  object :create_experience_errors do
    field(:errors, non_null(:create_experience_error))
  end

  union :create_experience_union do
    types([:experience_success, :create_experience_errors])
    resolve_type(&ExperienceResolver.create_experience_union/2)
  end

  object :definition_success do
    field(:definition, non_null(:data_definition))
  end

  object :definition_error do
    @desc ~S"""
      ID of the definition that failed
    """
    field(:id, non_null(:id))

    @desc ~S"""
      The name of the definition is not unique or less than minimum char
      length
    """
    field(:name, :string)

    @desc ~S"""
      The type is not in the list of allowed data types
    """
    field(:type, :string)

    @desc """
      May be we can't find the definition during an update
    """
    field(:error, :string)
  end

  object :definition_errors do
    field(:errors, non_null(:definition_error))
  end

  union :update_definition do
    types([:definition_success, :definition_errors])
    resolve_type(&ExperienceResolver.update_definition_union/2)
  end

  object :experience_own_fields do
    field(:title, non_null(:string))
    field(:description, :string)
  end

  object :experience_own_fields_success do
    field(:data, non_null(:experience_own_fields))
  end

  object :update_experience_own_fields_error do
    field(:title, non_null(:string))
  end

  object :update_experience_own_fields_errors do
    field(:errors, non_null(:update_experience_own_fields_error))
  end

  union :update_experience_own_fields_union do
    types([:experience_own_fields_success, :update_experience_own_fields_errors])
    resolve_type(&ExperienceResolver.update_experience_own_fields_union/2)
  end

  object :entry_success do
    field(:entry, non_null(:entry))
  end

  object :delete_entry_error do
    field(:id, non_null(:id))

    @desc ~S"""
      This will mostly be 'not found error'
    """
    field(:error, non_null(:string))
  end

  object :delete_entry_errors do
    field(:errors, non_null(:delete_entry_error))
  end

  union :delete_entry_union do
    types([:entry_success, :delete_entry_errors])
    resolve_type(&ExperienceResolver.delete_entry_union/2)
  end

  object :update_experience do
    field(:experience_id, non_null(:id))
    field(:updated_at, non_null(:datetime))
    field(:own_fields, :update_experience_own_fields_union)

    field(
      :updated_definitions,
      :update_definition
      |> non_null()
      |> list_of()
    )

    field(
      :updated_entries,
      :update_entry_union
      |> non_null()
      |> list_of()
    )

    field(
      :new_entries,
      :create_entry_union
      |> non_null()
      |> list_of()
    )

    field(
      :deleted_entries,
      :delete_entry_union
      |> non_null()
      |> list_of()
    )
  end

  object :update_experience_some_success do
    field(:experience, non_null(:update_experience))
  end

  object :update_experience_error do
    field(:experience_id, non_null(:id))

    @desc ~S"""
    This will mostly be experience not found error
    """
    field(:error, non_null(:string))
  end

  object :update_experience_errors do
    field(:errors, non_null(:update_experience_error))
  end

  union :update_experience_union do
    types([:update_experience_some_success, :update_experience_errors])
    resolve_type(&ExperienceResolver.update_experience_union/2)
  end

  object :update_experiences_some_success do
    field(
      :experiences,
      :update_experience_union
      |> non_null()
      |> list_of()
      |> non_null()
    )
  end

  object :update_experiences_all_fail do
    @desc ~S"""
      This will mostly be authorization error
    """
    field(:error, non_null(:string))
  end

  union :update_experiences do
    types([:update_experiences_some_success, :update_experiences_all_fail])
    resolve_type(&ExperienceResolver.update_experiences_union/2)
  end

  ################## delete experiences objects section ###########

  object :delete_experience_success do
    field(:experience, non_null(:experience))
  end

  object :delete_experience_error do
    field(:id, non_null(:id))
    field(:error, non_null(:string))
  end

  object :delete_experience_errors do
    field(:errors, non_null(:delete_experience_error))
  end

  union :delete_experience_union do
    types([:delete_experience_success, :delete_experience_errors])
    resolve_type(&ExperienceResolver.delete_experience_union/2)
  end

  object :delete_experiences_some_success do
    field(
      :experiences,
      :delete_experience_union
      |> non_null()
      |> list_of()
      |> non_null()
    )
  end

  object :delete_experiences_all_fail do
    @desc ~S"""
      This will mostly be authorization error
    """
    field(:error, non_null(:string))
  end

  union :delete_experiences do
    types([:delete_experiences_some_success, :delete_experiences_all_fail])
    resolve_type(&ExperienceResolver.delete_experiences_union/2)
  end

  ################# end delete experiences objects section #######

  ######################### END REGULAR OBJECTS ###########################

  ############################ START INPUT OBJECTS SECTION ####################

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

  input_object :create_entry_input do
    @desc """
      The entry data object for the experience entry
    """
    field(
      :data_objects,
      :create_data_object
      |> non_null()
      |> list_of()
      |> non_null()
    )

    @desc ~S"""
      If the experience ID is specified, then it must match either
      entry.experience.id or entry.experience.clientId
    """
    field(:experience_id, :id)

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

  @desc "Variables for defining field while defining a new experience"
  input_object :create_data_definition do
    field(:name, non_null(:string))
    field(:type, non_null(:data_types))

    @desc ~S"""
      String that uniquely identifies this field definition has been
      created offline. If an associated entry is also created
      offline, then `dataDefinition.definitionId` **MUST BE** the same as this
      field and will be validated as such.
    """
    field(:client_id, :id)
  end

  @desc """
    Input object for defining a new Experience
  """
  input_object :create_experience_input do
    field(:title, non_null(:string))
    field(:description, :string)

    field(
      :data_definitions,
      :create_data_definition
      |> list_of()
      |> non_null()
    )

    @desc ~S"""
      Uniquely identifies and signifies an experience has been created offline.
      This will be used to prevent offline save conflict.
    """
    field(:client_id, :id)

    @desc "If experience is created on the client, it might include timestamps"
    field(:inserted_at, :datetime)
    field(:updated_at, :datetime)

    @desc ~S"""
      One may define an experience and create associated entries simultaneously
      if for instance on the client while backend is offline. Special care
      must be taken to ensure the entry.experienceId == experience.clientId
      otherwise the entry will fail to save.
    """
    field(:entries, :create_entry_input |> list_of())
  end

  input_object :get_experiences_input do
    @desc ~S"""
      Optionally paginate the experiences
    """
    field(:pagination, :pagination_input)

    @desc ~S"""
      Optionally filter by IDs
    """
    field(:ids, list_of(:id))
  end

  @desc """
    fields required to update an experience data definition
  """
  input_object :update_definition_input do
    @desc ~S"""
     The ID of the data definition to be modified
    """
    field(:id, non_null(:id))

    @desc """
      Well the essence of updating the definition is to rename it. So if you
      are not renaming the definition, please do not update the definition!
    """
    field(:name, non_null(:string))

    @desc """
      If the update was done offline, then it's proper to allow the update
      date assigned offline.
    """
    field(:updated_at, :datetime)
  end

  @desc ~S"
    Input variables for updating own fields of an experience as opposed to
    objects owned by the experience e.g. dataDefinition, entry
  "
  input_object :update_experience_own_fields_input do
    field(:title, :string)
    field(:description, :string)
  end

  @desc ~S"""
    Input variables for updating an experience
  """
  input_object :update_experience_input do
    field(:experience_id, non_null(:id))

    field(:own_fields, :update_experience_own_fields_input)

    field(
      :update_definitions,
      :update_definition_input
      |> non_null()
      |> list_of()
    )

    field(
      :update_entries,
      :update_entry_input
      |> non_null()
      |> list_of()
    )

    field(
      :add_entries,
      :create_entry_input
      |> non_null()
      |> list_of()
    )

    field(
      :delete_entries,
      :id
      |> non_null()
      |> list_of()
    )
  end

  ######################### END INPUT OBJECTS SECTION ##################

  ######################### MUTATION SECTION #######################

  @desc """
    Mutations allowed on Experience object
  """
  object :experience_mutations do
    @desc ~S"""
      Delete several experiences
    """
    field :delete_experiences, :delete_experiences do
      arg(
        :input,
        :id
        |> non_null()
        |> list_of()
        |> non_null()
      )

      resolve(&ExperienceResolver.delete_experiences/2)
    end

    @desc ~S"""
      Update several experiences at once
    """
    field :update_experiences, :update_experiences do
      arg(
        :input,
        :update_experience_input
        |> non_null()
        |> list_of()
        |> non_null()
      )

      resolve(&ExperienceResolver.update_experiences/2)
    end

    @desc "Create many experiences"
    field :create_experiences,
          :create_experience_union
          |> non_null()
          |> list_of do
      arg(:input, :create_experience_input |> list_of() |> non_null())

      resolve(&ExperienceResolver.create_experiences/2)
    end
  end

  ######################### END MUTATIONS SECTION ############

  ######################### QUERIES SECTION #############################

  @desc """
    Queries allowed on Experience object
  """
  object :experience_queries do
    @desc """

      Get an experience
    """
    field :get_experience, :experience do
      arg(:id, non_null(:id))

      resolve(&ExperienceResolver.get_experience/2)
    end

    @desc ~S"""
      Get all experiences belonging to a user.
      The experiences returned may be paginated
      and may be filtered by IDs
    """
    connection field(:get_experiences, node_type: :experience) do
      arg(:input, :get_experiences_input)
      resolve(&ExperienceResolver.get_experiences/2)
    end
  end

  ######################### END QUERIES SECTION ##########################

  connection(node_type: :experience)
  connection(node_type: :entry)
end
