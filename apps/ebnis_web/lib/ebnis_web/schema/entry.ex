defmodule EbnisWeb.Schema.Entry do
  use Absinthe.Schema.Notation
  use Absinthe.Relay.Schema.Notation, :modern

  alias EbnisWeb.Resolver.Entry, as: Resolver

  @desc "An entry field"
  object :field do
    field(:def_id, non_null(:id))
    field(:data, non_null(:entry_field_json))
  end

  @desc "An Experience entry"
  object :entry do
    field(:id, non_null(:id))
    field(:exp_id, non_null(:id))

    field :exp, non_null(:experience) do
      resolve(&Resolver.exp/3)
    end

    field(:fields, :field |> list_of() |> non_null())
    field(:inserted_at, non_null(:iso_datetime))
    field(:updated_at, non_null(:iso_datetime))
  end

  @desc "An Experience entry that supports relay"
  node object(:entry_relay) do
    @desc "Internal ID of the entry. Field `id` is the global opaque ID"
    field(:_id, non_null(:id), resolve: fn %{id: id}, _, _ -> {:ok, id} end)

    @desc "The ID of experience to which this entry belongs"
    field(:exp_id, non_null(:id))

    @desc "The experience object to which this entry belongs"
    field :exp, non_null(:experience) do
      resolve(&Resolver.exp/3)
    end

    @desc "The data fields belonging to this entry"
    field(:fields, :field |> list_of() |> non_null())

    field(:inserted_at, non_null(:iso_datetime))
    field(:updated_at, non_null(:iso_datetime))
  end

  object :create_entries_response_entry do
    field(:index, non_null(:integer))
    field(:entry, non_null(:entry))
  end

  object :create_entries_response_error do
    field(:index, non_null(:integer))
    field(:error, non_null(:string))
  end

  @desc ~S"""
    Data structure returned when creating multiple entries simultaneously.

    It looks like so:
    `typescript
    {
      successes?: [{
        index: number;
        entry: Entry
      }],

      failures?: [{
        index: number;
        error: string
      }]
    }
    `

    The inserts that succeed go into the `successes` field while those that fail
    go into `failures` field. Each field is an array of maps with a key `index` which maps to the index of the object in user's input from which we attempted to create the entry. The `index` is so that user knows how to map
    from the response we returned to the input the user supplied.

    In addition, we only get `successes` field if at least one input succeeds
    and we only get `failures` field if at least one input fails
  """
  object :create_entries_response do
    field(:successes, list_of(:create_entries_response_entry))
    field(:failures, list_of(:create_entries_response_error))
  end

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
    field(:def_id, non_null(:id))
    field(:data, non_null(:entry_field_json))
  end

  @desc "Variables for creating an experience entry"
  input_object :create_entry do
    @desc "The ID of the experience"
    field(:exp_id, non_null(:id))

    @desc "fields making up the experience entry"
    field(:fields, :create_field |> list_of() |> non_null())
  end

  @desc ~S"""
    Variables for creating several entries for an experience.

    It is of the form:
    {
      // The ID of the experience
      expId: string;

      // list of fields making up the entries.
      listOFields: CreateField[][];
    }


    listOFields is basically a list of lists like so:
    [
      [{defId: string, data: string}, {}, {}] // list of fields for entry 1,
      [{}, {}, {}] // list of fields for entry 2,
      .
      .
      .
      [{}, {}, {}] // list of fields for entry n,
    ]

    The length of each member list must be the same because all entries for
    a particular experience will have the same number of fields
  """
  input_object :create_entries_input do
    @desc "The ID of the experience"
    field(:exp_id, non_null(:id))

    field(
      :list_of_fields,
      :create_field
      |> list_of()
      |> list_of()
      |> non_null()
    )
  end

  @desc "Variables for getting an experience entry"
  input_object :get_entry do
    field(:id, non_null(:id))
  end

  @desc "Variables for getting all entries belonging to an experience"
  input_object :get_exp_entries do
    @desc "The ID of the experience"
    field(:exp_id, non_null(:id))
  end

  input_object :list_experiences_entries_input do
    field(:experiences_ids, :id |> list_of() |> non_null())
    field(:pagination, :pagination_input)
  end

  ################### end input objects   #############################

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
    field :entry, :entry_relay do
      arg(:entry, non_null(:create_entry))

      resolve(&Resolver.create/3)
    end

    field :create_entries, :create_entries_response do
      arg(:create_entries, non_null(:create_entries_input))

      resolve(&Resolver.create_entries/3)
    end
  end

  ################### end mutations #########################################

  ################### queries #########################################

  @desc "Queries allowed on Experience object"
  object :entry_query do
    @desc ~S"""
      Get entries for many experiences simultaneously. Use like so:

      query ListExperiencesEntries($input: ListExperiencesEntriesInput!) {
        listExperiencesEntries(input: $input) {
          pageInfo {
            hasNextPage
            hasPreviousPage
          }

          edges {
            cursor
            node {
              ...EntryRelayFragment
            }
          }
        }
      }

      You get:
      ```typescript
      {
        listExperiencesEntries: [
          {
            edges: [
              {
                cursor: string;
                node: {
                  id: string;
                  _id: string;
                }
              }
            ],

            pageInfo: {
              hasNextPage: boolean;
              hasPreviousPage: boolean;
            }
          }
        ]
      }
      ```
    """
    field(:list_experiences_entries, list_of(:entry_relay_connection)) do
      arg(:input, non_null(:list_experiences_entries_input))
      resolve(&Resolver.list_experiences_entries/2)
    end
  end

  connection(node_type: :entry_relay)
end
