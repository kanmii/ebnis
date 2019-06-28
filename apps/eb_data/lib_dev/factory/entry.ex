defmodule EbData.Factory.Entry do
  alias EbData.Factory
  alias EbData.FieldType
  alias EbnisWeb.Resolver
  alias EbData.DefaultImpl.Experience

  @integers 0..1_000

  @all_types FieldType.all_types_string()

  @simple_attributes [:client_id]
  @iso_extended_format "{ISO:Extended:Z}"

  def insert(%{} = exp) do
    insert(exp, %{})
  end

  def insert(%{} = exp, attrs) when is_list(attrs) do
    insert(exp, Map.new(attrs))
  end

  def insert(%{} = exp, %{} = attrs) do
    {:ok, entry} =
      exp
      |> params(attrs)
      |> EbData.create_entry()

    entry
  end

  def params(%{} = exp) do
    params(exp, %{})
  end

  def params(%{} = exp, attrs) when is_list(attrs) do
    params(exp, Map.new(attrs))
  end

  def params(%Experience{} = exp, %{} = attrs) do
    fields =
      Enum.map(exp.field_defs, fn field_def ->
        %{
          def_id: field_def.id,
          data: data(field_def.type)
        }
      end)

    %{
      fields: fields,
      exp_id: exp.id,
      user_id: exp.user_id
    }
    |> Map.merge(attrs)
  end

  def params(%{} = exp, %{} = attrs) do
    fields =
      Enum.map(exp.field_defs, fn
        field_def ->
          %{
            def_id: field_def[:id] || field_def[:client_id] || "0",
            data: data(field_def.type)
          }
      end)

    %{
      fields: fields,
      exp_id: exp[:id] || exp[:client_id] || "0",
      user_id: exp[:user_id]
    }
    |> Map.merge(attrs)
  end

  def params_list(how_many, exp, attrs \\ %{}) do
    1..how_many
    |> Enum.map(fn _ -> params(exp, attrs) end)
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

  def stringify(%{} = attrs, settings \\ %{}) do
    experience_id_to_global = settings[:experience_id_to_global]

    Enum.reduce(attrs, %{}, fn
      {:fields, fields}, acc ->
        Map.put(acc, "fields", Enum.map(fields, &stringify_field/1))

      {:exp_id, v}, acc ->
        value =
          cond do
            experience_id_to_global == true || attrs[:client_id] == nil ->
              Resolver.convert_to_global_id(v, :experience)

            true ->
              v
          end

        Map.put(acc, "expId", value)

      {k, v}, acc when k in @simple_attributes ->
        Map.put(acc, Factory.to_camel_key(k), v)

      {k, %DateTime{} = v}, acc ->
        Map.put(
          acc,
          Factory.to_camel_key(k),
          Timex.format!(v, @iso_extended_format)
        )

      _, acc ->
        acc
    end)
  end

  def stringify_field(%{} = field) do
    Enum.map(field, fn
      {:def_id, v} ->
        {"defId", v}

      {:data, data} ->
        {"data", Jason.encode!(data)}
    end)
    |> Enum.into(%{})
  end
end
