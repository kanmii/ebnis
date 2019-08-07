defmodule EbnisData.Schema.Experience1 do
  use Absinthe.Schema.Notation
  use Absinthe.Relay.Schema.Notation, :modern

  import Absinthe.Resolution.Helpers, only: [dataloader: 1]

  alias EbnisData.Resolver.Experience1, as: Resolver

  @desc """
    Experience schema. Uses relay.
  """
  node object(:experience1) do
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
    field(
      :field_definitions,
      :field_definition
      |> list_of()
      |> non_null(),
      resolve: dataloader(:data)
    )

    @desc "The entries of the experience - can be paginated"
    field :entries, :entry1_connection |> non_null() do
      arg(:pagination, non_null(:pagination_input))

      resolve(&Resolver.entries/3)
    end

    field(:inserted_at, non_null(:iso_datetime))
    field(:updated_at, non_null(:iso_datetime))
    field(:has_unsaved, :boolean)
  end

  @desc """
    Error object returned if data definition refuses to save.
  """
  object :field_definition_error do
    field(:name, :string)
    field(:type, :string)
  end

  @desc """
    Experience field errors during creation
  """
  object :create_experience_errors do
    field(:title, :string)
    field(:field_definitions_errors, list_of(:field_definition_errors))
    field(:user, :string)
    field(:client_id, :string)
  end

  object :field_definition_errors do
    field(:index, non_null(:integer))
    field(:errors, non_null(:field_definition_error))
  end

  @desc """
    Object returned on experience creation
  """
  object :create_experience_return_value do
    field(:experience, :experience1)
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

  object :offline_experience1 do
    @desc ~S"""
      The experience which was successfully inserted
      - will be null if experience fails to insert
    """
    field(:experience, :experience1)

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

  ######################### END REGULAR OBJECTS ###########################

  ############################ INPUT OBJECTS ##############################

  @desc """
    Input object for defining a new Experience
  """
  input_object :create_experience_input1 do
    field(:title, non_null(:string))
    field(:description, :string)

    field(
      :field_definitions,
      :create_field_definition
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
      if for instance on the client while backend is offline.
    """
    field(:entries, :create_entry_input1 |> list_of())
  end

  ######################### END INPUT OBJECTS ################################

  ######################### MUTATION ################################

  @desc """
    Mutations allowed on Experience object
  """
  object :experience_mutations do
    @desc "Create an experience"
    field :create_experience1, :create_experience_return_value do
      arg(:input, non_null(:create_experience_input1))

      resolve(&Resolver.create_experience/2)
    end

    @desc "Save many experiences created offline"
    field :save_offline_experiences1, list_of(:offline_experience1) do
      arg(:input, :create_experience_input1 |> list_of() |> non_null())

      resolve(&Resolver.save_offline_experiences/2)
    end

    @desc "Delete an experience"
    field :delete_experience1, :experience1 do
      arg(:id, non_null(:id))

      resolve(&Resolver.delete_experience/2)
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
    field :get_experience1, :experience1 do
      arg(:id, non_null(:id))

      resolve(&Resolver.get_experience/2)
    end

    @desc ~S"""
      Get all experiences belonging to a user.
      The experiences returned may be paginated
      and may be filtered by IDs
    """
    connection field(:get_experiences1, node_type: :experience1) do
      arg(:input, :get_experiences_input)
      resolve(&Resolver.get_experiences/2)
    end
  end

  ######################### END QUERIES ################################

  connection(node_type: :experience1)
end
