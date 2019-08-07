defmodule EbnisData.Factory.User do
  use EbnisData.Factory

  alias EbnisData.Factory

  @simple_attrs [:name, :email, :jwt]

  @doc false
  def insert(_), do: nil

  def params(%{} = attrs) do
    all()
    |> Map.merge(attrs)
  end

  def stringify(%{} = params),
    do:
      params
      |> Factory.reject_attrs()
      |> Enum.map(fn
        {k, v} when k in @simple_attrs ->
          {Factory.to_camel_key(k), v}

        _ ->
          nil
      end)
      |> Enum.reject(&(&1 == nil))
      |> Enum.into(%{})

  defp all do
    %{
      name: "na" <> Sequence.next(""),
      email: "m#{Sequence.next("")}@b.c"
    }
  end
end
