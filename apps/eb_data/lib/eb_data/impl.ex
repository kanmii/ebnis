defmodule EbData.Impl do
  alias Ecto.Changeset

  @type sync_offline_experience_attributes_t ::
          %{
            :client_id => String.t() | Integer.t(),
            :entries => [Map.t()],
            optional(:__struct__) => none,
            optional(atom | binary) => any
          }

  @type sync_offline_experience_success_t :: {
          :ok,
          Experience.t(),
          List.t()
        }

  @type create_entries_attributes_t :: %{
          exp_id: String.t(),
          list_of_fields: [[Map.t()]],
          user_id: String.t()
        }

  @callback create_exp(map) :: {:ok, map} | {:error, term, map}

  @callback get_exp(
              id :: binary(),
              user_id :: binary() | Integer.t()
            ) :: nil | map

  @callback get_exp(id :: binary()) :: nil | map

  @callback get_user_exps(
              user_id :: binary() | Integer.t(),
              pagination_args :: Absinthe.Relay.Connection.Options.t()
            ) :: {:ok, map} | {:error, any}

  @callback create_entry(map) :: {:ok, map} | {:error, term, map}

  @callback create_entries(map) :: [any]

  @callback list_experiences_entries(
              user_id :: String.t(),
              experiences_ids :: [String.t()],
              pagination_args :: Absinthe.Relay.Connection.Options.t()
            ) :: [Absinthe.Relay.Connection.t()]

  @callback get_entry(id :: binary() | Integer.t()) :: map | nil

  @callback sync_offline_experience(attr :: sync_offline_experience_attributes_t) ::
              sync_offline_experience_success_t | {:error, Changeset.t()}
end
