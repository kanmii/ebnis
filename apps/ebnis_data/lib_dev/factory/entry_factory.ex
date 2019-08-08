defmodule EbnisData.Factory.Entry do
  alias EbnisData.Factory
  alias EbnisData.Resolver

  @integers 100..110

  @simple_attributes [:client_id]
  @iso_extended_format "{ISO:Extended:Z}"

  def insert(attrs, experience)

  def insert(%{} = attrs, experience) do
    {:ok, entry} =
      experience
      |> params(attrs)
      |> Map.put(:user_id, experience.user_id)
      |> EbnisData.create_entry()

    entry
  end

  def params(%{} = experience) do
    params(experience, %{})
  end

  def params(%{} = experience, attrs) when is_list(attrs) do
    params(experience, Map.new(attrs))
  end

  def params(
        %{data_definitions: data_definitions} = experience,
        %{} = attrs
      ) do
    experience =
      if match?(%_{}, experience) do
        Map.from_struct(experience)
      else
        experience
      end

    data_objects =
      Enum.map(data_definitions, fn
        data_definition ->
          data_definition =
            if match?(%_{}, data_definition) do
              Map.from_struct(data_definition)
            else
              data_definition
            end

          %{
            definition_id:
              data_definition[:id] ||
                data_definition[:client_id] ||
                "0",
            data: data(data_definition.type)
          }
      end)

    experience_id =
      experience[:id] ||
        experience[:client_id] ||
        "0"

    %{
      data_objects: data_objects,
      exp_id: experience_id,
      experience_id: experience_id
    }
    |> Map.merge(attrs)
  end

  def params_list(how_many, experience, attrs \\ %{}) do
    1..how_many
    |> Enum.map(fn _ -> params(experience, attrs) end)
  end

  def data("integer"), do: %{"integer" => Enum.random(@integers)}
  def data("date"), do: %{"date" => Factory.random_date()}
  def data("datetime"), do: %{"datetime" => Factory.random_datetime()}

  def data("multi_line_text"),
    do: %{"multi_line_text" => "m" <> Sequence.next("")}

  def data("single_line_text"),
    do: %{"single_line_text" => "s" <> Sequence.next("")}

  def data("decimal"),
    do: %{"decimal" => "0.#{Enum.random(@integers)}"}

  def stringify(%{} = attrs) do
    Enum.reduce(attrs, %{}, fn
      {:data_objects, data_objects}, acc ->
        Map.put(
          acc,
          "dataObjects",
          Enum.map(data_objects, &stringify_entry_data/1)
        )

      {:experience_id, v}, acc ->
        Map.put(
          acc,
          "experienceId",
          Resolver.convert_to_global_id(v, :experience)
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
