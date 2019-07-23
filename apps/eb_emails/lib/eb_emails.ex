defmodule EbEmails do
  @moduledoc ~S"""
    Used for sending emails to users
  """
  require Logger

  import Constantizer

  alias EbEmails.DefaultImpl

  @type email_address :: binary()

  @behaviour EbEmails.Impl

  @impl true
  @spec send_welcome(email_address) :: :ok
  def send_welcome(email_address) do
    Task.start(fn ->
      try do
        response = impl().send_welcome(email_address)

        Logger.info(fn ->
          """
            Welcome email was sent. Response:
            #{inspect(response)}
          """
        end)
      rescue
        error ->
          Logger.error(fn ->
            """
              Welcome email could not be sent. Reason:
              #{Exception.format(:error, error, __STACKTRACE__)}
            """
          end)
      end
    end)

    :ok
  end

  defconstp impl do
    Application.get_env(:eb_emails, :impl, DefaultImpl)
  end
end
