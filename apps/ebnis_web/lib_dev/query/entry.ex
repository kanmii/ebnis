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
      experienceId

      entries {
        ...#{@fragment_name}

        fields {
          ...#{@field_frag_name}
        }
      }

      errors {
        experienceId
        clientId
        error
      }
    }
  """

  def create do
    """
    mutation CreateAnExperienceEntry($input: CreateEntryInput!) {
      createEntry(input: $input) {
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
    mutation CreateEntriesMutation($createEntries: [CreateEntryInput!]!) {
      createEntries(createEntries: $createEntries) {
        ...#{@create_entries_response_fragment_name}
      }
    }

    #{@fragment}
    #{@field_frag}
    #{@create_entries_response_fragment}
    """
  end

  def update_entry do
    """
    mutation UpdateAnExperienceEntry($input: UpdateEntryInput!) {
      updateEntry(input: $input) {
        entry {
          ...#{@fragment_name}

          fields {
            ...#{@field_frag_name}
          }
        }

        fieldsErrors {
          defId
          error {
            data
            defId
          }
        }
      }
    }

    #{@fragment}
    #{@field_frag}
    """
  end

  def delete_entry do
    """
      mutation DeleteEntry($id: ID!) {
        deleteEntry(id: $id) {
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
end
