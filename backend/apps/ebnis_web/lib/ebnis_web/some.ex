defmodule EbnisWeb.Some do
  alias Plug.Conn
  alias EbnisWeb.Endpoint

  @password "secret1234"

  def make_conn do
    pow_config = [
      otp_app: :ebnis_data,
      plug: EbnisWeb.Plug.ApiAuth
    ]

    conn =
      %Conn{}
      |> Map.put(
        :secret_key_base,
        Endpoint.config(:secret_key_base)
      )
      |> Conn.put_private(
        :pow_config,
        pow_config
      )

    conn
  end

  def with_auth_header(conn, token) do
    Conn.put_req_header(conn, "authorization", token)
  end

  def valid_params do
    %{
      "email" => "test2@example.com",
      "password" => @password,
      "password_confirmation" => @password
    }
  end

  def invalid_params do
    %{
      "email" => "invalid",
      "password" => @password,
      "password_confirmation" => ""
    }
  end

  def create_user do
    make_conn()
    |> Pow.Plug.create_user(valid_params())
  end
end
