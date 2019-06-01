defmodule EbnisWeb.Query.Entry do
  @frag_name "EntryFragment"

  @field_frag_name "EntryFieldFrag"

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

  @field_frag """
    fragment #{@field_frag_name} on Field {
      defId
      data
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
        ...#{@frag_name}
        fields {
          ...#{@field_frag_name}
        }
      }
    }

    #{@fragment}
    #{@field_frag}
    """
  end

  def get do
    """
    query GetAnExperienceEntry($entry: GetEntry!) {
      entry(entry: $entry) {
        ...#{@frag_name}

      }
    }

    #{@fragment}

    """
  end

  def get_exp_entries do
    """
    query GetEntriesForExperience($entry: GetExpEntries! ) {
      expEntries(entry: $entry) {
        ...#{@frag_name}

      }
    }

    #{@fragment}

    """
  end

  def create_entries do
    """
    mutation CreateEntriesMutation($createEntries: CreateEntriesInput!) {
      createEntries(createEntries: $createEntries) {
        ...#{@frag_name}

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
