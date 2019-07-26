defmodule EbEmails.DefaultImplementation.Mailer do
  @moduledoc false
  use Swoosh.Mailer, otp_app: :ebnis_emails
end
