defmodule EbnisWeb.Plug.Pipeline do
  use Guardian.Plug.Pipeline, otp_app: :ebnis_web

  plug(Guardian.Plug.VerifyHeader, realm: "Bearer")
  plug(Guardian.Plug.LoadResource, allow_blank: true)

  def auth_error(conn, {type, _reason}, _opts) do
    body = Jason.encode!(%{message: to_string(type)})
    Plug.Conn.send_resp(conn, 401, body)
  end
end
