defmodule EbnisData.DataTypeTest do
  use ExUnit.Case, async: true
  alias EbnisData.DataType

  test "successful parse decimal: integer string" do
    assert {:ok, %{"decimal" => 1.0}} = DataType.parse(%{"decimal" => "1"})
  end

  test "successful parse decimal: float string" do
    assert {:ok, %{"decimal" => 1.0}} = DataType.parse(%{"decimal" => "1.0"})
  end

  test "error parsing decimal from non float/integer string" do
    assert :error = DataType.parse(%{"decimal" => "x"})
  end
end
