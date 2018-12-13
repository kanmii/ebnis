defmodule EbnisWeb.Router do
  use EbnisWeb, :router

  pipeline :api do
    plug(:accepts, ["json"])
    plug(EbnisWeb.Auth.Pipeline)
    plug(EbnisWeb.Plug.AuthContexts)
  end

  scope "/" do
    pipe_through(:api)

    if Mix.env() == :dev do
      forward(
        "/graphql",
        Absinthe.Plug.GraphiQL,
        schema: EbnisWeb.Schema,
        context: %{pubsub: EbnisWeb.Endpoint},
        json_codec: Jason
      )
    end

    forward(
      "/",
      Absinthe.Plug,
      schema: EbnisWeb.Schema,
      context: %{pubsub: EbnisWeb.Endpoint},
      json_codec: Jason
    )
  end
end
