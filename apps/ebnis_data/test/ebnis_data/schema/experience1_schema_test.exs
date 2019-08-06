defmodule EbnisData.Schema.ExperienceTest1 do
  use EbnisData.DataCase, async: true

  import ExUnit.CaptureLog

  alias EbnisData.Schema
  alias EbnisData.Factory.Registration, as: RegFactory
  alias EbnisData.Factory.Experience1, as: Factory
  alias EbnisData.Factory.FieldDefinition, as: FieldDefinitionFactory
  alias EbnisData.Query.Experience1, as: Query
  alias EbnisData.Resolver
  alias EbnisData.Factory.Entry1, as: Entry1Factory

  describe "create an experience" do
    # @tag :skip
    test "unauthorized" do
      variables = %{
        "input" =>
          Factory.params()
          |> Factory.stringify()
      }

      assert {:ok,
              %{
                errors: [
                  %{
                    message: "Unauthorized"
                  }
                ]
              }} =
               Absinthe.run(
                 Query.create(),
                 Schema,
                 variables: variables
               )
    end

    # @tag :skip
    test "succeeds for happy path" do
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
      inserted_at = ~U[2016-05-05 09:41:22Z]
      inserted_at_string = "2016-05-05T09:41:22Z"

      params =
        Factory.params(
          inserted_at: inserted_at,
          updated_at: inserted_at
        )

      user = RegFactory.insert()

      variables = %{
        "input" => Factory.stringify(params)
      }

      assert {:ok,
              %{
                data: %{
                  "createExperience1" => %{
                    "experience" => %{
                      "id" => _,
                      "fieldDefinitions" => _,
                      "insertedAt" => ^inserted_at_string,
                      "updatedAt" => ^inserted_at_string,
                      "entries" => %{
                        "edges" => []
                      }
                    }
                  }
                }
              }} =
               Absinthe.run(
                 Query.create(),
                 Schema,
                 variables: variables,
                 context: context(user)
               )
    end
  end

  describe "get one experience" do
    # @tag :skip
    test "succeeds for existing experience" do
      user = RegFactory.insert()
      experience = Factory.insert(user_id: user.id)
      id = Integer.to_string(experience.id)

      alias EbnisData.Factory.Entry1, as: EntryFactory

      entry = EntryFactory.insert(%{}, experience)
      entry_id = Resolver.convert_to_global_id(entry.id, :entry1)

      variables = %{
        "id" => Resolver.convert_to_global_id(id, :experience1)
      }

      assert {:ok,
              %{
                data: %{
                  "getExperience1" => %{
                    "id" => _,
                    "entries" => %{
                      "edges" => [
                        %{
                          "node" => %{
                            "id" => ^entry_id
                          }
                        }
                      ],
                      "pageInfo" => %{}
                    }
                  }
                }
              }} =
               Absinthe.run(
                 Query.get(),
                 Schema,
                 variables: variables,
                 context: context(user)
               )
    end

    # @tag :skip
    test "fails if experience does not exist" do
      user = RegFactory.insert()

      variables = %{
        "id" => Resolver.convert_to_global_id("0", :experience1)
      }

      assert {:ok,
              %{
                errors: [
                  %{
                    message: "Experience definition not found"
                  }
                ]
              }} =
               Absinthe.run(
                 Query.get(),
                 Schema,
                 variables: variables,
                 context: context(user)
               )
    end

    # @tag :skip
    test "fails if global experience id invalid" do
      user = RegFactory.insert()

      variables = %{
        "id" => Resolver.convert_to_global_id("x", :experience1)
      }

      message =
        capture_log(fn ->
          assert {:ok,
                  %{
                    errors: [
                      %{
                        message: "Experience definition not found"
                      }
                    ]
                  }} =
                   Absinthe.run(
                     Query.get(),
                     Schema,
                     variables: variables,
                     context: context(user)
                   )
        end)

      assert message =~ "STACKTRACE"
    end

    # @tag :skip
    test "fails for wrong user" do
      user = RegFactory.insert()
      %{id: id} = Factory.insert(user_id: user.id)
      id = Integer.to_string(id)

      variables = %{
        "id" => Resolver.convert_to_global_id(id, :experience1)
      }

      another_user = RegFactory.insert()

      assert {:ok,
              %{
                errors: [
                  %{
                    message: "Experience definition not found"
                  }
                ]
              }} =
               Absinthe.run(
                 Query.get(),
                 Schema,
                 variables: variables,
                 context: context(another_user)
               )
    end
  end

  describe "get many experiences" do
    test "fails for unauthorized user" do
      assert {
               :ok,
               %{
                 errors: [
                   %{
                     message: "Unauthorized"
                   }
                 ]
               }
             } =
               Absinthe.run(
                 Query.gets(),
                 Schema
               )
    end

    # @tag :skip
    test "succeeds with pagination only" do
      user = RegFactory.insert()
      experience1 = Factory.insert(user_id: user.id)
      entry1 = Entry1Factory.insert(%{}, experience1)

      experience2 = Factory.insert(user_id: user.id)
      entry2 = Entry1Factory.insert(%{}, experience2)

      experience3 = Factory.insert(user_id: user.id)
      entry3 = Entry1Factory.insert(%{}, experience3)

      variables = %{
        "input" => %{
          "pagination" => %{
            "first" => 3
          }
        }
      }

      assert {:ok,
              %{
                data: %{
                  "getExperiences1" => %{
                    "edges" => edges,
                    "pageInfo" => %{
                      "hasNextPage" => false,
                      "hasPreviousPage" => false
                    }
                  }
                }
              }} =
               Absinthe.run(
                 Query.gets(),
                 Schema,
                 variables: variables,
                 context: context(user)
               )

      assert edges
             |> Enum.flat_map(fn edge ->
               node = edge["node"]

               [
                 node["id"],
                 (node["fieldDefinitions"] |> hd())["id"],
                 (node["entries"]["edges"] |> hd())["node"]["id"]
               ]
             end)
             |> Enum.sort() ==
               Enum.sort([
                 Resolver.convert_to_global_id(experience1.id, :experience1),
                 Resolver.convert_to_global_id(entry1.id, :entry1),
                 (experience1.field_definitions |> hd()).id,
                 Resolver.convert_to_global_id(experience2.id, :experience1),
                 Resolver.convert_to_global_id(entry2.id, :entry1),
                 (experience2.field_definitions |> hd()).id,
                 Resolver.convert_to_global_id(experience3.id, :experience1),
                 Resolver.convert_to_global_id(entry3.id, :entry1),
                 (experience3.field_definitions |> hd()).id
               ])
    end

    # @tag :skip
    test "returns [] if no experience exists" do
      user = RegFactory.insert()

      variables = %{
        "input" => %{
          "pagination" => %{
            "first" => 2
          }
        }
      }

      assert {:ok,
              %{
                data: %{
                  "getExperiences1" => %{
                    "edges" => [],
                    "pageInfo" => %{
                      "hasNextPage" => false,
                      "hasPreviousPage" => false
                    }
                  }
                }
              }} =
               Absinthe.run(
                 Query.gets(),
                 Schema,
                 variables: variables,
                 context: context(user)
               )
    end

    @tag :skip
    test "by IDs succeeds" do
      user = RegFactory.insert()
      experience1 = Factory.insert(user_id: user.id)
      Factory.insert(user_id: user.id)

      id1_string = Integer.to_string(experience1.id1)

      variables = %{
        "input" => %{
          "ids" => [Resolver.convert_to_global_id(id1_string, :experience1)]
        }
      }

      assert {:ok,
              %{
                data: %{
                  "getExperiences" => %{
                    "edges" => [
                      %{
                        "node" => %{
                          "_id" => ^id1_string,
                          "entries" => %{
                            "edges" => [],
                            "pageInfo" => %{
                              "hasNextPage" => false,
                              "hasPreviousPage" => false
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }} =
               Absinthe.run(
                 Query.gets(),
                 Schema,
                 variables: variables,
                 context: context(user)
               )
    end
  end

  defp context(user), do: %{current_user: user}
end
