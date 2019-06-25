defmodule EbnisWeb.Query.Entry do
  @fragment_name "EntryFragment"

  @field_frag_name "EntryFieldFrag"

  @create_entries_response_fragment_name "CreateEntryResponseFragment"

  @fragment """
    fragment #{@fragment_name} on Entry {
      _id
      id
      expId
      clientId
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
      expId
      entries {
        ...#{@fragment_name}

        fields {
          ...#{@field_frag_name}
        }
      }

      errors {
        clientId
        error
      }
    }
  """

  def create do
    """
    mutation CreateAnExperienceEntry($entry: CreateEntry!) {
      entry(entry: $entry) {
        ...#{@fragment_name}

        fields {
          ...#{@field_frag_name}
        }
      }
    }

    #{@fragment}
    #{@field_frag}
    """
  end

  def create_entries do
    """
    mutation CreateEntriesMutation($createEntries: [CreateEntry!]!) {
      createEntries(createEntries: $createEntries) {
        ...#{@create_entries_response_fragment_name}
      }
    }

    #{@fragment}
    #{@field_frag}
    #{@create_entries_response_fragment}
    """
  end

  def list_entries_from_experiences_ids do
    """
    query listEntriesFromExperiencesIds($input: ListEntriesFromExperiencesIdsInput!) {
      listEntriesFromExperiencesIds(input: $input) {
        pageInfo {
          hasNextPage
          hasPreviousPage
        }

        edges {
          cursor
          node {
            ...#{@fragment_name}
          }
        }
      }
    }

    #{@fragment}
    """
  end
end
