defmodule EbnisData.Factory.Experience1 do
  alias EbnisData.Factory
  alias EbnisData.Factory.FieldDefinition, as: FieldDefinitionFactory
  alias EbnisData.Experience1
  alias EbnisData.Factory.Entry, as: EntryFactory

  @count 1..5
  @simple_attrs [:user_id, :title, :description, :client_id, :id]
  @integers 0..1_000
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
    case Enum.random(1..3) do
      1 -> nil
      2 -> Faker.Lorem.Shakespeare.En.as_you_like_it()
      3 -> Faker.Lorem.Shakespeare.En.king_richard_iii()
    end
  end

  defp all(data_types_list) do
    %{
      title: Enum.random(["E", "e"]) <> "xperience " <> Sequence.next(""),
      field_definitions:
        case data_types_list do
          nil ->
            1..Enum.random(@count)
            |> Enum.map(fn _ -> FieldDefinitionFactory.params() end)

          data_types_list ->
            Enum.map(data_types_list, &FieldDefinitionFactory.params(type: &1))
        end,
      description: description()
    }
  end

  def stringify(%{} = attrs) do
    attrs
    |> Factory.reject_attrs()
    |> Enum.map(fn
      {:field_definitions, field_definitions} ->
        {
          "fieldDefinitions",
          Enum.map(field_definitions, &FieldDefinitionFactory.stringify/1)
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

  def entry(%Experience1{} = experience) do
    fields =
      Enum.map(
        experience.field_definitions,
        fn %{id: id, type: type} ->
          %{
            def_id: id,
            value: Map.new([{type, entry_val(type)}])
          }
        end
      )

    %{fields: fields}
  end

  defp entry_val("integer"), do: Enum.random(@integers)
  defp entry_val("date"), do: Factory.random_date()
  defp entry_val("datetime"), do: Factory.random_datetime()
  defp entry_val("multi_line_text"), do: Faker.Lorem.Shakespeare.En.hamlet()

  defp entry_val("single_line_text"),
    do: Faker.Lorem.Shakespeare.En.as_you_like_it()

  defp entry_val("decimal"),
    do: "#{Enum.random(@integers)}.#{Enum.random(@integers)}"
end
