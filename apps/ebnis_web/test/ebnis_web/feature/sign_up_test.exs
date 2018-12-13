defmodule EbnisWeb.Feature.SignUpTest do
  use EbnisWeb.HoundCase, async: false

  alias EbData.Factory.Registration, as: RegFactory

  @moduletag :integration

  # @tag :no_headless
  @tag :sign_up_feature
  test "Sign Up" do
    # Given that a user reaches our page
    path() |> navigate_to()

    # She sees the login text in the page title
    assert retries(true, fn -> page_title() =~ "Log in" end, 1_000)

    # When she clicks on the sign up button
    click({:name, "to-sign-up"})

    # She sees the sign up text in the page title
    assert retries(true, fn -> page_title() =~ "Sign up" end, 1_000)

    %{email: email} = params = RegFactory.params()

    # When she fills in her name, email, password and password confirmation
    fill_field({:name, "name"}, params.name)
    fill_field({:name, "email"}, email)
    fill_field({:name, "password"}, params.password)
    fill_field({:name, "passwordConfirmation"}, params.password_confirmation)

    # And she submits the form
    submit_element({:name, "sign-up-submit"})

    # She is redirected to home page
    assert retries(true, fn -> page_title() =~ "Home" end, 1_000)

    # And the user is created in our system
    assert %{email: ^email, id: _} = EbData.get_user_by(email: email)
  end
end
