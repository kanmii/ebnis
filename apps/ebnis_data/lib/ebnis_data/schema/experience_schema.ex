defmodule EbnisData.Schema.Experience do
  use Absinthe.Schema.Notation
  use Absinthe.Relay.Schema.Notation, :modern

  alias EbnisData.Resolver.ExperienceResolver

  ################################ START ENUMS ##########################

  @desc "The possible field type that can be defined for an experience"
  enum :field_type do
    value(:single_line_text, as: "single_line_text")
    value(:multi_line_text, as: "multi_line_text")
    value(:integer, as: "integer")

    value(:decimal, as: "decimal")
    value(:date, as: "date")
    value(:datetime, as: "datetime")
  end

  ###################### END ENUM ########################################

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
      |> list_of()
      |> non_null()
    )

    @desc "The entries of the experience - can be paginated"
    field :entries, :entry_connection |> non_null() do
      arg(:pagination, non_null(:pagination_input))

      resolve(&ExperienceResolver.entries/3)
    end

    field(:inserted_at, non_null(:iso_datetime))
    field(:updated_at, non_null(:iso_datetime))
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

    @desc "The data type of the field"
    field(:type, non_null(:field_type))

    field(:inserted_at, non_null(:iso_datetime))
    field(:updated_at, non_null(:iso_datetime))
  end

  @desc """
    Error object returned if data definition refuses to save.
  """
  object :data_definition_error do
    field(:name, :string)
    field(:type, :string)

    @desc """
      May be we can't find the definition during an update
    """
    field(:definition, :string)
  end

  @desc """
    Experience field errors during creation
  """
  object :create_experience_errors do
    field(:title, :string)
    field(:data_definitions_errors, list_of(:data_definition_errors))
    field(:user, :string)
    field(:client_id, :string)
  end

  object :data_definition_errors do
    field(:index, non_null(:integer))
    field(:errors, non_null(:data_definition_error))
  end

  @desc """
    Object returned on experience creation
  """
  object :create_experience_return_value do
    field(:experience, :experience)
    field(:errors, :create_experience_errors)
  end

  object :create_offline_experience_errors do
    @desc ~S"""
      The error object representing the insert failure reasons
    """
    field(:errors, non_null(:create_experience_errors))

    @desc ~S"""
      The index of the failing experience in the list of experiences input
    """
    field(:index, non_null(:integer))

    @desc ~S"""
      The client ID of the failing experience. As user may not have provided a
      client ID, this field is nullable and in that case, the index field will
      be used to identify this error
    """
    field(:client_id, non_null(:id))
  end

  object :offline_experience do
    @desc ~S"""
      The experience which was successfully inserted
      - will be null if experience fails to insert
    """
    field(:experience, :experience)

    @desc ~S"""
      If the experience fails to insert, then this is the error object
      returned
    """
    field(:experience_errors, :create_offline_experience_errors)

    @desc ~S"""
      A list of error objects denoting entries which fail to insert
    """
    field(:entries_errors, list_of(:create_entries_errors))
  end

  @desc """
    Experience field errors during update
  """
  object :update_experience_errors do
    field(:title, :string)
    field(:client_id, :string)
  end

  @desc """
    Object returned on experience update
  """
  object :update_experience_return_value do
    field(:experience, :experience)
    field(:errors, :update_experience_errors)
  end

  @desc """
    Error returned while updating a definition
  """
  object :update_definition_error do
    field(:id, non_null(:id))
    field(:errors, non_null(:data_definition_error))
  end

  @desc """
    An object representing an updated defintion
  """
  object :update_definition_response do
    field(:definition, :data_definition)
    field(:errors, :update_definition_error)
  end

  @desc """
    An object representing the response of the update definitions operation
  """
  object :update_definitions_response do
    @desc """
      The experience to which the definitions updated belong. The experience
      is always updated whenever a definition is updated with the most recent
      updatedAt field of the definitions to be updated.
    """
    field(:experience, non_null(:experience))

    @desc """
      The definitions to be updated, successes/failures
    """
    field(
      :definitions,
      :update_definition_response
      |> non_null()
      |> list_of()
      |> non_null()
    )
  end

  ######################### END REGULAR OBJECTS ###########################

  ############################ INPUT OBJECTS ##############################

  @desc "Variables for defining field while defining a new experience"
  input_object :create_data_definition do
    field(:name, non_null(:string))
    field(:type, non_null(:field_type))

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
    field(:inserted_at, :iso_datetime)
    field(:updated_at, :iso_datetime)

    @desc ~S"""
      One may define an experience and create associated entries simultaneously
      if for instance on the client while backend is offline. Special care
      must be taken to ensure the entry.experienceId == experience.clientId
      otherwise the entry will fail to save.
    """
    field(:entries, :create_entry_input |> list_of())
  end

  @desc "Variables for updating an existing Experience"
  input_object :update_experience_input do
    @desc ~S"""
      The ID of experience to be updated
    """
    field(:id, non_null(:id))

    field(:title, :string)
    field(:description, :string)
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
      are not renaming the definition, please do not update!
    """
    field(:name, non_null(:string))

    @desc """
      If the update was done offline, then it's proper to allow the update
      date assigned offline.
    """
    field(:updated_at, :iso_datetime)
  end

  ######################### END INPUT OBJECTS ################################

  ######################### MUTATION ################################

  @desc """
    Mutations allowed on Experience object
  """
  object :experience_mutations do
    @desc "Create an experience"
    field :create_experience, :create_experience_return_value do
      arg(:input, non_null(:create_experience_input))

      resolve(&ExperienceResolver.create_experience/2)
    end

    @desc "Save many experiences created offline"
    field :save_offline_experiences, list_of(:offline_experience) do
      arg(:input, :create_experience_input |> list_of() |> non_null())

      resolve(&ExperienceResolver.save_offline_experiences/2)
    end

    @desc "Delete an experience"
    field :delete_experience, :experience do
      arg(:id, non_null(:id))

      resolve(&ExperienceResolver.delete_experience/2)
    end

    @desc "Update an experience"
    field :update_experience, :update_experience_return_value do
      arg(:input, non_null(:update_experience_input))

      resolve(&ExperienceResolver.update_experience/2)
    end

    @desc """
        Update several definitions
    """
    field :update_definitions, :update_definitions_response do
      arg(:input, :update_definition_input |> list_of |> non_null)

      resolve(&ExperienceResolver.update_definitions/2)
    end
  end

  ######################### END MUTATIONS ################################

  ######################### START QUERIES ################################

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

  ######################### END QUERIES ################################

  connection(node_type: :experience)
end
