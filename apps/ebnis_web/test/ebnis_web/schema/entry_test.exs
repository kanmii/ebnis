defmodule EbnisWeb.Schema.ExperienceEntryTest do
  use EbnisWeb.DataCase, async: true

  alias EbnisWeb.Schema
  alias EbData.Factory.Entry, as: Factory
  alias EbData.Factory.Experience, as: ExpFactory
  alias EbData.Factory.Registration, as: RegFactory
  alias EbnisWeb.Query.Entry, as: Query
  alias EbnisWeb.Resolver

  @moduletag :db
  @iso_extended_format "{ISO:Extended:Z}"

  describe "mutation" do
    # @tag :skip
    test "create an entry succeeds" do
      user = RegFactory.insert()
      exp = ExpFactory.insert(user_id: user.id)
      params = Factory.params(exp)

      variables = %{
        "entry" => Factory.stringify(params)
      }

      query = Query.create()

      assert {:ok,
              %{
                data: %{
                  "entry" => %{
                    "_id" => _,
                    "id" => _,
                    "expId" => _global_experience_id,
                    "fields" => fields,
                    "clientId" => _
                  }
                }
              }} =
               Absinthe.run(
                 query,
                 Schema,
                 variables: variables,
                 context: context(user)
               )

      field_defs_ids = Enum.map(fields, & &1["defId"]) |> Enum.sort()
      assert Enum.map(exp.field_defs, & &1.id) |> Enum.sort() == field_defs_ids
    end

    # @tag :skip
    test "create an entry fails if wrong experience id" do
      user = RegFactory.insert()

      params = %{
        exp_id: "0",
        fields: [Factory.field(def_id: Ecto.UUID.generate())]
      }

      variables = %{
        "entry" => Factory.stringify(params)
      }

      query = Query.create()
      error = Jason.encode!(%{exp_id: "does not exist"})

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
    test "create an entry fails if wrong user" do
      user = RegFactory.insert()
      exp = ExpFactory.insert(user_id: user.id)
      params = Factory.params(exp)
      query = Query.create()
      error = Jason.encode!(%{exp_id: "does not exist"})
      another_user = RegFactory.insert()

      variables = %{
        "entry" => Factory.stringify(params)
      }

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
                 context: context(another_user)
               )
    end

    # @tag :skip
    test "create an entry fails if field def does not exist" do
      user = RegFactory.insert()
      exp = ExpFactory.insert(user_id: user.id)
      params = Factory.params(exp)
      bogus_field = Factory.field(def_id: Ecto.UUID.generate())
      params = update_in(params.fields, &[bogus_field | &1])
      query = Query.create()

      error =
        Jason.encode!(%{
          fields: [
            %{
              meta: %{
                def_id: bogus_field.def_id,
                index: 0
              },
              errors: %{def_id: "does not exist"}
            }
          ]
        })

      variables = %{
        "entry" => Factory.stringify(params)
      }

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
    test "create an entry fails if field def_id not unique" do
      user = RegFactory.insert()
      exp = ExpFactory.insert(user_id: user.id)
      params = Factory.params(exp)
      fields = params.fields
      # replace only the data attribute, def_id will not be replaced
      first_field = List.first(fields) |> Factory.field()
      len = length(fields)
      params = Map.put(params, :fields, fields ++ [first_field])
      query = Query.create()

      error =
        Jason.encode!(%{
          fields: [
            %{
              meta: %{
                def_id: first_field.def_id,
                index: len
              },
              errors: %{def_id: "has already been taken"}
            }
          ]
        })

      variables = %{
        "entry" => Factory.stringify(params)
      }

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
    test "create entry fails if data type of field def does not match data of field" do
      user = RegFactory.insert()

      exp =
        %{
          user_id: user.id,
          title: Faker.String.base64(),
          field_defs: [%{name: Faker.String.base64(), type: "integer"}]
        }
        |> ExpFactory.insert()

      [fdef | _] = exp.field_defs

      params = %{
        exp_id: exp.id,
        fields: [%{def_id: fdef.id, data: %{single_line_text: "some text"}}]
      }

      variables = %{
        "entry" => Factory.stringify(params)
      }

      query = Query.create()

      error =
        Jason.encode!(%{
          fields: [
            %{
              meta: %{
                def_id: fdef.id,
                index: 0
              },
              errors: %{def_id: "invalid data type"}
            }
          ]
        })

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
    test "create an entry with client id succeeds" do
      user = RegFactory.insert()
      exp = ExpFactory.insert(user_id: user.id)
      client_id = "me"
      params = Factory.params(exp, client_id: client_id)

      variables = %{
        "entry" => Factory.stringify(params)
      }

      query = Query.create()

      assert {:ok,
              %{
                data: %{
                  "entry" => %{
                    "_id" => _,
                    "id" => _,
                    "expId" => _global_experience_id,
                    "fields" => fields,
                    "clientId" => ^client_id
                  }
                }
              }} =
               Absinthe.run(
                 query,
                 Schema,
                 variables: variables,
                 context: context(user)
               )

      field_defs_ids = Enum.map(fields, & &1["defId"]) |> Enum.sort()
      assert Enum.map(exp.field_defs, & &1.id) |> Enum.sort() == field_defs_ids
    end

    # @tag :skip
    test "create an entry fails for non unique client id" do
      user = RegFactory.insert()
      exp = ExpFactory.insert(user_id: user.id)
      client_id = "me"
      Factory.insert(exp, client_id: client_id)
      params = Factory.params(exp, client_id: client_id)

      variables = %{
        "entry" => Factory.stringify(params)
      }

      error = Jason.encode!(%{client_id: "has already been taken"})

      query = Query.create()

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
    test "create an entry fails without user context" do
      user = RegFactory.insert()
      exp = ExpFactory.insert(user_id: user.id)
      params = Factory.params(exp)

      variables = %{
        "entry" => Factory.stringify(params)
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

    test "create an entry with timestamps succeeds" do
      inserted_at =
        DateTime.utc_now()
        |> Timex.shift(hours: -15)
        |> Timex.to_datetime()
        |> DateTime.truncate(:second)

      inserted_at_string =
        inserted_at
        |> Timex.format!(@iso_extended_format)

      user = RegFactory.insert()
      exp = ExpFactory.insert(user_id: user.id)

      params =
        Factory.params(
          exp,
          inserted_at: inserted_at,
          updated_at: inserted_at
        )

      variables = %{
        "entry" => Factory.stringify(params)
      }

      query = Query.create()

      assert {:ok,
              %{
                data: %{
                  "entry" => %{
                    "_id" => _,
                    "id" => _,
                    "expId" => _global_experience_id,
                    "fields" => _fields,
                    "insertedAt" => ^inserted_at_string,
                    "updatedAt" => ^inserted_at_string
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

  describe "create entries mutation" do
    # @tag :skip
    test "succeeds" do
      user = RegFactory.insert()
      exp = ExpFactory.insert(user_id: user.id)
      exp_id = Integer.to_string(exp.id)
      params = Factory.params(exp).fields

      more_fields =
        Enum.map(params, fn %{def_id: def_id, data: data} ->
          [data_type] = Map.keys(data)

          %{
            def_id: def_id,
            data: Factory.data(data_type)
          }
          |> Factory.stringify_field()
        end)

      variables = %{
        "createEntries" => %{
          "expId" => Resolver.convert_to_global_id(exp_id, :experience),
          "listOfFields" => [
            Enum.map(params, &Factory.stringify_field/1),
            more_fields
          ]
        }
      }

      query = Query.create_entries()

      assert {:ok,
              %{
                data: %{
                  "createEntries" => %{
                    "failures" => nil,
                    "successes" => [
                      %{
                        "entry" => %{
                          "_id" => _,
                          "expId" => ^exp_id,
                          "fields" => fields1
                        },
                        "index" => index1
                      },
                      %{
                        "entry" => %{
                          "_id" => _,
                          "expId" => ^exp_id,
                          "fields" => fields2
                        },
                        "index" => index2
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

      assert Enum.sort([index1, index2]) == [0, 1]

      exp_field_def_ids = Enum.map(exp.field_defs, & &1.id) |> Enum.sort()
      entry_field_defs_ids1 = Enum.map(fields1, & &1["defId"]) |> Enum.sort()
      entry_field_defs_ids2 = Enum.map(fields2, & &1["defId"]) |> Enum.sort()

      assert exp_field_def_ids == entry_field_defs_ids1
      assert exp_field_def_ids == entry_field_defs_ids2
    end

    # @tag :skip
    test "fails because listOfFields is empty" do
      variables = %{
        "createEntries" => %{
          # if we ever reach DB, this test will fail because exp_id must be
          # a non zero integer
          "expId" => Resolver.convert_to_global_id("0", :experience),
          "listOfFields" => []
        }
      }

      assert {:ok,
              %{
                data: %{
                  "createEntries" => %{
                    "successes" => nil,
                    "failures" => nil
                  }
                }
              }} =
               Absinthe.run(
                 Query.create_entries(),
                 Schema,
                 variables: variables,
                 context: context(%{id: "1"})
               )
    end

    # @tag :skip
    test "fails if listOfFields has empty array member" do
      user = RegFactory.insert()
      exp = ExpFactory.insert(%{user_id: user.id})
      exp_id = Integer.to_string(exp.id)
      fields = Factory.params(exp).fields

      # empty array member
      more_fields = []

      variables = %{
        "createEntries" => %{
          "expId" => Resolver.convert_to_global_id(exp_id, :experience),
          "listOfFields" => [
            Enum.map(fields, &Factory.stringify_field/1),
            more_fields
          ]
        }
      }

      query = Query.create_entries()

      assert {:ok,
              %{
                data: %{
                  "createEntries" => %{
                    "successes" => [
                      %{
                        "entry" => %{
                          "_id" => _,
                          "expId" => ^exp_id,
                          "fields" => _fields1
                        },
                        "index" => 0
                      }
                    ],
                    "failures" => [
                      %{
                        "error" => "{\"fields\":\"can't be blank\"}",
                        "index" => 1
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
    end

    # @tag :skip
    test "fails if listOfFields has member with missing data" do
      user = RegFactory.insert()
      exp = ExpFactory.insert(%{user_id: user.id}, ["integer", "decimal"])
      exp_id = Integer.to_string(exp.id)
      fields = Factory.params(exp).fields

      # more_fields will be missing data for integer type
      [missing_field | more_fields] =
        Enum.map(fields, fn %{def_id: def_id, data: data} ->
          [data_type] = Map.keys(data)

          %{def_id: def_id, data: Factory.data(data_type)}
          |> Factory.stringify_field()
        end)

      error =
        Jason.encode!(%{
          fields: [
            %{
              meta: %{
                def_id: missing_field["defId"],
                index: 1
              },
              errors: %{data: "can't be blank"}
            }
          ]
        })

      variables = %{
        "createEntries" => %{
          "expId" => Resolver.convert_to_global_id(exp_id, :experience),
          "listOfFields" => [
            more_fields,
            Enum.map(fields, &Factory.stringify_field/1)
          ]
        }
      }

      query = Query.create_entries()

      assert {:ok,
              %{
                data: %{
                  "createEntries" => %{
                    "successes" => [
                      %{
                        "entry" => %{
                          "id" => _,
                          "expId" => ^exp_id
                        },
                        "index" => 1
                      }
                    ],
                    "failures" => [
                      %{
                        "error" => ^error,
                        "index" => 0
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
    end
  end

  describe "list_experiences_entries" do
    test "succeeds" do
      user = RegFactory.insert()
      [exp1, exp2] = ExpFactory.insert_list(2, %{user_id: user.id})
      string_experience_id1 = Integer.to_string(exp1.id)
      string_experience_id2 = Integer.to_string(exp2.id)

      Factory.insert(exp1, user_id: user.id)
      Factory.insert(exp1, user_id: user.id)

      Factory.insert(exp2, user_id: user.id)

      query = Query.list_experiences_entries()

      variables = %{
        "input" => %{
          "experiencesIds" =>
            Enum.map(
              [string_experience_id1, string_experience_id2],
              &Resolver.convert_to_global_id(&1, :experience)
            ),
          "pagination" => %{
            "first" => 1
          }
        }
      }

      assert {:ok,
              %{
                data: %{
                  "listExperiencesEntries" => [
                    %{
                      "edges" => [
                        %{
                          "cursor" => _,
                          "node" => %{
                            "expId" => ^string_experience_id1,
                            "id" => _
                          }
                        }
                      ],
                      "pageInfo" => %{
                        "hasNextPage" => true,
                        "hasPreviousPage" => false
                      }
                    },
                    _other
                  ]
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
