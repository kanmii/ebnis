defmodule EbnisData.Query.Experience do
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

  @create_entry_error_fragment_name "CreateEntryErrorFragment"

  @create_entry_error_fragment """
    fragment #{@create_entry_error_fragment_name} on CreateEntryError {
      meta {
        experienceId
        index
        clientId
      }
      error
      clientId
      experienceId
      dataObjects {
        meta {
          index
        }
        definition
        definitionId
        data
        clientId
      }
    }
  """

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

  def update_experiences do
    """
      mutation UpdateExperiencesOnline($input: [UpdateExperienceInput!]!) {
        updateExperiences(input: $input) {
          __typename
          ... on UpdateExperiencesAllFail {
            error
          }
          ... on UpdateExperiencesSomeSuccess {
            experiences {
              __typename
              ... on UpdateExperienceErrors {
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
                          ... on DataObjectErrors {
                            errors {
                              meta {
                                id
                              }
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
                    ... on CreateEntryErrors {
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
                  deletedEntries {
                    __typename
                    ... on EntrySuccess {
                      entry {
                        id
                      }
                    }
                    ... on DeleteEntryErrors {
                      errors {
                        id
                        error
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
          ... on CreateExperienceErrors {
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

  def delete_entry do
    """
      mutation D($id: ID!) {
        deleteEntry(id: $id) {
          id
          experienceId
          clientId
          insertedAt
          updatedAt
          modOffline
          dataObjects {
            id
            definitionId
            data
            clientId
            insertedAt
            updatedAt
          }
        }
      }
    """
  end
end
