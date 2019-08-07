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
                    "experience" => nil,
                    "errors" => %{
                      "title" => title_error
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

      assert is_binary(title_error)
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
                    "experience" => nil,
                    "errors" => %{
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
                    "errors" => %{
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

    # @tag :skip
    test "by IDs succeeds" do
      user = RegFactory.insert()
      experience = Factory.insert(user_id: user.id)
      Factory.insert(user_id: user.id)

      id = Resolver.convert_to_global_id(experience.id, :experience1)

      variables = %{
        "input" => %{
          "ids" => [id]
        }
      }

      assert {:ok,
              %{
                data: %{
                  "getExperiences1" => %{
                    "edges" => [
                      %{
                        "node" => %{
                          "id" => ^id,
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

  describe "save offline experience" do
    # @tag :skip
    test "fails if no user context" do
      variables = %{
        "input" => [
          Factory.params()
          |> Factory.stringify()
        ]
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
                 Query.save_offline_experiences(),
                 Schema,
                 variables: variables
               )
    end

    # @tag :skip
    test "fails if user does not exist" do
      bogus_user = %{id: 0}

      variables = %{
        "input" => [
          Factory.params(client_id: "a")
          |> Factory.stringify()
        ]
      }

      assert {:ok,
              %{
                data: %{
                  "saveOfflineExperiences1" => [
                    %{
                      "experienceErrors" => %{
                        "clientId" => "a",
                        "index" => 0,
                        "errors" => %{
                          "user" => user_error
                        }
                      }
                    }
                  ]
                }
              }} =
               Absinthe.run(
                 Query.save_offline_experiences(),
                 Schema,
                 variables: variables,
                 context: context(bogus_user)
               )

      assert is_binary(user_error)
    end

    # @tag :skip
    test "one succeeds and one fails when client id not provided" do
      user = RegFactory.insert()

      data_definition1 =
        FieldDefinitionFactory.params_list(2)
        |> Enum.with_index(1)
        |> Enum.map(fn {map, index} -> Map.put(map, :client_id, index) end)

      experience_params1 =
        Factory.params(
          client_id: "a",
          field_definitions: data_definition1
        )

      entries_params =
        Entry1Factory.params_list(2, experience_params1)
        |> Enum.with_index(1)
        |> Enum.map(fn {map, index} -> Map.put(map, :client_id, index) end)

      experience_params = Factory.params()

      variables = %{
        "input" => [
          experience_params1
          |> Map.put(:entries, entries_params)
          |> Factory.stringify(),
          Factory.stringify(experience_params)
        ]
      }

      assert {:ok,
              %{
                data: %{
                  "saveOfflineExperiences1" => [
                    %{
                      "entriesErrors" => nil,
                      "experience" => %{
                        "id" => _,
                        "clientId" => "a",
                        "fieldDefinitions" => _,
                        "entries" => %{
                          "edges" => edges
                        }
                      },
                      "experienceErrors" => nil
                    },
                    %{
                      "entriesErrors" => nil,
                      "experience" => nil,
                      "experienceErrors" => %{
                        "errors" => %{
                          "clientId" => client_id_error
                        },
                        "index" => 1,
                        "clientId" => "1"
                      }
                    }
                  ]
                }
              }} =
               Absinthe.run(
                 Query.save_offline_experiences(),
                 Schema,
                 variables: variables,
                 context: context(user)
               )

      assert is_binary(client_id_error)

      assert entries_params
             |> Enum.map(&"#{&1.client_id}")
             |> Enum.sort() ==
               edges
               |> Enum.map(&~s(#{&1["node"]["clientId"]}))
               |> Enum.sort()
    end

    # @tag :skip
    test "fails if client id not unique for user" do
      user = RegFactory.insert()
      Factory.insert(client_id: "a", user_id: user.id)

      params =
        Factory.params(
          client_id: "a",
          field_definitions: [
            FieldDefinitionFactory.params()
            |> Map.put(:client_id, 1)
          ]
        )

      variables = %{
        "input" => [Factory.stringify(params)]
      }

      assert {:ok,
              %{
                data: %{
                  "saveOfflineExperiences1" => [
                    %{
                      "entriesErrors" => nil,
                      "experience" => nil,
                      "experienceErrors" => %{
                        "errors" => %{
                          "clientId" => client_id_error
                        },
                        "index" => 0,
                        "clientId" => "a"
                      }
                    }
                  ]
                }
              }} =
               Absinthe.run(
                 Query.save_offline_experiences(),
                 Schema,
                 variables: variables,
                 context: context(user)
               )

      assert is_binary(client_id_error)
    end

    # @tag :skip
    test "fails if entry.experience_id != experience.client_id" do
      user = RegFactory.insert()

      data_definitions =
        FieldDefinitionFactory.params_list(2)
        |> Enum.with_index(1)
        |> Enum.map(fn {map, index} -> Map.put(map, :client_id, index) end)

      params =
        Factory.params(
          client_id: "a",
          field_definitions: data_definitions
        )

      entries =
        Entry1Factory.params_list(2, params)
        |> Enum.with_index(1)
        |> Enum.map(fn
          {map, 1} ->
            %{
              map
              | # here we have changed the experience_id != params.client_id
                experience_id: "x"
            }
            |> Map.put(:client_id, 1)

          {map, 2} ->
            Map.put(map, :client_id, 2)
        end)

      variables = %{
        "input" => [
          params
          |> Map.put(:entries, entries)
          |> Factory.stringify()
        ]
      }

      assert {:ok,
              %{
                data: %{
                  "saveOfflineExperiences1" => [
                    %{
                      "experience" => %{
                        "id" => experience_id,
                        "clientId" => "a",
                        "fieldDefinitions" => _,
                        "entries" => %{
                          "edges" => edges
                        }
                      },
                      "entriesErrors" => [
                        %{
                          "clientId" => "1",
                          "errors" => %{
                            "experienceId" => entry_experience_id_error
                          },
                          "experienceId" => entry_error_experience_id
                        }
                      ]
                    }
                  ]
                }
              }} =
               Absinthe.run(
                 Query.save_offline_experiences(),
                 Schema,
                 variables: variables,
                 context: context(user)
               )

      assert experience_id == entry_error_experience_id
      assert is_binary(entry_experience_id_error)
    end

    test "fails: entry.data_objects.definition_id != experience.data_definitions.client_id" do
      user = RegFactory.insert()
      definitions = FieldDefinitionFactory.params(client_id: "b")

      params =
        Factory.params(
          client_id: "a",
          field_definitions: [definitions]
        )

      entry = Entry1Factory.params(params, %{client_id: "c"})

      [entry_data] = entry.entry_data_list

      entry =
        Map.put(
          entry,
          :entry_data_list,
          # see: we switched field_definition_id from "b" to "d"
          [Map.put(entry_data, :field_definition_id, "d")]
        )

      variables = %{
        "input" => [
          params
          |> Map.put(:entries, [entry])
          |> Factory.stringify()
        ]
      }

      assert {:ok,
              %{
                data: %{
                  "saveOfflineExperiences1" => [
                    %{
                      "experience" => %{
                        "id" => _,
                        "clientId" => "a",
                        "fieldDefinitions" => _,
                        "entries" => %{
                          "edges" => []
                        }
                      },
                      "entriesErrors" => [
                        %{
                          "clientId" => "c",
                          "errors" => %{
                            "entryDataListErrors" => [
                              %{
                                "index" => _,
                                "errors" => %{
                                  "fieldDefinitionId" => field_definition_id_error
                                }
                              }
                            ]
                          },
                          "experienceId" => _
                        }
                      ]
                    }
                  ]
                }
              }} =
               Absinthe.run(
                 Query.save_offline_experiences(),
                 Schema,
                 variables: variables,
                 context: context(user)
               )

      assert is_binary(field_definition_id_error)
    end
  end

  describe "delete experience mutation" do
    test "fails: no user context" do
      variables = %{"id" => "a"}

      assert {:ok,
              %{
                errors: [
                  %{
                    message: "Unauthorized"
                  }
                ]
              }} =
               Absinthe.run(
                 Query.delete(),
                 Schema,
                 variables: variables
               )
    end

    test "fails: id is not global" do
      variables = %{
        "id" => "0"
      }

      capture_log(fn ->
        assert {:ok,
                %{
                  errors: [
                    %{
                      message: _
                    }
                  ]
                }} =
                 Absinthe.run(
                   Query.delete(),
                   Schema,
                   variables: variables,
                   context: context(%{id: "0"})
                 )
      end)
    end

    test "fails: experience does not exist" do
      variables = %{
        "id" => Resolver.convert_to_global_id("0", :experience1)
      }

      assert {:ok,
              %{
                errors: [
                  %{
                    message: _
                  }
                ]
              }} =
               Absinthe.run(
                 Query.delete(),
                 Schema,
                 variables: variables,
                 context: context(%{id: "0"})
               )
    end

    test "succeeds" do
      user = RegFactory.insert()
      experience = Factory.insert(user_id: user.id)
      global_id = Resolver.convert_to_global_id(experience.id, :experience1)
      variables = %{"id" => global_id}

      assert {:ok,
              %{
                data: %{
                  "deleteExperience1" => %{
                    "id" => ^global_id
                  }
                }
              }} =
               Absinthe.run(
                 Query.delete(),
                 Schema,
                 variables: variables,
                 context: context(user)
               )
    end
  end

  defp context(user), do: %{current_user: user}
end
