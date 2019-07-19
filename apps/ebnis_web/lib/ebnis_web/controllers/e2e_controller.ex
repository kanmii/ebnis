defmodule EbnisWeb.E2eController do
  use EbnisWeb, :controller

  if Mix.env() == :e2e do
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
