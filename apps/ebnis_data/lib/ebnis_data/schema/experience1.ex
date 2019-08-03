defmodule EbnisData.Schema.Experience1 do
  use Absinthe.Schema.Notation
  use Absinthe.Relay.Schema.Notation, :modern

  alias EbnisData.Resolver.Experience1, as: Resolver

  @desc """
    Experience schema. Uses relay.
  """
  node object(:experience1) do
    @desc "Internal ID of the schema. Field `id` is the global opaque ID"
    field(
      :_id,
      non_null(:id),
      resolve: &EbnisData.Resolver.resolve_internal_id/3
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
    field(:field_definitions, :field_definition |> list_of() |> non_null())

    @desc "The entries of the experience - can be paginated"
    field :entries, :entry_connection |> non_null() do
      arg(:pagination, :pagination_input)
      # resolve(&Resolver.entries/3)
    end

    field(:inserted_at, non_null(:iso_datetime))
    field(:updated_at, non_null(:iso_datetime))
    field(:has_unsaved, :boolean)
  end

  @desc """
    Experience field errors during creation
  """
  object :experience_errors do
    field(:title, :string)
  end

  object :field_definition_error do
    field(:name, :string)
    field(:type, :string)
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
    field(:experience_errors, :experience_errors)
    field(:field_definitions_errors, list_of(:field_definition_errors))
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
    field(:entries, :create_entry_input |> list_of())
  end

  ######################### END INPUT OBJECTS ################################

  ######################### MUTATION ################################

  @desc "Mutations allowed on Experience object"
  object :experience_mutation1 do
    @desc "Create an experience"
    field :create_experience1, :create_experience_return_value do
      arg(:input, non_null(:create_experience_input1))

      resolve(&Resolver.create_experience/2)
    end
  end

  ######################### END MUTATIONS ################################

  ######################### QUERIES ######################################

  ######################### END QUERIES ################################

  connection(node_type: :experience1)
end
