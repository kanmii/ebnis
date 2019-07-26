defmodule EbnisWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :ebnis_web
  use Absinthe.Phoenix.Endpoint

  if Application.get_env(:ebnis_web, :sql_sandbox) do
    plug(Phoenix.Ecto.SQL.Sandbox)
  end

  socket "/socket", EbnisWeb.UserSocket,
    websocket: true,
    longpoll: false

  plug Plug.RequestId
  plug Plug.Telemetry, event_prefix: [:phoenix, :endpoint]

  plug Plug.Parsers,
    parsers: [
      :urlencoded,
      :multipart,
      :json,
      Absinthe.Plug.Parser
    ],
    pass: ["*/*"],
    json_decoder: Phoenix.json_library()

  plug Plug.MethodOverride
  plug Plug.Head

  # The session will be stored in the cookie and signed,
  # this means its contents can be read but not tampered with.
  # Set :encryption_salt if you would also like to encrypt it.
  plug Plug.Session,
    store: :cookie,
    key: "_ebnis_web_key",
    signing_salt: "y6xBzP2Z"

  plug(
    Corsica,
    origins: "*",
    allow_headers: ~w(Accept Content-Type Authorization Origin)
  )

  plug EbnisWeb.Router
end
