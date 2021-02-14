defmodule EbEmails.DefaultImplementationTest do
  use ExUnit.Case, async: true

  import Swoosh.TestAssertions

  alias EbEmails.DefaultImplementation
  alias EbEmails.DefaultImplementation.Composition

  test "send_welcome/1 sends welcome message to appropriate email" do
    email = "noreply@test.us"

    assert :ok = DefaultImplementation.send_welcome(email)

    email
    |> Composition.welcome()
    |> assert_email_sent()
  end
end
