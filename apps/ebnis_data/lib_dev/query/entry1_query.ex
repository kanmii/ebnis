defmodule EbnisData.Query.Entry1 do
  @fragment_name "Entry1Fragment"

  @entry_data_fragment_name "EntryDataFragment"

  @entry_data_fragment """
    fragment #{@entry_data_fragment_name} on EntryData {
      id
      fieldDefinitionId
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

      entryDataList {
        ...#{@entry_data_fragment_name}
      }
    }

    #{@entry_data_fragment}
  """

  @fragment_create_entry_errors_name "CreateEntryErrorsName"

  @fragment_create_entry_errors """
    fragment #{@fragment_create_entry_errors_name} on CreateEntryErrors {
      experience
      experienceId
      clientId
      entry
      entryDataListErrors {
        index
        errors {
          fieldDefinition
          fieldDefinitionId
          data
        }
      }
    }
  """
  def create_entry_errors() do
    {@fragment_create_entry_errors, @fragment_create_entry_errors_name}
  end

  def create do
    """
    mutation CreateEntry1($input: CreateEntryInput1!) {
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
end
