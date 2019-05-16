defmodule EbEmails do
  @moduledoc ~S"""
    Used for sending emails to users
  """

  import Constantizer

  alias EbEmails.DefaultImpl

  @type email_address :: binary()

  @behaviour EbEmails.Impl

  @impl true
  @spec send_welcome(email_address) :: :ok
  def send_welcome(email_address) do
    try do
      impl().send_welcome(email_address)
    rescue
      _ ->
        :error
    end
  end

  defconstp impl do
    Application.get_env(:eb_emails, :impl, DefaultImpl)
  end
end
