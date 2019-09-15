defmodule EbnisData.Schema.Types do
  @moduledoc """
  Custom types (scalars, objects and input types) shared among schema types
  """
  use Absinthe.Schema.Notation
  use Absinthe.Relay.Schema.Notation, :modern

  alias EbnisData.DataType
  alias EbnisData.Experience
  alias EbnisData.Entry

  node interface do
    resolve_type(fn
      %Entry{}, _ ->
        :entry

      %Experience{}, _ ->
        :experience

      _, _ ->
        nil
    end)
  end

  scalar :data_json, name: "DataType" do
    parse(&parse_entry_field/1)

    serialize(fn val ->
      {:ok, data} = DataType.serialize_k_v(val)
      Jason.encode!(data)
    end)
  end

  defp parse_entry_field(%Absinthe.Blueprint.Input.String{value: value}) do
    case Jason.decode(value) do
      {:ok, parsed} ->
        {:ok, parsed}

      {:error, _} ->
        :error
    end
  end

  defp parse_entry_field(%Absinthe.Blueprint.Input.Null{}) do
    {:ok, nil}
  end

  defp parse_entry_field(_) do
    :error
  end

  ####################### input types #####################################
  input_object :pagination_input do
    field(:first, :integer)
    field(:last, :integer)
    field(:before, :integer)
    field(:after, :integer)
  end
end
