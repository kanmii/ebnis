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
      The client ID. For experiences created on the client and to be synced
      with the server, the client ID uniquely identifies such and can be used
      to enforce uniqueness at the DB level. Not providing client_id assumes
      a fresh experience.
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

  object :offline_experience_sync do
    field(:experience, non_null(:experience))

    field(
      :entries_errors,
      :offline_experience_sync_entry_error
      |> list_of()
      |> non_null()
    )
  end

  ############################ INPUT OBJECTS ################################

  @desc "Variables for defining a new Experience"
  input_object :create_exp do
    field(:title, non_null(:string))
    field(:description, :string)
    field(:field_defs, :create_field_def |> list_of() |> non_null())

    @desc ~S"""
      Uniquely identifies and signifies an experience has been created offline.
      This will be used to prevent sync conflict.
    """
    field(:client_id, :id)

    @desc "If experience is created on the client, it might include timestamps"
    field(:inserted_at, :iso_datetime)
    field(:updated_at, :iso_datetime)

    @desc ~S"""
      One may define an experience and create associated entries simultaneously
      if for instance on the client while backend is offline.
    """
    field(:entries, :create_entry |> list_of())
  end

  @desc "Variables for getting an experience"
  input_object :get_exp do
    field(:id, non_null(:id))
  end

  ######################### END INPUT OBJECTS ################################

  @desc "Mutations allowed on Experience object"
  object :exp_mutation do
    @desc "Create an experience"
    field :exp, :experience do
      arg(:exp, non_null(:create_exp))

      resolve(&Resolver.create/2)
    end

    @desc "Sync an experience created offline"
    field :sync_offline_experience, :offline_experience_sync do
      arg(:input, non_null(:create_exp))

      resolve(&Resolver.sync_offline_experience/2)
    end
  end

  @desc "Queries allowed on Experience object"
  object :exp_query do
    @desc ~S"""
      Get all experiences belonging to a user
    """
    connection field(:exps, node_type: :experience) do
      arg(:pagination, non_null(:pagination_input))
      resolve(&Resolver.get_user_exps/2)
    end

    @desc "get an experience"
    field :exp, :experience do
      arg(:exp, non_null(:get_exp))
      resolve(&Resolver.get_exp/2)
    end
  end

  connection(node_type: :experience)
end
