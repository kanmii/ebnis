defmodule EbnisData.Factory.Experience do
  alias EbnisData.Factory
  alias EbnisData.Factory.DataDefinition, as: DataDefinitionFactory
  alias EbnisData.Factory.Entry, as: EntryFactory

  @count 1..5
  @simple_attrs [:user_id, :title, :description, :client_id, :id]

  def insert(attrs, data_types_list \\ nil) do
    attrs = params(attrs, data_types_list)
    EbnisData.create_experience(attrs)
  end

  def params() do
    params(%{})
  end

  def params(attrs, data_types_list \\ nil) do
    attrs =
      if is_list(attrs) do
        Map.new(attrs)
      else
        attrs
      end

    all(attrs, data_types_list)
    |> Map.merge(attrs)
  end

  defp make_description(%{description: description_attr}) do
    description_attr
  end

  defp make_description(_) do
    case Enum.random(1..2) do
      1 -> nil
      2 -> "D" <> Sequence.next("")
    end
  end

  defp all(attrs, data_types_list) do
    %{
      title: "E" <> Sequence.next(""),
      data_definitions:
        case data_types_list do
          nil ->
            1..Enum.random(@count)
            |> Enum.map(fn _ -> DataDefinitionFactory.params() end)

          data_types_list ->
            Enum.map(data_types_list, &DataDefinitionFactory.params(type: &1))
        end,
      description: make_description(attrs)
    }
  end

  def stringify(%{} = attrs) do
    attrs
    |> Factory.reject_attrs()
    |> Enum.map(fn
      {:data_definitions, definitions} ->
        {
          "dataDefinitions",
          Enum.map(definitions, &DataDefinitionFactory.stringify/1)
        }

      {k, v} when k in @simple_attrs ->
        {Factory.to_camel_key(k), v}

      {k, %DateTime{} = v} ->
        {Factory.to_camel_key(k), DateTime.to_iso8601(v)}

      {:entries, v} ->
        {"entries",
         Enum.map(
           v,
           &EntryFactory.stringify(&1)
         )}
    end)
    |> Enum.into(%{})
  end
end
