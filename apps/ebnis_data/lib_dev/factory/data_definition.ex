defmodule EbnisData.Factory.DataDefinition do
  use EbnisData.Factory

  alias EbnisData.DataType
  alias EbnisData.Factory

  @data_types DataType.all_types()

  @simple_attributes [:name, :client_id, :id]

  def data_types, do: @data_types

  def insert(_attrs), do: nil

  def params(attrs) do
    all()
    |> Map.merge(attrs)
  end

  def all() do
    %{
      name: name(),
      type: Enum.random(@data_types),
      client_id: Sequence.next("")
    }
  end

  defp name do
    Enum.random(["F", "f"]) <> Sequence.next("")
  end

  def stringify(field) do
    Enum.map(field, fn
      {:type, v} ->
        {"type", String.upcase(v)}

      {k, v} when k in @simple_attributes ->
        {Factory.to_camel_key(k), v}
    end)
    |> Enum.into(%{})
  end
end
