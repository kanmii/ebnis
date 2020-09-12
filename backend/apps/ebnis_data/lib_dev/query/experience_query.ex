defmodule EbnisData.Query.Experience do
  @data_definition_fragment_name "DataDefinitionFragment"

  @data_definition_fragment """
    fragment #{@data_definition_fragment_name} on DataDefinition {
      id
      name
      type
      updatedAt
    }
  """

  @page_info """
    pageInfo {
      hasNextPage
      hasPreviousPage
      endCursor
      startCursor
    }
  """

  @eintrag_scherbe_name "EntryFragment"

  @eintrag_scherbe """
    fragment #{@eintrag_scherbe_name} on Entry {
      id
      experienceId
      clientId
      insertedAt
      updatedAt
      dataObjects {
        definitionId
        id
      }
    }
  """

  @erfahrung_scherbe_name "ExperienceFragment"

  @erfahrung_sherbe """
    fragment #{@erfahrung_scherbe_name} on Experience {
      id
      title
      description
      clientId
      insertedAt
      updatedAt
      dataDefinitions {
        ...#{@data_definition_fragment_name}
      }

      entries(pagination: $entriesPagination) {
        ...#{@eintrag_scherbe_name}
      }
    }

    #{@data_definition_fragment}
    #{@eintrag_scherbe}
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
            ...#{@erfahrung_scherbe_name}
        }
      }

      #{@erfahrung_sherbe}
    """
  end

  def pagination_args do
    {
      "$first: Int, $last: Int, $before: String, $after: String",
      "first: $first, last: $last, before: $before, after: $after"
    }
  end

  def gets do
    {variables, values} = pagination_args()

    """
      query GetExperiences($ids: [ID], #{variables}) {
        getExperiences(ids: $ids, #{values}) {
          #{@page_info}

          edges {
            node {
              id
              title
              insertedAt
              updatedAt
            }
          }

        }
      }
    """
  end

  def delete do
    """
      mutation DeleteExperience($id: ID!) {
        deleteExperience(id: $id) {
          id
        }
      }
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
                }

                entries {
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

                  createdEntries {
                    __typename
                    ... on CreateEntryErrors {
                      errors {
                        ...#{@create_entry_error_fragment_name}
                      }
                    }

                    ... on CreateEntrySuccess {
                      entry {
                        ...#{@eintrag_scherbe_name}
                      }
                    }
                  }

                  deletedEntries {
                    __typename
                    ... on DeleteEntrySuccess {
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
      #{@eintrag_scherbe}
    """
  end

  def create_experiences do
    """
      mutation CreateExperiences($input: [CreateExperienceInput!]!) {
        createExperiences(input: $input) {
          __typename
          ... on ExperienceSuccess {
            experience {
              id
              clientId
              title
              insertedAt
              updatedAt
              dataDefinitions {
                id
                clientId
                name
              }
            }

            entries {
              __typename
              ... on CreateEntrySuccess {
                entry {
                  ...#{@eintrag_scherbe_name}
                }
              }

              ... on CreateEntryErrors {
                errors {
                  ...#{@create_entry_error_fragment_name}
                }
              }
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

      #{@eintrag_scherbe}
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

  def sammeln_einträge do
    {variables, values} = pagination_args()

    """
      query SammelnEinträge($experienceId: ID, #{variables}) {
        sammelnEinträge(experienceId: $experienceId, #{values}) {
          edges {
            ...#{@eintrag_scherbe_name}
          }

          #{@page_info}
        }
      }

      #{@eintrag_scherbe}
    """
  end
end
