defmodule EbData.Factory.FieldDef do
  use EbData.Factory
  alias EbData.FieldType

  @field_types FieldType.all_types_string()

  def field_types, do: @field_types

  def insert(_attrs), do: nil

  def params(attrs) do
    all()
    |> Map.merge(attrs)
  end

  def all() do
    %{
      name: name(),
      type: Enum.random(@field_types)
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

      {:name, v} ->
        {"name", v}
    end)
    |> Enum.into(%{})
  end
end
