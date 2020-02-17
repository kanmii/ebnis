defmodule EbnisData.Query.Experience do
  alias EbnisData.Query.Entry

  @fragment_name "ExperienceFragment"

  @data_definition_fragment_name "DataDefinitionFragment"

  @data_definition_fragment """
    fragment #{@data_definition_fragment_name} on DataDefinition {
      id
      name
      type
      updatedAt
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
            experienceId
            clientId
            dataObjects {
              definitionId
              id
            }
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

  @create_entry_error_fragment_name "CreateEntryErrorFragment"

  @create_entry_error_fragment """
    fragment #{@create_entry_error_fragment_name} on CreateEntryErrorx {
      meta {
        experienceId
        index
        clientId
      }
      error
      clientId
      experienceId
      dataObjects {
        index
        definition
        definitionId
        data
        clientId
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
      mutation UpdateDefinitions($input: UpdateDefinitionsInput!) {
        updateDefinitions(input: $input) {
          experience {
            ...#{@fragment_name}
          }

          definitions {
            definition {
                ...#{@data_definition_fragment_name}
            }


            errors {
              id
              errors {
                name
                definition
              }
            }
          }

        }
      }

      #{@fragment}
      #{@data_definition_fragment}
    """
  end

  def update_experiences do
    """
      mutation UpdateExperiencesOnline($input: [UpdateAnExperienceInput!]!) {
        updateExperiences(input: $input) {
          __typename
          ... on UpdateExperiencesAllFail {
            error
          }
          ... on UpdateExperiencesSomeSuccess {
            experiences {
              __typename
              ... on UpdateExperienceFullErrors {
                errors {
                  experienceId
                  error
                }
              }
              ... on UpdateExperienceSomeSuccess {
                experience {
                  experienceId
                  updatedAt
                  ownFields {
                    __typename
                    ... on UpdateExperienceOwnFieldsErrors {
                      errors {
                        title
                      }
                    }
                    ... on ExperienceOwnFieldsSuccess {
                      data {
                        title
                        description
                      }
                    }
                  }
                  updatedDefinitions {
                    __typename
                    ... on DefinitionErrors {
                      errors {
                        id
                        name
                        type
                        error
                      }
                    }

                    ... on DefinitionSuccess {
                      definition {
                        ...#{@data_definition_fragment_name}
                      }
                    }
                  }
                  updatedEntries {
                    __typename
                    ... on UpdateEntryErrors {
                      errors {
                        entryId
                        error
                      }
                    }
                    ... on UpdateEntrySomeSuccess {
                      entry {
                        entryId
                        updatedAt
                        dataObjects {
                          __typename
                          ... on DataObjectFullErrors {
                            errors {
                              id
                              definition
                              definitionId
                              clientId
                              error
                              data
                            }
                          }
                          ... on DataObjectSuccess {
                            dataObject {
                              id
                              data
                              definitionId
                              clientId
                              insertedAt
                              updatedAt
                            }
                          }
                        }
                      }
                    }
                  }
                  newEntries {
                    __typename
                    ... on CreateEntryErrorss {
                      errors {
                        ...#{@create_entry_error_fragment_name}
                      }
                    }
                    ... on CreateEntrySuccess {
                      entry {
                        id
                        clientId
                        experienceId
                        updatedAt
                        insertedAt
                        dataObjects {
                          id
                          clientId
                          data
                          definitionId
                          insertedAt
                          updatedAt
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      #{@data_definition_fragment}
      #{@create_entry_error_fragment}
    """
  end

  def create_experiences do
    """
      mutation CreateExperiences($input: [CreateExperienceInput!]!) {
        createExperiences(input: $input) {
          ... on ExperienceSuccess {
            experience {
              ...#{@fragment_name}
            }
            entriesErrors {
              ...#{@create_entry_error_fragment_name}
            }
          }
          ... on CreateExperienceErrorss {
            errors {
              meta {
                index
                clientId
              }
              error
              title
              user
              clientId
              dataDefinitions {
                index
                name
                type
              }
            }
          }
        }
      }
      #{@fragment}
      #{@create_entry_error_fragment}
    """
  end


  def delete_experiences do
    """
      mutation DeleteExperiences($input: [ID!]!) {
        deleteExperiences(input: $input) {
          ... on DeleteExperiencesAllFail {
            error
          }
          ... on DeleteExperiencesSomeSuccess {
            experiences {
              ... on DeleteExperienceErrors {
                errors {
                  id
                  error
                }
              }
              ... on DeleteExperienceSuccess {
                experience {
                  id
                }
              }
            }
          }
        }
      }
    """
  end
end
