defmodule EbEmails.Impl do
  @moduledoc false

  @callback send_welcome(EbEmails.email_address()) :: :ok
end
