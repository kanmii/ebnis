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

  @desc "Variables for defining a new Experience"
  input_object :create_exp do
    field(:title, non_null(:string))
    field(:description, :string)
    field(:field_defs, :create_field_def |> list_of() |> non_null())
  end

  @desc "Variables for getting an experience"
  input_object :get_exp do
    field(:id, non_null(:id))
  end

  @desc "Mutations allowed on Experience object"
  object :exp_mutation do
    @doc "Create an experience"
    field :exp, :experience do
      arg(:exp, non_null(:create_exp))

      resolve(&Resolver.create/2)
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
