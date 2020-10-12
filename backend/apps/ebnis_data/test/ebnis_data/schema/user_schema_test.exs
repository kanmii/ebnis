defmodule EbnisData.Schema.UserTest do
  use EbnisData.DataCase

  import ExUnit.CaptureLog

  alias EbnisData.Schema
  alias EbnisData.Query.Registration, as: RegQuery
  alias EbnisData.Factory.Registration, as: RegFactory
  alias EbnisData.Query.User, as: Query
  alias EbnisData.Guardian, as: GuardianApp
  alias EbnisData.Repo

  @moduletag :db
  @moduletag capture_log: true

  describe "registration mutation" do
    # @tag :skip
    test "registers user succeeds" do
      %{
        "name" => name,
        "email" => email
      } =
        attrs =
        RegFactory.params()
        |> RegFactory.stringify()

      queryMap = RegQuery.register()

      query = """
        mutation RegisterUser(#{queryMap.parameters}) {
          #{queryMap.query}
        }

        #{queryMap.fragments}
      """

      assert {:ok,
              %{
                data: %{
                  "registerUser" => %{
                    "user" => %{
                      "id" => _,
                      "name" => ^name,
                      "email" => ^email,
                      "jwt" => jwt,
                      "credential" => %{
                        "id" => _
                      }
                    }
                  }
                }
              }} =
               Absinthe.run(query, Schema,
                 variables: %{
                   "input" => attrs
                 }
               )

      assert is_binary(jwt)
    end

    # @tag :skip
    test "registers user fails for none unique email" do
      attrs = RegFactory.params()
      RegFactory.insert(attrs)

      queryMap = RegQuery.register()

      query = """
        mutation RegisterUser(#{queryMap.parameters}) {
          #{queryMap.query}
        }

        #{queryMap.fragments}
      """

      assert {
               :ok,
               %{
                 data: %{
                   "registerUser" => %{
                     "errors" => %{
                       "email" => email_error
                     }
                   }
                 }
               }
             } =
               Absinthe.run(query, Schema,
                 variables: %{
                   "input" => RegFactory.stringify(attrs)
                 }
               )

      assert is_binary(email_error)
    end

    # @tag :skip
    test "fails: passwords do not match" do
      attrs = %{
        "email" => "a@b.com",
        "password" => "123456",
        "passwordConfirmation" => "1234567",
        "source" => "password",
        "name" => "aa"
      }

      queryMap = RegQuery.register()

      query = """
        mutation RegisterUser(#{queryMap.parameters}) {
          #{queryMap.query}
        }

        #{queryMap.fragments}
      """

      assert {
               :ok,
               %{
                 data: %{
                   "registerUser" => %{
                     "errors" => %{
                       "passwordConfirmation" => password_confirmation_error
                     }
                   }
                 }
               }
             } =
               Absinthe.run(query, Schema,
                 variables: %{
                   "input" => attrs
                 }
               )

      assert is_binary(password_confirmation_error)
    end

    # @tag :skip
    test "fails: passwords too short" do
      attrs = %{
        "email" => "a@b.com",
        "password" => "123",
        "passwordConfirmation" => "1234567",
        "source" => "password",
        "name" => "aa"
      }

      queryMap = RegQuery.register()

      query = """
        mutation RegisterUser(#{queryMap.parameters}) {
          #{queryMap.query}
        }

        #{queryMap.fragments}
      """

      assert {
               :ok,
               %{
                 data: %{
                   "registerUser" => %{
                     "errors" => %{
                       "password" => password_error
                     }
                   }
                 }
               }
             } =
               Absinthe.run(query, Schema,
                 variables: %{
                   "input" => attrs
                 }
               )

      assert is_binary(password_error)
    end
  end

  describe "update mutation" do
    # @tag :skip
    test "update user succeeds" do
      user = RegFactory.insert()
      {:ok, jwt, _claim} = GuardianApp.encode_and_sign(user)

      attrs =
        RegFactory.user_params(%{jwt: jwt})
        |> RegFactory.stringify()

      queryMap = Query.update()

      query = """
        mutation UpdateUser(#{queryMap.parameters}) {
          #{queryMap.query}
        }

        #{queryMap.fragments}
      """

      assert {:ok,
              %{
                data: %{
                  "updateUser" => %{
                    "user" => %{
                      "id" => _,
                      "name" => name,
                      "email" => email,
                      "jwt" => _jwt
                    }
                  }
                }
              }} =
               Absinthe.run(query, Schema,
                 variables: %{
                   "input" => attrs
                 }
               )

      refute user.name == name
      refute user.email == email
    end
  end

  describe "login mutation" do
    # @tag :skip
    test "login succeeds" do
      %{email: email, password: password} = params = RegFactory.params()
      RegFactory.insert(params)
      queryMap = Query.login()

      query = """
        mutation LoginUser(#{queryMap.parameters}) {
          #{queryMap.query}
        }

        #{queryMap.fragments}
      """

      variables = %{
        "input" => %{
          "email" => email,
          "password" => password
        }
      }

      assert {:ok,
              %{
                data: %{
                  "login" => %{
                    "user" => %{
                      "id" => _,
                      "name" => _name,
                      "email" => ^email,
                      "jwt" => jwt
                    }
                  }
                }
              }} = Absinthe.run(query, Schema, variables: variables)

      assert is_binary(jwt)
    end

    # @tag :skip
    test "login fails - passwords do not match" do
      %{email: email, password: password} = params = RegFactory.params()
      RegFactory.insert(params)

      queryMap = Query.login()

      query = """
        mutation LoginUser(#{queryMap.parameters}) {
          #{queryMap.query}
        }

        #{queryMap.fragments}
      """

      password = password <> "q"

      assert {
               #
               :ok,
               %{
                 data: %{
                   "login" => %{
                     "error" => err
                   }
                 }
               }
             } =
               Absinthe.run(query, Schema,
                 variables: %{
                   "input" => %{
                     "email" => email,
                     "password" => password
                   }
                 }
               )

      assert is_binary(err)
    end

    # @tag :skip
    test "login fails - exception" do
      password = "password"

      user =
        RegFactory.insert(
          password: password,
          password_confirmation: password
        )

      # change token to one Pbkdf2 will find invalid
      bogus_token = ""

      Ecto.Changeset.change(user.credential, token: bogus_token)
      |> Repo.update!()

      queryMap = Query.login()

      query = """
        mutation LoginUser(#{queryMap.parameters}) {
          #{queryMap.query}
        }

        #{queryMap.fragments}
      """

      log_message =
        capture_log(fn ->
          assert {
                   #
                   :ok,
                   %{
                     data: %{
                       "login" => %{
                         "error" => err
                       }
                     }
                   }
                 } =
                   Absinthe.run(query, Schema,
                     variables: %{
                       "input" => %{
                         "email" => user.email,
                         "password" => password
                       }
                     }
                   )

          assert is_binary(err)
        end)

      assert log_message =~ "STACK"
    end
  end

  describe "query" do
    test "refreshes user succeeds with ok jwt" do
      user = RegFactory.insert()
      user_id = user.id
      {:ok, jwt, _claims} = GuardianApp.encode_and_sign(user)

      queryMap = Query.refresh()

      query = """
        query RefreshUser(#{queryMap.parameters}) {
          #{queryMap.query}
        }

        #{queryMap.fragments}
      """

      assert {:ok,
              %{
                data: %{
                  "refresh" => %{
                    "id" => ^user_id,
                    "jwt" => new_jwt
                  }
                }
              }} =
               Absinthe.run(query, Schema,
                 variables: %{
                   "refresh" => %{"jwt" => jwt}
                 }
               )

      refute jwt == new_jwt
    end

    test "refreshes user fails for tampered with jwt" do
      user = RegFactory.insert()
      {:ok, jwt, _claims} = GuardianApp.encode_and_sign(user)

      queryMap = Query.refresh()

      query = """
        query RefreshUser(#{queryMap.parameters}) {
          #{queryMap.query}
        }

        #{queryMap.fragments}
      """

      assert {:ok,
              %{
                data: %{"refresh" => nil},
                errors: [
                  %{
                    message: "{\"error\":\"invalid_token\"}",
                    path: ["refresh"]
                  }
                ]
              }} =
               Absinthe.run(query, Schema,
                 variables: %{
                   "refresh" => %{"jwt" => jwt <> "9"}
                 }
               )
    end
  end
end
