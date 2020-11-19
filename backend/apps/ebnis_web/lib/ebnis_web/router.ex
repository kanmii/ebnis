defmodule EbnisWeb.Router do
  use EbnisWeb, :router

  @is_e2e Application.compile_env(:ebnis, :is_e2e)

  @enable_graphql_plug Application.get_env(
                         :ebnis_web,
                         Absinthe.Plug.GraphiQL,
                         []
                       )
                       |> Keyword.get(:enabled, false)

  pipeline :api do
    plug(:accepts, ["json"])

    # TODO: delete this and associated module
    # Guardian app will check auth header and load resource_from_token
    # but will not error if resource not found
    plug(EbnisWeb.Plug.Pipeline)

    # TODO: delete this and associated module
    # A plug to put loaded resource into absinthe context
    plug(EbnisWeb.Plug.AuthContext)

    # Combines the above two plugs
    plug(
      EbnisWeb.Plug.ApiAuth,
      otp_app: :ebnis_data
    )

    # TODO: delete this and associated module
    # is this plug required? ApiAuth should be enough
    # plug(
    #   EbnisWeb.Plug.RequireAuthenticated,
    #   error_handler: EbnisWeb.Plug.ApiAuthErrorHandler
    # )
  end

  get("/health", EbnisWeb.HealthController, :health)

  if @is_e2e do
    scope "/" do
      get("/reset_db", EbnisWeb.E2eController, :reset_db)
      post("/create_user", EbnisWeb.E2eController, :create_user)
    end
  end

  scope "/" do
    pipe_through(:api)

    if @enable_graphql_plug do
      forward(
        "/___graphql",
        Absinthe.Plug.GraphiQL,
        schema: EbnisData.Schema,
        context: %{pubsub: EbnisWeb.Endpoint},
        json_codec: Jason,
        socket: EbnisWeb.UserSocket
      )
    end

    forward(
      "/",
      Absinthe.Plug,
      schema: EbnisData.Schema,
      context: %{pubsub: EbnisWeb.Endpoint},
      json_codec: Jason
    )
  end
end

if Application.compile_env(:ebnis, :is_e2e) do
  defmodule EbnisWeb.E2eController do
    use EbnisWeb, :controller

    def reset_db(conn, _) do
      case EbnisData.Repo.reset_db() do
        {:ok, _response} ->
          resp(conn, 200, "ok")

        _ ->
          resp(conn, 400, "error")
      end
    end

    def create_user(conn, %{"user" => user_creation_params}) do
      alias EbnisData.Guardian, as: AppGuardian

      with {:ok, user} <- EbnisData.register(user_creation_params),
           {:ok, jwt, _claim} <- AppGuardian.encode_and_sign(user) do
        user_with_jwt =
          user
          |> Map.take([:id, :email, :name])
          |> Map.put(:jwt, jwt)

        json(
          conn,
          user_with_jwt
        )
      else
        _ ->
          json(conn, %{error: true})
      end
    end
  end
end
