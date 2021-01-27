defmodule EbnisData.Query.Experience do
  @data_definition_fragment """
    {
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

  @comments """
    comments {
      id
      text
      updatedAt
    }
  """

  @eintrag_scherbe """
    {
      id
      experienceId
      clientId
      insertedAt
      updatedAt
      dataObjects {
        definitionId
        id
        data
        clientId
      }
      #{@comments}
    }
  """

  @naked_erfarung """
    id
    title
    description
    clientId
    insertedAt
    updatedAt
    dataDefinitions #{@data_definition_fragment}
  """

  @erfahrung_scherbe """
    {
      #{@naked_erfarung}
    }
  """

  @create_entry_error_fragment """
    {
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
        getExperience(id: $id) #{@erfahrung_scherbe}

      }
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

              dataDefinitions #{@data_definition_fragment}
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
          ... on UpdateExperiencesAllFail {
            error
          }

          ... on UpdateExperiencesSomeSuccess {
            experiences {
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
                      definition #{@data_definition_fragment}
                    }
                  }
                }

                entries {
                  updatedEntries {
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
                    ... on CreateEntryErrors {
                      errors #{@create_entry_error_fragment}

                    }

                    ... on CreateEntrySuccess {
                      entry #{@eintrag_scherbe}

                    }
                  }

                  deletedEntries {
                    ... on DeleteEntrySuccess {
                      entry #{@eintrag_scherbe}
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
              #{@comments}
            }

            entries {
              __typename
              ... on CreateEntrySuccess {
                entry #{@eintrag_scherbe}

              }

              ... on CreateEntryErrors {
                errors #{@create_entry_error_fragment}

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
    """
      query GetEntries($experienceId: ID!, $pagination: PaginationInput!) {
        getEntries(experienceId: $experienceId, pagination: $pagination) {
          ... on GetEntriesSuccess {
            entries {
              edges {
                node #{@eintrag_scherbe}
              }
              #{@page_info}
            }
          }

          ... on GetEntriesErrors {
            errors {
              experienceId
              error
            }
          }
        }
      }
    """
  end

  def vorholen_erfahrungen do
    """
      query PreFetchExperiences($ids: [ID!]!, $entryPagination: PaginationInput!) {
        preFetchExperiences(ids: $ids, entryPagination: $entryPagination) {
          #{@naked_erfarung}
          entries(pagination: $entryPagination) {
            edges {
              node #{@eintrag_scherbe}
            }
            #{@page_info}
          }
        }
      }
    """
  end
end
