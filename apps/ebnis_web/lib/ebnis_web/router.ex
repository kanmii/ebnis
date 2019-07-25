defmodule EbnisWeb.Router do
  use EbnisWeb, :router

  pipeline :api do
    plug(:accepts, ["json"])
    plug(EbnisWeb.Auth.Pipeline)
    plug(EbnisWeb.Plug.AuthContexts)
  end

  if Mix.env() == :e2e do
    scope "/" do
      get("/reset_db", EbnisWeb.E2eController, :reset_db)
      post("/create_user", EbnisWeb.E2eController, :create_user)
    end
  end

  scope "/" do
    pipe_through(:api)

    if Mix.env() == :dev do
      forward(
        "/___graphql",
        Absinthe.Plug.GraphiQL,
        schema: EbData.Schema,
        context: %{pubsub: EbnisWeb.Endpoint},
        json_codec: Jason
      )
    end

    forward(
      "/",
      Absinthe.Plug,
      schema: EbData.Schema,
      context: %{pubsub: EbnisWeb.Endpoint},
      json_codec: Jason
    )
  end
end

if Mix.env() == :e2e do
  defmodule EbnisWeb.E2eController do
    use EbnisWeb, :controller

    def reset_db(conn, _) do
      case EbData.DefaultImpl.Repo.reset_db() do
        {:ok, _} ->
          resp(conn, 200, "ok")

        _ ->
          resp(conn, 400, "error")
      end
    end

    def create_user(conn, %{"user" => user_creation_params}) do
      alias EbData.Guardian, as: AppGuardian

      with {:ok, user} <- EbData.register(user_creation_params),
           {:ok, jwt, _claim} <- AppGuardian.encode_and_sign(user) do
        json(
          conn,
          user
          |> Map.take([:id, :email, :name])
          |> Map.put(:jwt, jwt)
        )
      else
        _ ->
          json(conn, %{error: true})
      end
    end
  end
end
