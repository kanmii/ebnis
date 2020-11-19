defmodule EbnisWeb.Plug.RequireAuthenticated do
  @moduledoc """
  ___ copied from Pow.Plug.RequireAuthenticated ___

  This plug ensures that a user has been authenticated.

  You can see `Pow.Phoenix.PlugErrorHandler` for an example of the error
  handler module.

  ## Example

      plug EEx.Plug.RequireAuthenticated,
        error_handler: MyApp.CustomErrorHandler
  """
  alias Plug.Conn
  alias Pow.{Config, Plug}

  @doc false
  @spec init(Config.t()) :: atom()
  def init(config) do
    Config.get(config, :error_handler) || raise_no_error_handler!()
  end

  @doc false
  @spec call(Conn.t(), atom()) :: Conn.t()
  def call(conn, handler) do
    conn
    |> Plug.current_user()
    |> maybe_halt(conn, handler)
  end

  # For now, we will allow all requests to go through
  # But may be in the future, we will halt certain requests if not authenticated

  # defp maybe_halt(nil, conn, handler) do
  #   conn
  #   |> handler.call(:not_authenticated)
  #   |> Conn.halt()
  # end

  defp maybe_halt(_user, conn, _handler), do: conn

  @spec raise_no_error_handler!() :: no_return()
  defp raise_no_error_handler! do
    Config.raise_error(
      "No :error_handler configuration option provided. It's required to set this when using #{
        inspect(__MODULE__)
      }."
    )
  end
end
