defmodule EbnisWeb.HealthController do
  use EbnisWeb, :controller

  def health(conn, _) do
    text(conn, "ok")
  end
end
