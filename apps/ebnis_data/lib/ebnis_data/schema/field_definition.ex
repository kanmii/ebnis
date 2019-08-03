defmodule EbnisData.Schema.FieldDefinition do
  use Absinthe.Schema.Notation

  @desc "An Experience definition Field"
  object :field_definition do
    field(:id, non_null(:id))

    @desc "Name of field e.g start, end, meal "
    field(:name, non_null(:string))

    @desc ~S"""
      String that uniquely identifies this field definition has been
      created offline. If an associated entry is also created
      offline, then `createField.defId` **MUST BE** the same as this
      field and will be validated as such.
    """
    field(:client_id, :id)

    @desc "The data type of the field"
    field(:type, non_null(:field_type))
  end

  @desc "Variables for defining field while defining a new experience"
  input_object :create_field_definition do
    field(:name, non_null(:string))
    field(:type, non_null(:field_type))

    @desc ~S"""
      String that uniquely identifies this field definition has been
      created offline. If an associated entry is also created
      offline, then `createField.defId` **MUST BE** the same as this
      field and will be validated as such.
    """
    field(:client_id, :id)
  end

  @desc "Variables for updating an experience field definition"
  input_object :update_field_definition_input1 do
    @desc ~S"""
      The ID of field definition to be updated
    """
    field(:id, non_null(:id))

    @desc ~S"""
      The name of the field is the only one allowed to be updated. One may
      not update field types as this may invalidate all entries.
    """
    field(:name, non_null(:string))
  end
end
