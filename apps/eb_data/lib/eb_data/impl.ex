defmodule EbData.Impl do
  alias Ecto.Changeset
  alias EbData.DefaultImpl.Entry

  @type sync_offline_experience_attributes_t ::
          %{
            user_id: String.t(),
            experience: Map.t()
          }

  @type sync_offline_experience_success_t ::
          {:ok, Experience.t(), [%Changeset{}]}

  @type sync_offline_experience_failure_t :: {:error, %Changeset{}}

  @type create_entries_attributes_t :: %{
          entries: [
            %{
              exp_id: String.t(),
              list_of_fields: [[Map.t()]]
            }
          ],
          user_id: String.t()
        }

  @type create_entries_returned_t :: %{
          required(String.t()) => %{
            exp_id: String.t(),
            entries: [Entry.t()],
            errors: [
              %{
                client_id: String.t(),
                error: Changeset.t()
              }
            ]
          }
        }

  @type list_entries_from_experiences_ids_args_t :: %{
          user_id: String.t(),
          experiences_ids: [String.t()],
          pagination_args: Absinthe.Relay.Connection.Options.t()
        }

  @type list_entries_from_experiences_ids_return_t :: [
          %{
            exp_id: String.t(),
            entry_connection: Absinthe.Relay.Connection.t()
          }
        ]

  @type get_experiences_args_t :: %{
          pagination_args: Absinthe.Relay.Connection.Options.t(),
          user_id: binary() | Integer.t(),
          ids: [binary() | Integer.t()],
          client_ids: [binary() | Integer.t()]
        }

  @callback create_exp(map) :: {:ok, map} | {:error, term, map}

  @callback get_experience(
              id :: binary(),
              user_id :: binary() | Integer.t()
            ) :: nil | map

  @callback get_experience(id :: binary()) :: nil | map

  @callback get_experiences(args :: get_experiences_args_t) ::
              {:ok, Absinthe.Relay.Connection.t()} | {:error, any}

  @callback create_entry(map) :: {:ok, map} | {:error, term, map}

  @callback create_entries(create_entries_attributes_t()) :: create_entries_returned_t()

  @callback list_entries_from_experiences_ids(args :: list_entries_from_experiences_ids_args_t) ::
              list_entries_from_experiences_ids_return_t

  @callback get_entry(id :: binary() | Integer.t()) :: map | nil

  @callback sync_offline_experience(attr :: sync_offline_experience_attributes_t) ::
              sync_offline_experience_success_t | sync_offline_experience_failure_t
end
