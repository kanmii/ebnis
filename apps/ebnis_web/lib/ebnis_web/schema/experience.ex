defmodule EbnisWeb.Schema.Experience do
  use Absinthe.Schema.Notation
  use Absinthe.Relay.Schema.Notation, :modern

  alias EbnisWeb.Resolver.Experience, as: Resolver

  @desc "An Experience schema. Uses relay."
  node object(:experience) do
    @desc "Internal ID of the schema. Field `id` is the global opaque ID"
    field(
      :_id,
      non_null(:id),
      resolve: &EbnisWeb.Resolver.resolve_internal_id/3
    )

    @desc "The title of the experience"
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
    field(:field_defs, :field_def |> list_of() |> non_null())

    @desc "The entries of the experience - can be paginated"
    field :entries, :entry_connection |> non_null() do
      arg(:pagination, :pagination_input)
      resolve(&Resolver.entries/3)
    end

    field(:inserted_at, non_null(:iso_datetime))
    field(:updated_at, non_null(:iso_datetime))
  end

  @desc ~S"""
    The error object that will returned when an offline experience fails to
    insert into the database. The difference between this and
    `offlineExperienceEntryError` is that this object signified we are not
    able to create the experience in the first place in which case we expect
    `offlineExperienceEntryError` field to be null.
  """
  object :offline_experience_error do
    @desc ~S"""
      The client ID of the failing experience. As user may not have provided a
      client ID, this field is nullable and in that case, the index field will
      be used to identify this error
    """
    field(:client_id, :id)

    @desc ~S"""
      The index of the failing experience in the list of experiences input
    """
    field(:index, non_null(:integer))

    @desc ~S"""
      The error string explaining why experience fails to insert.
    """
    field(:error, non_null(:string))
  end

  object :offline_experience do
    @desc ~S"""
      The experience which was successfully inserted - will be null if
      experience fails to insert
    """
    field(:experience, :experience)

    @desc ~S"""
      If the experience fails to insert, then this is the error object
      returned
    """
    field(:experience_error, :offline_experience_error)

    @desc ~S"""
      A list of error objects denoting entries which fail to insert
    """
    field(:entries_errors, list_of(:create_entries_error))
  end

  object :experience_error do
    field(:id, :id)
    field(:title, :string)
  end

  object :experience_update_returned do
    field(:experience, :experience)
    field(:experience_error, :experience_error)
  end

  ######################### END REGULAR OBJECTS ###########################

  ############################ INPUT OBJECTS ##############################

  @desc "Variables for defining a new Experience"
  input_object :create_experience_input do
    field(:title, non_null(:string))
    field(:description, :string)
    field(:field_defs, :create_field_def |> list_of() |> non_null())

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
      if for instance on the client while backend is offline.
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

  @desc "Variables for updating an existing Experience"
  input_object :update_experience_input do
    @desc ~S"""
      The ID of experience to be updated
    """
    field(:id, non_null(:id))

    field(:title, :string)
    field(:description, :string)
    field(:field_definitions, :update_field_definition_input |> list_of())

    # @desc ~S"""
    #   One may update one or more entries simultaneously
    # """
    # field(:entries, :create_entry_input |> list_of())
  end

  ######################### END INPUT OBJECTS ################################

  ######################### MUTATION ################################

  @desc "Mutations allowed on Experience object"
  object :experience_mutation do
    @desc "Create an experience"
    field :create_experience, :experience do
      arg(:input, non_null(:create_experience_input))

      resolve(&Resolver.create/2)
    end

    @desc "Save many experiences created offline"
    field :save_offline_experiences, list_of(:offline_experience) do
      arg(:input, :create_experience_input |> list_of() |> non_null())

      resolve(&Resolver.save_offline_experiences/2)
    end

    @desc "Delete an experience"
    field :delete_experience, :experience do
      arg(:id, non_null(:id))

      resolve(&Resolver.delete_experience/2)
    end

    @desc "Update an experience"
    field :update_experience, :experience_update_returned do
      arg(:input, non_null(:update_experience_input))

      resolve(&Resolver.update_experience/2)
    end
  end

  ######################### END MUTATIONS ################################

  ######################### QUERIES ######################################

  @desc "Queries allowed on Experience object"
  object :experience_query do
    @desc ~S"""
      Get all experiences belonging to a user. The experiences returned may be
      paginated
    """
    connection field(:get_experiences, node_type: :experience) do
      arg(:input, :get_experiences_input)
      resolve(&Resolver.get_experiences/2)
    end

    @desc "get an experience"
    field :get_experience, :experience do
      arg(:id, non_null(:id))
      resolve(&Resolver.get_experience/2)
    end
  end

  ######################### END QUERIES ################################

  connection(node_type: :experience)
end
