defmodule EbnisData.Schema.ExperienceTest do
  use EbnisData.DataCase, async: true

  alias EbnisData.Schema
  alias EbnisData.Factory.Registration, as: RegFactory
  alias EbnisData.Factory.Experience1, as: Factory
  alias EbnisData.Factory.FieldDefinition, as: FieldDefinitionFactory
  alias EbnisData.Query.Experience1, as: Query

  @iso_extended_format "{ISO:Extended:Z}"

  describe "create an experience" do
    # @tag :skip
    test "unauthorized" do
      variables = %{
        "input" =>
          Factory.params()
          |> Factory.stringify()
      }

      query = Query.create()

      assert {:ok,
              %{
                errors: [
                  %{
                    message: "Unauthorized"
                  }
                ]
              }} =
               Absinthe.run(
                 query,
                 Schema,
                 variables: variables
               )
    end

    # @tag :skip
    test "with field values succeeds" do
      %{title: title} = params = Factory.params()
      user = RegFactory.insert()

      variables = %{
        "input" => Factory.stringify(params)
      }

      query = Query.create()

      assert {:ok,
              %{
                data: %{
                  "createExperience1" => %{
                    "experience" => %{
                      "id" => _,
                      "title" => ^title,
                      "fieldDefinitions" => _,
                      "clientId" => nil,
                      "hasUnsaved" => nil
                    }
                  }
                }
              }} =
               Absinthe.run(
                 query,
                 Schema,
                 variables: variables,
                 context: context(user)
               )
    end

    # @tag :skip
    test "fails if title (case insensitive) not unique for user" do
      user = RegFactory.insert()
      Factory.insert(title: "Good experience", user_id: user.id)

      variables = %{
        "input" =>
          Factory.params(title: "good Experience")
          |> Factory.stringify()
      }

      query = Query.create()

      assert {:ok,
              %{
                data: %{
                  "createExperience1" => %{
                    "experienceErrors" => %{
                      "title" => _
                    }
                  }
                }
              }} =
               Absinthe.run(
                 query,
                 Schema,
                 variables: variables,
                 context: context(user)
               )
    end

    # @tag :skip
    test "fails if field definition name (case insensitive) not unique for experience" do
      user = RegFactory.insert()

      attrs = %{
        field_definitions: [
          FieldDefinitionFactory.params(name: "Field 0"),
          FieldDefinitionFactory.params(name: "field 0")
        ]
      }

      variables = %{
        "input" =>
          attrs
          |> Factory.params()
          |> Factory.stringify()
      }

      query = Query.create()

      assert {:ok,
              %{
                data: %{
                  "createExperience1" => %{
                    "fieldDefinitionsErrors" => [
                      %{
                        "index" => 1,
                        "errors" => %{
                          "name" => name,
                          "type" => nil
                        }
                      }
                    ]
                  }
                }
              }} =
               Absinthe.run(
                 query,
                 Schema,
                 variables: variables,
                 context: context(user)
               )

      assert is_binary(name)
    end

    # @tag :skip
    test "fails if field definition type does not exist" do
      user = RegFactory.insert()

      attrs = %{
        field_definitions: [
          %{
            name: "ff",
            type: "integer1"
          }
        ]
      }

      variables = %{
        "input" => Factory.params(attrs) |> Factory.stringify()
      }

      query = Query.create()

      assert {:ok,
              %{
                data: %{
                  "createExperience1" => %{
                    "fieldDefinitionsErrors" => [
                      %{
                        "index" => 0,
                        "errors" => %{
                          "type" => type,
                          "name" => nil
                        }
                      }
                    ]
                  }
                }
              }} =
               Absinthe.run(
                 query,
                 Schema,
                 variables: variables,
                 context: context(user)
               )

      assert is_binary(type)
    end

    # @tag :skip
    test "with timestamps succeeds" do
      inserted_at =
        DateTime.utc_now()
        |> Timex.shift(hours: -5)
        |> Timex.to_datetime()
        |> DateTime.truncate(:second)

      inserted_at_string =
        inserted_at
        |> Timex.format!(@iso_extended_format)

      params =
        Factory.params(
          inserted_at: inserted_at,
          updated_at: inserted_at
        )

      user = RegFactory.insert()

      variables = %{
        "input" => Factory.stringify(params)
      }

      query = Query.create()

      assert {:ok,
              %{
                data: %{
                  "createExperience1" => %{
                    "experience" => %{
                      "id" => _,
                      "fieldDefinitions" => _,
                      "insertedAt" => ^inserted_at_string,
                      "updatedAt" => ^inserted_at_string
                    }
                  }
                }
              }} =
               Absinthe.run(
                 query,
                 Schema,
                 variables: variables,
                 context: context(user)
               )
    end
  end

  defp context(user), do: %{current_user: user}
end
