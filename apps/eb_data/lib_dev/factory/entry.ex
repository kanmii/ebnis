defmodule EbData.Factory.Entry do
  alias EbData.Factory
  alias EbData.DefaultImpl.Experience
  alias EbData.FieldType
  alias EbnisWeb.Resolver

  @integers 0..1_000

  @all_types FieldType.all_types_string()

  @simple_attributes [:client_id]

  def insert(%Experience{} = exp) do
    insert(exp, %{})
  end

  def insert(%Experience{} = exp, attrs) when is_list(attrs) do
    insert(exp, Map.new(attrs))
  end

  def insert(%Experience{} = exp, %{} = attrs) do
    {:ok, entry} =
      exp
      |> params(attrs)
      |> EbData.create_entry()

    entry
  end

  def params(%Experience{} = exp) do
    params(exp, %{})
  end

  def params(%Experience{} = exp, attrs) when is_list(attrs) do
    params(exp, Map.new(attrs))
  end

  def params(%Experience{} = exp, %{} = attrs) do
    fields =
      Enum.map(exp.field_defs, fn %{id: id, type: type} ->
        %{
          def_id: id,
          data: data(type)
        }
      end)

    %{
      fields: fields,
      exp_id: exp.id,
      user_id: exp.user_id
    }
    |> Map.merge(attrs)
  end

  def field(attrs \\ %{})

  def field(attrs) when is_list(attrs), do: field(Map.new(attrs))

  def field(attrs) do
    type = Enum.random(@all_types)
    Map.put(attrs, :data, data(type))
  end

  def data("integer"), do: %{"integer" => Enum.random(@integers)}
  def data("date"), do: %{"date" => Factory.random_date()}
  def data("datetime"), do: %{"datetime" => Factory.random_datetime()}

  def data("multi_line_text"),
    do: %{"multi_line_text" => Faker.Lorem.Shakespeare.En.hamlet()}

  def data("single_line_text"),
    do: %{"single_line_text" => Faker.Lorem.Shakespeare.En.as_you_like_it()}

  def data("decimal"),
    do: %{"decimal" => "#{Enum.random(@integers)}.#{Enum.random(@integers)}"}

  def stringify(%{} = attrs) do
    Enum.reduce(attrs, %{}, fn
      {:fields, fields}, acc ->
        Map.put(acc, "fields", Enum.map(fields, &stringify_field/1))

      {:exp_id, v}, acc ->
        Map.put(acc, "expId", Resolver.convert_to_global_id(v, :experience))

      {k, v}, acc when k in @simple_attributes ->
        Map.put(acc, Factory.to_camel_key(k), v)

      _, acc ->
        acc
    end)
  end

  def stringify_field(%{} = field) do
    Enum.map(field, fn
      {:def_id, v} ->
        {"defId", v}

      {:data, data} ->
        {:ok, val} = FieldType.serialize_k_v(data)

        {"data", Jason.encode!(val)}
    end)
    |> Enum.into(%{})
  end
end
