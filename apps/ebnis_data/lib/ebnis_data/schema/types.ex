defmodule EbnisData.Schema.Types do
  @moduledoc """
  Custom types (scalars, objects and input types) shared among schema types
  """
  use Absinthe.Schema.Notation
  use Absinthe.Relay.Schema.Notation, :modern
  use Timex

  alias EbnisData.FieldType
  alias EbnisData.Experience1
  alias EbnisData.Entry1

  node interface do
    resolve_type(fn
      %Entry1{}, _ ->
        :entry1

      %Experience1{}, _ ->
        :experience1

      _, _ ->
        nil
    end)
  end

  @iso_extended_format "{ISO:Extended:Z}"

  scalar :entry_field_json, name: "EntryField" do
    parse(&parse_entry_field/1)

    serialize(fn val ->
      {:ok, data} = FieldType.serialize_k_v(val)
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

  scalar :iso_datetime, name: "ISODatime" do
    parse(&parse_iso_datetime/1)
    serialize(&Timex.format!(&1, @iso_extended_format))
  end

  @spec parse_iso_datetime(Absinthe.Blueprint.Input.String.t()) ::
          {:ok, DateTime.t() | NaiveDateTime.t()} | :error
  @spec parse_iso_datetime(Absinthe.Blueprint.Input.Null.t()) :: {:ok, nil}
  defp parse_iso_datetime(%Absinthe.Blueprint.Input.String{value: value}) do
    case Timex.parse(value, @iso_extended_format) do
      {:ok, val} -> {:ok, val}
      {:error, _} -> :error
    end
  end

  defp parse_iso_datetime(%Absinthe.Blueprint.Input.Null{}) do
    {:ok, nil}
  end

  defp parse_iso_datetime(_) do
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
