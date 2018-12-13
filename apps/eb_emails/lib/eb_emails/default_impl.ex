defmodule EbEmails.DefaultImpl do
  @moduledoc false

  alias EbEmails.DefaultImpl.Mailer
  alias EbEmails.DefaultImpl.Composition

  @behaviour EbEmails.Impl

  @type email_address :: EbEmails.email_address()

  @impl true
  @spec send_welcome(email_address) :: :ok
  def send_welcome(email_address) do
    email_address |> Composition.welcome() |> Mailer.deliver()
    :ok
  end
end
