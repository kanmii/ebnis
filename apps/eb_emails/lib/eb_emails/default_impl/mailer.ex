defmodule EbEmails.DefaultImpl.Mailer do
  @moduledoc false
  use Swoosh.Mailer, otp_app: :eb_emails
end
