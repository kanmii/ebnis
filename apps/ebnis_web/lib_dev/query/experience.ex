defmodule EbnisWeb.Query.Experience do
  alias EbnisWeb.Query.FieldDef

  @frag_name "ExperienceFragment"

  @fragment """
    fragment #{@frag_name} on Experience {
      _id
      id
      title
      description
      clientId
      insertedAt
      updatedAt
      entries(pagination: {first: 100} ) {
        pageInfo {
          hasNextPage
          hasPreviousPage
        }

        edges {
          node {
            id
            expId
            clientId
            insertedAt
            updatedAt
            fields {
              defId
              data
            }
          }
        }
      }
    }
  """

  def create do
    {field_frag_name, field_frag} = FieldDef.all_fields_fragment()

    """
      mutation CreateAnExperience($input: CreateExperienceInput!) {
        createExperience(input: $input) {
          ...#{@frag_name}
          fieldDefs {
            ...#{field_frag_name}
          }
        }
      }

      #{@fragment}
      #{field_frag}
    """
  end

  def get do
    """
      query GetAnExperience($exp: GetExp!) {
        exp(exp: $exp) {
          ...#{@frag_name}

        }
      }

      #{@fragment}
    """
  end

  def gets do
    """
      query GetExperiences($input: GetExperiencesInput) {
        exps(input: $input) {
          pageInfo {
            hasNextPage
            hasPreviousPage
          }

          edges {
            node {
              ...#{@frag_name}
            }
          }

        }
      }

      #{@fragment}
    """
  end

  def sync_offline_experiences do
    {field_frag_name, field_frag} = FieldDef.all_fields_fragment()

    """
      mutation SyncOfflineExperiences($input: [CreateExperienceInput!]!) {
        syncOfflineExperiences(input: $input) {
          experience {
            ...#{@frag_name}

            fieldDefs {
              ...#{field_frag_name}
            }
          }

          experienceError {
            index
            clientId
            error
          }

          entriesErrors {
            experienceId
            clientId
            error
          }
        }
      }

      #{@fragment}
      #{field_frag}
    """
  end
end
