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

  describe "create entry" do
    # @tag :skip
    test "succeeds" do
      user = RegFactory.insert()
      exp = ExpFactory.insert(user_id: user.id)
      params = Factory.params(exp)

      variables = %{
        "input" => Factory.stringify(params)
      }

      query = Query.create()

      assert {:ok,
              %{
                data: %{
                  "createEntry" => %{
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
    test "fails if wrong experience id" do
      user = RegFactory.insert()

      params = %{
        exp_id: "0",
        fields: [Factory.field(def_id: Ecto.UUID.generate())]
      }

      variables = %{
        "input" => Factory.stringify(params)
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
    test "fails if wrong user" do
      user = RegFactory.insert()
      exp = ExpFactory.insert(user_id: user.id)
      params = Factory.params(exp)
      query = Query.create()
      error = Jason.encode!(%{exp_id: "does not exist"})
      another_user = RegFactory.insert()

      variables = %{
        "input" => Factory.stringify(params)
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
    test "fails if field def does not exist" do
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
        "input" => Factory.stringify(params)
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
    test "fails if field def_id not unique" do
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
        "input" => Factory.stringify(params)
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
    test "fails if fields.data.type != field_definition.type" do
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
        "input" => Factory.stringify(params)
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
    test "with client id succeeds" do
      user = RegFactory.insert()
      exp = ExpFactory.insert(user_id: user.id)
      client_id = "me"

      params =
        Factory.params(exp, client_id: client_id)
        |> Map.put(:exp_id, Resolver.convert_to_global_id(exp.id, :experience))

      variables = %{
        "input" => Factory.stringify(params)
      }

      query = Query.create()

      assert {:ok,
              %{
                data: %{
                  "createEntry" => %{
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
    test "fails for non unique client id" do
      user = RegFactory.insert()
      exp = ExpFactory.insert(user_id: user.id)
      client_id = "me"
      Factory.insert(exp, client_id: client_id)

      params =
        Factory.params(exp, client_id: client_id)
        |> Map.put(:exp_id, Resolver.convert_to_global_id(exp.id, :experience))

      variables = %{
        "input" => Factory.stringify(params)
      }

      query = Query.create()

      assert {:ok,
              %{
                errors: [
                  %{
                    message: error
                  }
                ]
              }} =
               Absinthe.run(
                 query,
                 Schema,
                 variables: variables,
                 context: context(user)
               )

      assert error =~ "client_id"
    end

    # @tag :skip
    test "fails without user context" do
      user = RegFactory.insert()
      exp = ExpFactory.insert(user_id: user.id)
      params = Factory.params(exp)

      variables = %{
        "input" => Factory.stringify(params)
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

    test "with timestamps succeeds" do
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
        "input" => Factory.stringify(params)
      }

      query = Query.create()

      assert {:ok,
              %{
                data: %{
                  "createEntry" => %{
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
      exp1 = ExpFactory.insert(user_id: user.id)
      exp_id1 = Integer.to_string(exp1.id)

      {params1, _} =
        Factory.params_list(2, exp1)
        |> Enum.reduce({[], 1}, fn p, {acc, i} ->
          {[Map.put(p, :client_id, i) | acc], i + 1}
        end)

      exp2 = ExpFactory.insert(user_id: user.id)
      params2 = Factory.params(exp2, client_id: 1)
      exp_id2 = Integer.to_string(exp2.id)

      variables = %{
        "createEntries" =>
          Enum.map(
            params1,
            &Factory.stringify(&1, %{experience_id_to_global: true})
          )
          |> Enum.concat([Factory.stringify(params2, %{experience_id_to_global: true})])
      }

      query = Query.create_entries()

      assert {:ok,
              %{
                data: %{
                  "createEntries" => successes
                }
              }} =
               Absinthe.run(
                 query,
                 Schema,
                 variables: variables,
                 context: context(user)
               )

      [
        %{
          "expId" => ^exp_id1,
          "entries" => [
            %{
              "_id" => _,
              "expId" => ^exp_id1,
              "clientId" => client_id1,
              "fields" => fields1
            },
            %{
              "_id" => _,
              "expId" => ^exp_id1,
              "clientId" => client_id2,
              "fields" => fields2
            }
          ],
          "errors" => nil
        },
        %{
          "expId" => ^exp_id2,
          "entries" => [
            %{
              "_id" => _,
              "expId" => ^exp_id2,
              "clientId" => "1",
              "fields" => fields
            }
          ],
          "errors" => nil
        }
      ] = Enum.sort_by(successes, & &1["expId"])

      assert Enum.sort([client_id1, client_id2]) == ["1", "2"]

      exp_field_def_ids = Enum.map(exp1.field_defs, & &1.id) |> Enum.sort()
      entry_field_defs_ids1 = Enum.map(fields1, & &1["defId"]) |> Enum.sort()
      entry_field_defs_ids2 = Enum.map(fields2, & &1["defId"]) |> Enum.sort()
      assert exp_field_def_ids == entry_field_defs_ids1
      assert exp_field_def_ids == entry_field_defs_ids2

      assert Enum.map(exp2.field_defs, & &1.id) |> Enum.sort() ==
               Enum.map(fields, & &1["defId"]) |> Enum.sort()
    end

    # @tag :skip
    test "fails if an entry is empty" do
      user = RegFactory.insert()
      exp = ExpFactory.insert(%{user_id: user.id})
      params = Factory.params(exp, client_id: 1)

      empty_entry = %{}

      variables = %{
        "createEntries" => [
          Factory.stringify(params),
          empty_entry
        ]
      }

      query = Query.create_entries()

      assert {:ok,
              %{
                errors: [
                  %{
                    message: message
                  }
                ]
              }} =
               Absinthe.run(
                 query,
                 Schema,
                 variables: variables,
                 context: context(user)
               )

      assert message =~ "expId"
    end

    # @tag :skip
    test "succeeds for valid and fails for invalid entries" do
      user = RegFactory.insert()
      exp = ExpFactory.insert(%{user_id: user.id}, ["integer", "decimal"])
      exp_id = Integer.to_string(exp.id)
      params1 = Factory.params(exp, client_id: 2)
      params2 = Factory.params(exp, client_id: 1)
      [field2, _] = params2.fields

      params3 = Factory.params(exp, client_id: 2)

      variables = %{
        "createEntries" => [
          Factory.stringify(params1, %{experience_id_to_global: true}),
          Factory.stringify(
            Map.put(params2, :fields, [field2]),
            %{experience_id_to_global: true}
          ),
          Factory.stringify(params3, %{experience_id_to_global: true})
        ]
      }

      query = Query.create_entries()

      assert {:ok,
              %{
                data: %{
                  "createEntries" => [
                    %{
                      "expId" => ^exp_id,
                      "entries" => [
                        %{
                          "id" => _,
                          "expId" => ^exp_id
                        }
                      ],
                      "errors" => errors
                    }
                  ]
                }
              }} =
               Absinthe.run(
                 query,
                 Schema,
                 variables: variables,
                 context: context(user)
               )

      [error1, error2] =
        errors
        |> Enum.sort_by(& &1["clientId"])
        |> Enum.map(& &1["error"])

      assert error1 =~ ~s("data":"can't be blank")
      assert error1 =~ ~s("def_id":)

      assert error2 =~ ~s("client_id":)
    end

    # @tag :skip
    test "fails for non unique client ids" do
      user = RegFactory.insert()
      exp = ExpFactory.insert(%{user_id: user.id})
      exp_id = Integer.to_string(exp.id)
      Factory.insert(exp, client_id: "1")
      params = Factory.params(exp, client_id: 1)

      variables = %{
        "createEntries" => [
          Factory.stringify(params, %{experience_id_to_global: true})
        ]
      }

      query = Query.create_entries()

      assert {:ok,
              %{
                data: %{
                  "createEntries" => [
                    %{
                      "expId" => ^exp_id,
                      "entries" => [],
                      "errors" => [
                        %{
                          "clientId" => "1",
                          "error" => error
                        }
                      ]
                    }
                  ]
                }
              }} =
               Absinthe.run(
                 query,
                 Schema,
                 variables: variables,
                 context: context(user)
               )

      assert error =~ ~s("client_id":)
    end
  end

  defp context(user), do: %{current_user: user}
end
