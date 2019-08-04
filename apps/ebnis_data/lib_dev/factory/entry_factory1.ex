defmodule EbnisData.Factory.Entry1 do
  alias EbnisData.Factory
  alias EbnisData.FieldType
  alias EbnisData.Resolver

  @integers 100..1_000

  @all_types FieldType.all_types_string()

  @simple_attributes [:client_id]
  @iso_extended_format "{ISO:Extended:Z}"

  def insert(attrs, experience \\ nil)

  def insert(%{} = attrs, experience) do
    attrs =
      case experience do
        nil ->
          attrs

        _ ->
          params(experience, attrs)
          |> Map.put(:user_id, experience.user_id)
      end

    {:ok, entry} = EbnisData.create_entry1(attrs)

    entry
  end

  def insert(attrs, %{} = experience) when is_list(attrs) do
    insert(Map.new(attrs), experience)
  end

  def params(%{} = experience) do
    params(experience, %{})
  end

  def params(%{} = experience, attrs) when is_list(attrs) do
    params(experience, Map.new(attrs))
  end

  def params(
        %{field_definitions: field_definitions} = experience,
        %{} = attrs
      ) do
    experience =
      if match?(%_{}, experience) do
        Map.from_struct(experience)
      else
        experience
      end

    entry_data_list =
      Enum.map(field_definitions, fn
        field_definition ->
          field_definition =
            if match?(%_{}, field_definition) do
              Map.from_struct(field_definition)
            else
              field_definition
            end

          %{
            field_definition_id:
              field_definition[:id] ||
                field_definition[:client_id] ||
                "0",
            data: data(field_definition.type)
          }
      end)

    experience_id =
      experience[:id] ||
        experience[:client_id] ||
        "0"

    %{
      entry_data_list: entry_data_list,
      exp_id: experience_id,
      experience_id: experience_id
    }
    |> Map.merge(attrs)
  end

  def params_list(how_many, experience, attrs \\ %{}) do
    1..how_many
    |> Enum.map(fn _ -> params(experience, attrs) end)
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
      {:entry_data_list, entry_data_list}, acc ->
        Map.put(
          acc,
          "entryDataList",
          Enum.map(entry_data_list, &stringify_entry_data/1)
        )

      {:experience_id, v}, acc ->
        Map.put(
          acc,
          "experienceId",
          Resolver.convert_to_global_id(v, :experience1)
        )

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

  def stringify_entry_data(%{} = entry_data) do
    Enum.map(entry_data, fn
      {:data, data} ->
        {"data", Jason.encode!(data)}

      {k, v} ->
        {Factory.to_camel_key(k), v}
    end)
    |> Enum.into(%{})
  end
end
