defmodule EbnisData.FieldType do
  @behaviour Ecto.Type

  @iso_extended_format "{ISO:Extended:Z}"

  @all_types [
    "single_line_text",
    "multi_line_text",
    "integer",
    "decimal",
    "date",
    "datetime"
  ]

  @doc ~S"""
  Turn both key and value to map only so we get:
  %{"date" => "2015-01-10" }
  """

  def serialize_k_v(%{} = val) do
    [{k, v}] = Map.to_list(val)

    serialize_k_v(k, v)
  end

  def serialize_k_v(_), do: :error

  defp serialize_k_v("single_line_text", v) do
    to_map("single_line_text", to_string(v))
  end

  defp serialize_k_v("multi_line_text", v) do
    to_map("multi_line_text", to_string(v))
  end

  defp serialize_k_v("integer", v) when is_integer(v) do
    to_map("integer", v)
  end

  defp serialize_k_v("decimal", v) when is_float(v) or is_integer(v) do
    to_map("decimal", v / 1)
  end

  defp serialize_k_v("date", %Date{} = date) do
    to_map("date", Date.to_iso8601(date))
  end

  defp serialize_k_v("datetime", %DateTime{} = val) do
    to_map("datetime", DateTime.to_iso8601(val))
  end

  defp serialize_k_v(_, _), do: :error

  def parse(%{} = val) do
    [{k, v}] = Map.to_list(val)

    parse(k, v)
  end

  defp parse("single_line_text", v) do
    to_map("single_line_text", to_string(v))
  end

  defp parse("multi_line_text", v) do
    to_map("multi_line_text", to_string(v))
  end

  defp parse("integer", val) when is_integer(val) do
    to_map("integer", val)
  end

  defp parse("integer", val) when is_binary(val) do
    try do
      to_map("integer", String.to_integer(val))
    rescue
      _ ->
        :error
    end
  end

  defp parse("decimal", v) when is_float(v) or is_integer(v) do
    to_map("decimal", v / 1)
  end

  defp parse("decimal", v) when is_binary(v) do
    try do
      to_map("decimal", String.to_float(v))
    rescue
      _ ->
        :error
    end
  end

  defp parse("date", %Date{} = v) do
    to_map("date", v)
  end

  defp parse("date", v) when is_binary(v) do
    case Date.from_iso8601(v) do
      {:ok, v} ->
        to_map("date", v)

      _ ->
        :error
    end
  end

  defp parse("datetime", %DateTime{} = v) do
    to_map("datetime", v)
  end

  defp parse("datetime", val) when is_binary(val) do
    case Timex.parse(val, @iso_extended_format) do
      {:ok, v} ->
        to_map("datetime", v)

      _ ->
        :error
    end
  end

  defp parse(_, _), do: :error

  defp to_map(key, val) when is_binary(key) do
    {:ok, Map.new([{key, val}])}
  end

  def all_types, do: @all_types

  ##################### @behaviour Ecto.Type  ##############################

  def type, do: :map

  def cast(data), do: parse(data)

  def load(val) when is_map(val), do: parse(val)

  def dump(val), do: parse(val)
end
