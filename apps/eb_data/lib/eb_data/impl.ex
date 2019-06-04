defmodule EbData.Impl do
  @callback create_exp(map) :: {:ok, map} | {:error, term, map}

  @callback get_exp(
              id :: binary(),
              user_id :: binary() | Integer.t()
            ) :: nil | map

  @callback get_exp(id :: binary()) :: nil | map

  @callback get_user_exps(user_id :: binary() | Integer.t()) :: [map]

  @callback create_entry(map) :: {:ok, map} | {:error, term, map}

  @callback create_entries(map) :: {:ok, map} | {:error, map}

  @callback get_exp_entries(
              exp_id :: binary() | Integer.t(),
              user_id :: binary() | Integer.t()
            ) :: [map]

  @callback list_experiences_entries(
              user_id :: String.t(),
              experiences_ids :: [String.t()],
              pagination_args :: Absinthe.Relay.Connection.Options.t()
            ) :: {:ok, map} | {:error, any}

  @callback get_entry(id :: binary() | Integer.t()) :: map | nil
end
