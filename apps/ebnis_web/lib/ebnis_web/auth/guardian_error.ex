defmodule EbnisWeb.Auth.GuardianError do
  def auth_error(conn, {type, _reason}, _opts) do
    body = Jason.encode!(%{message: to_string(type)})
    Plug.Conn.send_resp(conn, 401, body)
  end
end
