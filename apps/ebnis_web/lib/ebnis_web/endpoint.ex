defmodule EbnisWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :ebnis_web
  use Absinthe.Phoenix.Endpoint

  socket "/socket", EbnisWeb.UserSocket,
    websocket: [timeout: 45_000],
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

  plug(
    Corsica,
    origins: "*",
    allow_headers: ~w(
      Accept
      Content-Type
      Authorization
      Origin
    )
  )

  plug EbnisWeb.Router
end
