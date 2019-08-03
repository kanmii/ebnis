defmodule EbnisData.Query.Experience1 do
  @fragment_name "ExperienceFragment"

  @field_definition_fragment_name "FieldDefinitionFragment"

  @field_definition_fragment """
    fragment #{@field_definition_fragment_name} on FieldDefinition {
      id
      name
      type
    }
  """

  @fragment """
    fragment #{@fragment_name} on Experience1 {
      _id
      id
      hasUnsaved
      title
      description
      clientId
      insertedAt
      updatedAt

      fieldDefinitions {
        ...#{@field_definition_fragment_name}
      }
    }

    #{@field_definition_fragment}
  """

  def create do
    """
      mutation CreateExperience($input: CreateExperienceInput1!) {
        createExperience1(input: $input) {
          experience {
            ...#{@fragment_name}
          }

          experienceErrors {
            title
          }

          fieldDefinitionsErrors {
            index
            errors {
              name
              type
            }
          }
        }
      }

      #{@fragment}
    """
  end
end
