defmodule EbnisWeb.Schema.ExperienceTest do
  use EbnisWeb.DataCase, async: true

  alias EbnisWeb.Schema
  alias EbData.Factory.Experience, as: Factory
  alias EbData.Factory.Registration, as: RegFactory
  alias EbData.Factory.FieldDef, as: FieldDefFactory
  alias EbnisWeb.Query.Experience, as: Query
  alias EbnisWeb.Resolver

  @moduletag :db

  @invalid_field_types Enum.map(
                         ["integer1", "date2", "datetime2", "decimal4"],
                         &%{type: &1}
                       )

  describe "mutation" do
    # @tag :skip
    test "create an experience with field values succeeds" do
      %{title: title} = params = Factory.params()
      user = RegFactory.insert()

      variables = %{
        "exp" => Factory.stringify(params)
      }

      query = Query.create()

      assert {:ok,
              %{
                data: %{
                  "exp" => %{
                    "id" => _,
                    "title" => ^title,
                    "fieldDefs" => _,
                    "clientId" => nil
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
    test "create an experience fails if title (case insensitive) not unique for user" do
      user = RegFactory.insert()
      Factory.insert(title: "Good experience", user_id: user.id)

      variables = %{
        "exp" =>
          Factory.params(title: "good Experience")
          |> Factory.stringify()
      }

      query = Query.create()

      error = Jason.encode!(%{title: "has already been taken"})

      assert {:ok,
              %{
                errors: [
                  %{
                    message: ^error
                  }
                ]
              }} =
               Absinthe.run(
                 query,
                 Schema,
                 variables: variables,
                 context: context(user)
               )
    end

    # @tag :skip
    test "create an experience fails if field name (case insensitive) not unique for experience" do
      user = RegFactory.insert()

      attrs = %{
        field_defs: [
          FieldDefFactory.params(name: "Field 0"),
          FieldDefFactory.params(name: "field 0")
        ]
      }

      variables = %{
        "exp" =>
          attrs
          |> Factory.params()
          |> Factory.stringify()
      }

      query = Query.create()

      error =
        %{
          field_defs: [
            %{name: "field 0---1 has already been taken"}
          ]
        }
        |> Jason.encode!()

      assert {:ok,
              %{
                errors: [
                  %{
                    message: ^error
                  }
                ]
              }} =
               Absinthe.run(
                 query,
                 Schema,
                 variables: variables,
                 context: context(user)
               )
    end

    # @tag :skip
    test "create an experience fails if field has wrong data type" do
      user = RegFactory.insert()

      attrs = %{
        field_defs: [
          Enum.random(@invalid_field_types) |> Map.put(:name, "invalid field")
        ]
      }

      variables = %{
        "exp" => Factory.params(attrs) |> Factory.stringify()
      }

      query = Query.create()

      assert {:ok,
              %{
                errors: [
                  %{
                    message: _
                  }
                ]
              }} =
               Absinthe.run(
                 query,
                 Schema,
                 variables: variables,
                 context: context(user)
               )
    end

    # @tag :skip
    test "create an experience with client id succeeds" do
      %{client_id: client_id} = params = Factory.params(client_id: "olu")
      user = RegFactory.insert()

      variables = %{
        "exp" => Factory.stringify(params)
      }

      query = Query.create()

      assert {:ok,
              %{
                data: %{
                  "exp" => %{
                    "id" => _,
                    "clientId" => ^client_id,
                    "fieldDefs" => _
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
    test "create an experience fails if client id not unique for user" do
      user = RegFactory.insert()
      Factory.insert(client_id: "abcd", user_id: user.id)

      variables = %{
        "exp" =>
          Factory.params(client_id: "abcd")
          |> Factory.stringify()
      }

      query = Query.create()

      error = Jason.encode!(%{client_id: "has already been taken"})

      assert {:ok,
              %{
                errors: [
                  %{
                    message: ^error
                  }
                ]
              }} =
               Absinthe.run(
                 query,
                 Schema,
                 variables: variables,
                 context: context(user)
               )
    end

    # @tag :skip
    test "create an experience fails if user context not supplied" do
      variables = %{
        "exp" =>
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
  end

  describe "get experience definition" do
    # @tag :skip
    test "get experience def succeeds for existing definition" do
      user = RegFactory.insert()
      %{id: id} = Factory.insert(user_id: user.id)
      id = Integer.to_string(id)

      variables = %{
        "exp" => %{
          "id" => Resolver.convert_to_global_id(id, :experience)
        }
      }

      assert {:ok,
              %{
                data: %{
                  "exp" => %{
                    "_id" => ^id,
                    "id" => _
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
    test "get experience def fails for non existing definition" do
      user = RegFactory.insert()

      variables = %{
        "exp" => %{
          "id" => Resolver.convert_to_global_id("0", :experience)
        }
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
    test "get experience fails for wrong user" do
      user = RegFactory.insert()
      %{id: id} = Factory.insert(user_id: user.id)
      id = Integer.to_string(id)

      variables = %{
        "exp" => %{
          "id" => Resolver.convert_to_global_id(id, :experience)
        }
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

    # @tag :skip
    test "get experience defs succeeds for existing definitions" do
      user = RegFactory.insert()
      %{id: id1} = Factory.insert(user_id: user.id)
      %{id: id2} = Factory.insert(user_id: user.id)

      variables = %{
        "pagination" => %{
          "first" => 2
        }
      }

      assert {:ok,
              %{
                data: %{
                  "exps" => %{
                    "edges" => [
                      %{
                        "node" => %{
                          "_id" => ida,
                          "entries" => %{}
                        }
                      },
                      %{
                        "node" => %{
                          "_id" => idb,
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

      assert [
               Integer.to_string(id1),
               Integer.to_string(id2)
             ] == Enum.sort([ida, idb])
    end

    # @tag :skip
    test "get experience defs returns [] for none existing definitions" do
      user = RegFactory.insert()

      variables = %{
        "pagination" => %{
          "first" => 2
        }
      }

      assert {:ok,
              %{
                data: %{
                  "exps" => %{
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
  end

  defp context(user), do: %{current_user: user}
end
