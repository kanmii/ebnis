defmodule EbnisData.Factory.Experience do
  alias EbnisData.Factory
  alias EbnisData.Factory.DataDefinition, as: DataDefinitionFactory
  alias EbnisData.Factory.Entry, as: EntryFactory

  @count 1..5
  @simple_attrs [:user_id, :title, :description, :client_id, :id]
  @iso_extended_format "{ISO:Extended:Z}"

  def insert(attrs, data_types_list \\ nil) do
    attrs = params(attrs, data_types_list)

    {:ok, experience} = EbnisData.create_experience(attrs)

    experience
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

    all(data_types_list)
    |> Map.merge(attrs)
  end

  defp description do
    case Enum.random(1..2) do
      1 -> nil
      2 -> "D" <> Sequence.next("")
    end
  end

  defp all(data_types_list) do
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
      description: description()
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
        {Factory.to_camel_key(k), Timex.format!(v, @iso_extended_format)}

      {:entries, v} ->
        {"entries", Enum.map(v, &EntryFactory.stringify/1)}
    end)
    |> Enum.into(%{})
  end
end
