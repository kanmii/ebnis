defmodule EbnisData.Query.Entry1 do
  @fragment_name "Entry1Fragment"

  @entry_data_fragment_name "DataObjectFragment"

  @entry_data_fragment """
    fragment #{@entry_data_fragment_name} on DataObject {
      id
      definitionId
      data
    }
  """

  @fragment """
    fragment #{@fragment_name} on Entry1 {
      id
      experienceId
      clientId
      insertedAt
      updatedAt

      dataObjects {
        ...#{@entry_data_fragment_name}
      }
    }

    #{@entry_data_fragment}
  """

  @fragment_data_error_name "DE"

  @fragment_data_error """
    fragment #{@fragment_data_error_name} on DataObjectError {
      definition
      definitionId
      data
    }
  """

  @fragment_create_entry_errors_name "CreateEntryErrorsName"

  @fragment_create_entry_errors """
    fragment #{@fragment_create_entry_errors_name} on CreateEntryErrors {
      experience
      experienceId
      clientId
      entry
      dataObjectsErrors {
        index
        errors {
          ...#{@fragment_data_error_name}
        }
      }
    }

    #{@fragment_data_error}
  """
  def create_entry_errors() do
    {@fragment_create_entry_errors, @fragment_create_entry_errors_name}
  end

  def create do
    """
    mutation C($input: CreateEntryInput1!) {
      createEntry1(input: $input) {
        entry {
          ...#{@fragment_name}
        }

        errors {
          ...#{@fragment_create_entry_errors_name}
        }


      }
    }

    #{@fragment}
    #{@fragment_create_entry_errors}
    """
  end

  def create_entries do
    """
    mutation C($input: [CreateEntriesInput!]!) {
      createEntries1(input: $input) {
        experienceId

        entries {
          ...#{@fragment_name}
        }

        errors {
          clientId
          experienceId
          errors {
            ...#{@fragment_create_entry_errors_name}
          }
        }
      }
    }

    #{@fragment}
    #{@fragment_create_entry_errors}
    """
  end

  def delete do
    """
      mutation D($id: ID!) {
        deleteEntry1(id: $id) {
          ...#{@fragment_name}

        }
      }

      #{@fragment}
    """
  end

  def update_data_object() do
    """
      mutation U($input: UpdateDataObjectInput!) {
        updateDataObject(input: $input) {
          dataObject {
            ...#{@entry_data_fragment_name}
          }

          errors {
            ...#{@fragment_data_error_name}
          }
        }
      }

      #{@entry_data_fragment}
      #{@fragment_data_error}
    """
  end
end
