defmodule EbData.Impl do
  alias Ecto.Changeset
  alias EbData.DefaultImpl.Entry
  alias EbData.DefaultImpl.Experience

  @type save_offline_experience_attributes_t ::
          %{
            user_id: String.t(),
            experience: Map.t()
          }

  @type save_offline_experience_success_t ::
          {:ok, Experience.t(), [%Changeset{}]}

  @type save_offline_experience_failure_t :: {:error, %Changeset{}}

  @type create_entries_attributes_t :: [Map.t()]

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

  @type get_experiences_args_t :: %{
          pagination_args: Absinthe.Relay.Connection.Options.t(),
          user_id: binary() | Integer.t(),
          ids: [binary() | Integer.t()],
          client_ids: [binary() | Integer.t()]
        }

  @type update_experience_args_t :: %{
          title: String.t(),
          description: binary(),
          field_definitions: [
            %{
              id: String.t(),
              name: String.t()
            }
          ]
        }

  @type update_entry_args_t :: %{
          fields: [
            %{
              def_id: String.t(),
              data: %{required(String.t()) => String.t()}
            }
          ]
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

  @callback get_entry(id :: binary() | Integer.t()) :: map | nil

  @callback save_offline_experience(attr :: save_offline_experience_attributes_t) ::
              save_offline_experience_success_t | save_offline_experience_failure_t

  @callback delete_experience(id :: String.t()) :: {:ok, Experience.t()} | {:error, Changeset.t()}

  @callback update_experience(id :: String.t(), args :: update_experience_args_t) ::
              {:ok, Experience.t()} | {:error, Changeset.t() | String.t()}

  @callback update_entry(id :: String.t(), attrs :: update_entry_args_t) ::
              {:ok, Entry.t()}
              | {
                  :error,
                  Changeset.t() | String.t() | %{fields_errors: [Map.t()]}
                }

  @callback delete_entry(id :: String.t()) ::
              {:ok, Entry.t()}
              | {:error, Changeset.t() | String.t()}
end
