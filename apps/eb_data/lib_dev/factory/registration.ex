defmodule EbData.Factory.Registration do
  use EbData.Factory

  alias EbData.Factory.User, as: UserFactory
  alias EbData.Factory

  @simple_attrs [
    :name,
    :email,
    :source,
    :password,
    :password_confirmation,
    :jwt
  ]

  def insert(params) do
    {:ok, registration} =
      params
      |> params()
      |> EbData.register()

    registration
  end

  def params(%{} = attrs) do
    all()
    |> Map.merge(attrs)
  end

  def stringify(%{} = params) do
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
  end

  defp all do
    password = Faker.String.base64()

    %{
      source: "password",
      password: password,
      password_confirmation: password
    }
    |> Map.merge(UserFactory.params())
  end
end
