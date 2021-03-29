defmodule EbnisEmails do
  @moduledoc ~S"""
    Used for sending emails to users
  """
  require Logger

  @implementation Application.get_env(
                    :ebnis_emails,
                    :implementation,
                    EbEmails.DefaultImplementation
                  )

  @type email_address :: binary()

  @behaviour EbnisEmails.Implementation

  @impl true
  @spec send_welcome(email_address) :: :ok
  def send_welcome(email_address) do
    Task.start(fn ->
      try do
        response = @implementation.send_welcome(email_address)

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
end
