defmodule EbEmails.DefaultImplTest do
  use ExUnit.Case, async: true

  import Swoosh.TestAssertions

  alias EbEmails.DefaultImpl
  alias EbEmails.DefaultImpl.Composition

  test "send_welcome/1 sends welcome message to appropriate email" do
    email = "noreply@test.us"

    assert :ok = DefaultImpl.send_welcome(email)

    email
    |> Composition.welcome()
    |> assert_email_sent()
  end
end
