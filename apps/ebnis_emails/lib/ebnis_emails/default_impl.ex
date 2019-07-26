defmodule EbEmails.DefaultImplementation do
  @moduledoc false

  alias EbEmails.DefaultImplementation.Mailer
  alias EbEmails.DefaultImplementation.Composition

  @behaviour EbnisEmails.Implementation

  @type email_address :: EbnisEmails.email_address()

  @impl true
  @spec send_welcome(email_address) :: :ok
  def send_welcome(email_address) do
    email_address |> Composition.welcome() |> Mailer.deliver()
    :ok
  end
end
