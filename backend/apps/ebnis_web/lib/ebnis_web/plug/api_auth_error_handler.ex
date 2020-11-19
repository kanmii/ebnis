defmodule EbnisWeb.Plug.ApiAuthErrorHandler do
  use EbnisWeb, :controller

  @spec call(Plug.Conn.t(), :not_authenticated) :: Plug.Conn.t()
  def call(conn, :not_authenticated) do
    # We currently do not use this plug at all
    # But once we start filtering out routes that need authentication and
    # must be stopped at Plug level, then this plug should come in handy
    conn
    |> put_status(401)
    |> json(%{error: %{code: 401, message: "Not authenticated"}})
  end
end
