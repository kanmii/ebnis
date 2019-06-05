defmodule EbnisWeb.Query.Entry do
  @frag_name "EntryFragment"

  @fragment_relay_name "EntryRelayFragment"

  @field_frag_name "EntryFieldFrag"

  @create_entries_response_fragment_name "CreateEntryResponseFragment"

  @fragment """
    fragment #{@frag_name} on Entry {
      id
      expId
      insertedAt
      updatedAt
      exp {
        id
      }
    }
  """

  @fragment_relay """
    fragment #{@fragment_relay_name} on EntryRelay {
      _id
      id
      expId
      insertedAt
      updatedAt
    }
  """

  @field_frag """
    fragment #{@field_frag_name} on Field {
      defId
      data
    }
  """

  @create_entries_response_fragment """
  fragment #{@create_entries_response_fragment_name} on CreateEntriesResponse {
      successes {
        index
        entry {
          ...#{@frag_name}

          fields {
            ...#{@field_frag_name}
          }
        }
      }

      failures {
        index
        error
      }
    }
  """

  def fragment do
    @fragment
  end

  def all_fields_fragment do
    {@frag_name, fragment()}
  end

  def create do
    """
    mutation CreateAnExperienceEntry($entry: CreateEntry!) {
      entry(entry: $entry) {
        ...#{@fragment_relay_name}

        fields {
          ...#{@field_frag_name}
        }
      }
    }

    #{@fragment_relay}
    #{@field_frag}
    """
  end

  def create_entries do
    """
    mutation CreateEntriesMutation($createEntries: CreateEntriesInput!) {
      createEntries(createEntries: $createEntries) {
        ...#{@create_entries_response_fragment_name}
      }
    }

    #{@fragment}
    #{@field_frag}
    #{@create_entries_response_fragment}
    """
  end

  def list_experiences_entries do
    """
    query ListExperiencesEntries($input: ListExperiencesEntriesInput!) {
      listExperiencesEntries(input: $input) {
        pageInfo {
          hasNextPage
          hasPreviousPage
        }

        edges {
          cursor
          node {
            ...#{@fragment_relay_name}
          }
        }
      }
    }

    #{@fragment_relay}
    """
  end
end
