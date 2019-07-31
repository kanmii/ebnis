defmodule Ebnis do
  def prettify_with_new_line(data, break_on \\ ~S(\n)) do
    data
    |> String.split(break_on)
    |> Enum.map(&[&1, "\n"])
  end
end
