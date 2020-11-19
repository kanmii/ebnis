defmodule EbnisWeb.Plug.ApiAuth do
  @moduledoc false
  use Pow.Plug.Base

  alias Pow.Store.CredentialsCache
  alias PowPersistentSession.Store.PersistentSessionCache

  @doc """
  Given a user, creates an access and renewal token for the user.

  The tokens are added to the `conn.private` as `:api_access_token` and
  `:api_renewal_token`. The renewal token is stored in the access token
  metadata and vice versa.
  """
  @impl true
  @spec create(Plug.Conn.t(), map(), Pow.Config.t()) :: {Plug.Conn.t(), map()}
  def create(conn, user, config) do
    store_config = store_config(config)
    access_token = Pow.UUID.generate()
    renewal_token = Pow.UUID.generate()

    conn =
      conn
      |> Plug.Conn.put_private(
        :api_access_token,
        sign_token(conn, access_token, config)
      )
      |> Plug.Conn.put_private(
        :api_renewal_token,
        sign_token(conn, renewal_token, config)
      )

    CredentialsCache.put(
      store_config,
      access_token,
      {user, [renewal_token: renewal_token]}
    )

    PersistentSessionCache.put(
      store_config,
      renewal_token,
      {[id: user.id], [access_token: access_token]}
    )

    Absinthe.Plug.put_options(conn, context: %{current_user: user})

    {conn, user}
  end

  @doc """
  Delete the access token from the cache.

  The renewal token is deleted by fetching it from the access token metadata.
  """
  @impl true
  @spec delete(Plug.Conn.t(), Pow.Config.t()) :: Plug.Conn.t()
  def delete(conn, config) do
    store_config = store_config(config)

    with {:ok, signed_token} <- fetch_access_token(conn),
         {:ok, token} <- verify_token(conn, signed_token, config),
         {_user, metadata} <- CredentialsCache.get(store_config, token) do
      PersistentSessionCache.delete(store_config, metadata[:renewal_token])
      CredentialsCache.delete(store_config, token)
    else
      _any -> :ok
    end

    conn
  end

  @doc """
  Fetches the user from access token.
  """
  @impl true
  @spec fetch(Plug.Conn.t(), Pow.Config.t()) :: {Plug.Conn.t(), map() | nil}
  def fetch(conn, config) do
    with {:ok, signed_token} <- fetch_access_token(conn),
         {:ok, token} <- verify_token(conn, signed_token, config),
         {user, _metadata} <- CredentialsCache.get(store_config(config), token) do
      Absinthe.Plug.put_options(conn, context: %{current_user: user})

      {conn, user}
    else
      _any -> {conn, nil}
    end
  end

  @doc """
  Creates new tokens using the renewal token.

  The access token, if any, will be deleted by fetching it from the renewal
  token metadata. The renewal token will be deleted from the store after the
  it has been fetched.
  """
  @spec renew(Plug.Conn.t(), Pow.Config.t()) :: {Plug.Conn.t(), map() | nil}
  def renew(conn, config) do
    store_config = store_config(config)

    with {:ok, signed_token} <- fetch_access_token(conn),
         {:ok, token} <- verify_token(conn, signed_token, config),
         {clauses, metadata} <- PersistentSessionCache.get(store_config, token) do
      CredentialsCache.delete(store_config, metadata[:access_token])
      PersistentSessionCache.delete(store_config, token)

      load_and_create_session(conn, {clauses, metadata}, config)
    else
      _any -> {conn, nil}
    end
  end

  defp load_and_create_session(conn, {clauses, _metadata}, config) do
    case Pow.Operations.get_by(clauses, config) do
      nil -> {conn, nil}
      user -> create(conn, user, config)
    end
  end

  defp sign_token(conn, token, config) do
    Pow.Plug.sign_token(conn, signing_salt(), token, config)
  end

  defp signing_salt() do
    Atom.to_string(__MODULE__)
  end

  defp fetch_access_token(conn) do
    case Plug.Conn.get_req_header(conn, "authorization") do
      [token | _rest] ->
        {:ok, token}

      _any ->
        :error
    end
  end

  defp verify_token(conn, token, config) do
    Pow.Plug.verify_token(conn, signing_salt(), token, config)
  end

  defp store_config(config) do
    backend =
      Pow.Config.get(
        config,
        :cache_store_backend,
        Pow.Store.Backend.EtsCache
      )

    [backend: backend]
  end
end
