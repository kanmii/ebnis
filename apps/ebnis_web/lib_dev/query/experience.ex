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
      query GetAnExperience($id: ID!) {
        getExperience(id: $id) {
          ...#{@frag_name}

        }
      }

      #{@fragment}
    """
  end

  def gets do
    """
      query GetExperiences($input: GetExperiencesInput) {
        getExperiences(input: $input) {
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

  def save_offline_experiences do
    {field_frag_name, field_frag} = FieldDef.all_fields_fragment()

    """
      mutation SaveOfflineExperiences($input: [CreateExperienceInput!]!) {
        saveOfflineExperiences(input: $input) {
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

  def delete_experience do
    {field_frag_name, field_frag} = FieldDef.all_fields_fragment()

    """
      mutation DeleteExperience($id: String!) {
        deleteExperience(id: $id) {
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

  def update_experience do
    {field_frag_name, field_frag} = FieldDef.all_fields_fragment()

    """
      mutation UpdateAnExperience($input: UpdateExperienceInput!) {
        updateExperience(input: $input) {
          experience {
            ...#{@frag_name}
            fieldDefs {
              ...#{field_frag_name}
            }
          }

          experienceError {
            id
            title
          }

          fieldDefinitionsErrors {
            id
            name
          }
        }
      }

      #{@fragment}
      #{field_frag}
    """
  end
end
