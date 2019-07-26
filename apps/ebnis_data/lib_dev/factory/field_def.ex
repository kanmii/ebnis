defmodule EbnisData.Factory.FieldDef do
  use EbnisData.Factory
  alias EbnisData.FieldType
  alias EbnisData.Factory

  @field_types FieldType.all_types_string()

  @simple_attributes [:name, :client_id]

  def field_types, do: @field_types

  def insert(_attrs), do: nil

  def params(attrs) do
    all()
    |> Map.merge(attrs)
  end

  def all() do
    %{
      name: name(),
      type: Enum.random(@field_types),
      client_id: Sequence.next("")
    }
  end

  def all(field_type) when field_type in @field_types do
    %{
      name: name(),
      type: field_type
    }
  end

  defp name do
    Enum.random(["F", "f"]) <> "ield " <> Sequence.next("")
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
