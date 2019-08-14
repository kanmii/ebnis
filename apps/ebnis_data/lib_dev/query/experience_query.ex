defmodule EbnisData.Query.Experience do
  alias EbnisData.Query.Entry

  @fragment_name "ExperienceFragment"

  @data_definition_fragment_name "DataDefinitionFragment"

  @data_definition_fragment """
    fragment #{@data_definition_fragment_name} on DataDefinition {
      id
      name
      type
    }
  """

  @fragment """
    fragment #{@fragment_name} on Experience {
      id
      hasUnsaved
      title
      description
      clientId
      insertedAt
      updatedAt
      entries (pagination: {first: 100}) {
        edges {
          node {
            id
            clientId
          }
        }

        pageInfo {
          hasNextPage
          hasPreviousPage
        }
      }
      dataDefinitions {
        ...#{@data_definition_fragment_name}
      }
    }

    #{@data_definition_fragment}
  """

  @fragment_create_experience_errors_name "CreateExperienceErrorFragment"

  @fragment_create_experience_errors """
    fragment #{@fragment_create_experience_errors_name}
      on CreateExperienceErrors {
        title
        user
        clientId
        dataDefinitionsErrors {
          index
          errors {
            name
            type
          }
        }
      }
  """

  def create do
    """
      mutation CreateExperience($input: CreateExperienceInput!) {
        createExperience(input: $input) {
          experience {
            ...#{@fragment_name}
          }

          errors {
            ...#{@fragment_create_experience_errors_name}
          }
        }
      }

      #{@fragment}
      #{@fragment_create_experience_errors}
    """
  end

  def get do
    """
      query GetExperience($id: ID!) {
        getExperience(id: $id) {
            ...#{@fragment_name}
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
              ...#{@fragment_name}
            }
          }

        }
      }

      #{@fragment}
    """
  end

  def save_offline_experiences do
    {fragment_create_entry_errors, fragment_create_entry_errors_name} =
      Entry.create_entry_errors()

    """
      mutation SaveOfflineExperiences($input: [CreateExperienceInput!]!) {
        saveOfflineExperiences(input: $input) {
          experience {
            ...#{@fragment_name}
          }

          experienceErrors {
            index
            clientId
            errors {
              ...#{@fragment_create_experience_errors_name}
            }
          }

          entriesErrors {
            experienceId
            clientId
            errors {
              ...#{fragment_create_entry_errors_name}
            }
          }
        }
      }

      #{@fragment}
      #{@fragment_create_experience_errors}
      #{fragment_create_entry_errors}
    """
  end

  def delete do
    """
      mutation DeleteExperience($id: ID!) {
        deleteExperience(id: $id) {
          ...#{@fragment_name}
        }
      }

      #{@fragment}
    """
  end

  def update do
    """
      mutation UpdateExperience($input: UpdateExperienceInput!) {
        updateExperience(input: $input) {
          experience {
            ...#{@fragment_name}
          }

          errors {
            title
            clientId
          }
        }
      }

      #{@fragment}
    """
  end

  def update_definitions do
    """
      mutation UpdateDefinitions($input: [UpdateDefinitionInput]!) {
        updateDefinitions(input: $input) {
          experience {
            id
            updatedAt
          }

          definitions {
            definition {
                ...#{@data_definition_fragment_name}
            }


            errors {
              id
              errors {
                name
              }
            }
          }

        }
      }

      #{@data_definition_fragment}
    """
  end
end
