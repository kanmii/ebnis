defmodule EbnisWeb.UserSocket do
  use Phoenix.Socket

  use Absinthe.Phoenix.Socket,
    schema: EbnisData.Schema

  alias EbnisData.Guardian, as: GuardianApp

  ## Channels
  channel("data:*", EbnisWeb.DataChannel)

  def connect(%{"token" => token} = params, socket) do
    case GuardianApp.resource_from_token(token) do
      {:ok, user, _claims} ->
        {
          :ok,
          socket
          |> assign(:user, user)
          |> Absinthe.Phoenix.Socket.put_options(
            context: %{
              current_user: user,
              client_session: params["session_id"],
              client_token: token
            }
          )
        }

      _ ->
        :error
    end
  end

  def connect(_params, socket), do: {:ok, socket}

  # Socket id's are topics that allow you to identify all sockets for a given user:
  #
  #     def id(socket), do: "user_socket:#{socket.assigns.user_id}"
  #
  # Would allow you to broadcast a "disconnect" event and terminate
  # all active sockets and channels for a given user:
  #
  #     EbnisWeb.Endpoint.broadcast("user_socket:#{user.id}", "disconnect", %{})
  #
  # Returning `nil` makes this socket anonymous.
  def id(_socket), do: nil
end
