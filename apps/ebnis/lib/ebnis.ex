defmodule Ebnis do
  @stacktrace "\n\n---------------STACKTRACE---------\n\n"

  def prettify_with_new_line(data, break_on \\ ~S(\n)) do
    data
    |> String.split(break_on)
    |> Enum.map(&[&1, "\n"])
  end

  def stacktrace_prefix do
    @stacktrace
  end
end
