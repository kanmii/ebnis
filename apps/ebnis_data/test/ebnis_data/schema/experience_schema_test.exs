defmodule EbnisData.Schema.ExperienceTest do
  use EbnisData.DataCase, async: true

  import ExUnit.CaptureLog

  alias EbnisData.Schema
  alias EbnisData.Factory.Registration, as: RegFactory
  alias EbnisData.Factory.Experience, as: Factory
  alias EbnisData.Factory.DataDefinition, as: DataDefinitionFactory
  alias EbnisData.Query.Experience, as: Query
  alias EbnisData.Factory.Entry, as: EntryFactory

  @moduletag capture_log: true
  @bogus_id Ecto.ULID.generate()

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
      user = RegFactory.insert()

      variables = %{
        "input" =>
          Factory.stringify(%{
            title: "aa",
            data_definitions: [
              %{
                name: "bb",
                type: "date"
              },
              %{
                name: "cc",
                type: "integer"
              }
            ]
          })
      }

      query = Query.create()

      assert {:ok,
              %{
                data: %{
                  "createExperience" => %{
                    "experience" => %{
                      "id" => _,
                      "title" => "aa",
                      "dataDefinitions" => [
                        %{
                          "name" => "bb"
                        },
                        %{
                          "name" => "cc"
                        }
                      ],
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
    test "fails: title (case insensitive) not unique for user" do
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
                  "createExperience" => %{
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
    test "fails: data definition name (case insensitive) not unique for experience" do
      user = RegFactory.insert()

      attrs = %{
        data_definitions: [
          DataDefinitionFactory.params(name: "F0"),
          DataDefinitionFactory.params(name: "f0")
        ]
      }

      variables = %{
        "input" =>
          attrs
          |> Factory.params()
          |> Factory.stringify()
      }

      assert {:ok,
              %{
                data: %{
                  "createExperience" => %{
                    "experience" => nil,
                    "errors" => %{
                      "dataDefinitionsErrors" => [
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
                 Query.create(),
                 Schema,
                 variables: variables,
                 context: context(user)
               )

      assert is_binary(name)
    end

    # @tag :skip
    test "fails: data definition type does not exist" do
      user = RegFactory.insert()

      attrs = %{
        data_definitions: [
          %{
            name: "ff",
            type: "integer1"
          }
        ],
        user_id: user.id,
        title: "aa"
      }

      assert {
               :error,
               %{
                 changes: %{
                   data_definitions: [
                     %{
                       errors: [
                         type: {
                           type_error,
                           _
                         }
                       ]
                     }
                   ]
                 }
               }
             } = EbnisData.create_experience(attrs)

      assert is_binary(type_error)
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
                  "createExperience" => %{
                    "experience" => %{
                      "id" => _,
                      "dataDefinitions" => _,
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

    # @tag :skip
    test "recovers from exception" do
      user = RegFactory.insert()

      variables = %{
        "input" =>
          Factory.stringify(%{
            title: "aa",
            description:
              "1111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111",
            data_definitions: [
              %{
                name: "cc",
                type: "integer"
              }
            ]
          })
      }

      log =
        capture_log(fn ->
          assert {:ok,
                  %{
                    errors: [
                      %{
                        message: error
                      }
                    ]
                  }} =
                   Absinthe.run(
                     Query.create(),
                     Schema,
                     variables: variables,
                     context: context(user)
                   )

          assert is_binary(error)
        end)

      assert log =~ "STACK"
    end
  end

  describe "get one experience" do
    # @tag :skip
    test "fails: unauthenticated" do
      variables = %{
        "id" => "0"
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
                 Query.get(),
                 Schema,
                 variables: variables
               )
    end

    # @tag :skip
    test "succeeds for existing experience" do
      user = RegFactory.insert()
      experience = Factory.insert(user_id: user.id)

      entry = EntryFactory.insert(%{}, experience)
      entry_id = entry.id

      variables = %{
        "id" => experience.id
      }

      assert {:ok,
              %{
                data: %{
                  "getExperience" => %{
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
    test "fails: experience does not exist" do
      user = RegFactory.insert()

      variables = %{
        "id" => @bogus_id
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
                 Query.get(),
                 Schema,
                 variables: variables,
                 context: context(user)
               )
    end

    # @tag :skip
    test "fails: wrong user" do
      user = RegFactory.insert()
      %{id: id} = Factory.insert(user_id: user.id)

      variables = %{
        "id" => id
      }

      bogus_user = %{id: @bogus_id}

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
                 context: context(bogus_user)
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
                     message: _
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
      entry1 = EntryFactory.insert(%{}, experience1)

      experience2 = Factory.insert(user_id: user.id)
      entry2 = EntryFactory.insert(%{}, experience2)

      experience3 = Factory.insert(user_id: user.id)
      entry3 = EntryFactory.insert(%{}, experience3)

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
                  "getExperiences" => %{
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

               data_definitions_ids =
                 node["dataDefinitions"]
                 |> Enum.map(& &1["id"])

               entry = (node["entries"]["edges"] |> hd())["node"]

               data_objects_ids =
                 entry["dataObjects"]
                 |> Enum.map(& &1["id"])

               Enum.concat([
                 [
                   node["id"],
                   entry["id"]
                 ],
                 data_definitions_ids,
                 data_objects_ids
               ])
             end)
             |> Enum.sort() ==
               [
                 [
                   experience1.id,
                   experience2.id,
                   experience3.id,
                   entry1.id,
                   entry2.id,
                   entry3.id
                 ],
                 Enum.map(experience1.data_definitions, & &1.id),
                 Enum.map(experience2.data_definitions, & &1.id),
                 Enum.map(experience3.data_definitions, & &1.id),
                 Enum.map(entry1.data_objects, & &1.id),
                 Enum.map(entry2.data_objects, & &1.id),
                 Enum.map(entry3.data_objects, & &1.id)
               ]
               |> Enum.concat()
               |> Enum.sort()
    end

    # @tag :skip
    test "returns []: no experience exists" do
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
                  "getExperiences" => %{
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
    test "succeeds: one has entry, the other no entry" do
      user = RegFactory.insert()
      # experiences are sorted by updated_at desc. We fix the dates to make_ref
      # to make test deterministic
      experience =
        Factory.insert(
          user_id: user.id,
          updated_at: ~U[2012-01-01 11:11:11Z]
        )

      Factory.insert(
        user_id: user.id,
        updated_at: ~U[2012-01-02 11:11:11Z]
      )

      id = experience.id

      experience2 = Factory.insert(user_id: user.id)
      id2 = experience2.id
      entry = EntryFactory.insert(%{}, experience2)
      entry_id = entry.id

      variables = %{
        "input" => %{
          "ids" => [id, id2]
        }
      }

      assert {:ok,
              %{
                data: %{
                  "getExperiences" => %{
                    "edges" => [
                      %{
                        "node" => %{
                          "entries" => %{
                            "edges" => [
                              %{
                                "node" => %{
                                  "id" => ^entry_id
                                }
                              }
                            ]
                          }
                        }
                      },
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

    # @tag :skip
    test "succeeds: all experiences - no entries" do
      user = RegFactory.insert()
      # experiences are sorted by updated_at desc. We fix the dates to make_ref
      # to make test deterministic
      experience =
        Factory.insert(
          user_id: user.id,
          updated_at: ~U[2012-01-01 11:11:11Z]
        )

      Factory.insert(
        user_id: user.id,
        updated_at: ~U[2012-01-02 11:11:11Z]
      )

      id = experience.id

      experience2 = Factory.insert(user_id: user.id)
      id2 = experience2.id

      variables = %{
        "input" => %{
          "ids" => [id, id2]
        }
      }

      assert {:ok,
              %{
                data: %{
                  "getExperiences" => %{
                    "edges" => [
                      %{
                        "node" => %{
                          "entries" => %{
                            "edges" => []
                          }
                        }
                      },
                      %{
                        "node" => %{
                          "id" => ^id,
                          "entries" => %{
                            "edges" => []
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
    test "fails: no user context" do
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
                    message: _
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
    test "fails: user does not exist" do
      bogus_user = %{id: @bogus_id}

      variables = %{
        "input" => [
          Factory.params(client_id: "a")
          |> Factory.stringify()
        ]
      }

      assert {:ok,
              %{
                data: %{
                  "saveOfflineExperiences" => [
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
        DataDefinitionFactory.params_list(2)
        |> Enum.with_index(1)
        |> Enum.map(fn {map, index} -> Map.put(map, :client_id, index) end)

      experience_params1 =
        Factory.params(
          client_id: "a",
          data_definitions: data_definition1
        )

      entries_params =
        EntryFactory.params_list(2, experience_params1)
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
                  "saveOfflineExperiences" => [
                    %{
                      "entriesErrors" => nil,
                      "experience" => %{
                        "id" => _,
                        "clientId" => "a",
                        "dataDefinitions" => _,
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
    test "fails: client id not unique for user" do
      user = RegFactory.insert()
      Factory.insert(client_id: "a", user_id: user.id)

      params =
        Factory.params(
          client_id: "a",
          data_definitions: [
            DataDefinitionFactory.params()
            |> Map.put(:client_id, 1)
          ]
        )

      variables = %{
        "input" => [Factory.stringify(params)]
      }

      assert {:ok,
              %{
                data: %{
                  "saveOfflineExperiences" => [
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
    test "fails: entry.experience_id != experience.client_id" do
      user = RegFactory.insert()

      data_definitions =
        DataDefinitionFactory.params_list(2)
        |> Enum.with_index(1)
        |> Enum.map(fn {map, index} -> Map.put(map, :client_id, index) end)

      params =
        Factory.params(
          client_id: "a",
          data_definitions: data_definitions
        )

      entries =
        EntryFactory.params_list(2, params)
        |> Enum.with_index(1)
        |> Enum.map(fn
          {map, 1} ->
            %{
              map
              | # here we have changed: experience_id != params.client_id
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
                  "saveOfflineExperiences" => [
                    %{
                      "experience" => %{
                        "id" => experience_id,
                        "clientId" => "a",
                        "dataDefinitions" => _,
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
      definitions = DataDefinitionFactory.params(client_id: "b")

      params =
        Factory.params(
          client_id: "a",
          data_definitions: [definitions]
        )

      entry = EntryFactory.params(params, %{client_id: "c"})

      [entry_data] = entry.data_objects

      entry =
        Map.put(
          entry,
          :data_objects,
          # see: we switched definition_id from "b" to "d"
          [Map.put(entry_data, :definition_id, "d")]
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
                  "saveOfflineExperiences" => [
                    %{
                      "experience" => %{
                        "id" => _,
                        "clientId" => "a",
                        "dataDefinitions" => _,
                        "entries" => %{
                          "edges" => []
                        }
                      },
                      "entriesErrors" => [
                        %{
                          "clientId" => "c",
                          "errors" => %{
                            "dataObjectsErrors" => [
                              %{
                                "index" => _,
                                "errors" => %{
                                  "definitionId" => definition_id_error
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

      assert is_binary(definition_id_error)
    end
  end

  describe "delete experience mutation" do
    test "fails: no user context" do
      variables = %{"id" => "a"}

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
                 variables: variables
               )
    end

    test "fails: experience does not exist" do
      variables = %{
        "id" => @bogus_id
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
      id = experience.id
      variables = %{"id" => id}

      assert {:ok,
              %{
                data: %{
                  "deleteExperience" => %{
                    "id" => ^id
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

  describe "update experience mutation" do
    # @tag :skip
    test "fails: no user context" do
      variables = %{
        "input" => %{
          "id" => "1"
        }
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
                 Query.update(),
                 Schema,
                 variables: variables
               )
    end

    # @tag :skip
    test "fails: nothing to update" do
      variables = %{
        "input" => %{
          "id" => 0
        }
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
                 Query.update(),
                 Schema,
                 variables: variables,
                 context: context(%{id: 0})
               )
    end

    # @tag :skip
    test "fails: experience does not exist" do
      variables = %{
        "input" => %{
          "id" => @bogus_id,
          "title" => "a"
        }
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
                 Query.update(),
                 Schema,
                 variables: variables,
                 context: context(%{id: 0})
               )
    end

    # @tag :skip
    test "fails: title not unique" do
      user = RegFactory.insert()
      title = "ab"
      Factory.insert(user_id: user.id, title: title)

      experience = Factory.insert(user_id: user.id)

      variables = %{
        "input" => %{
          "id" => experience.id,
          "title" => title
        }
      }

      assert {:ok,
              %{
                data: %{
                  "updateExperience" => %{
                    "experience" => nil,
                    "errors" => %{
                      "title" => title_error
                    }
                  }
                }
              }} =
               Absinthe.run(
                 Query.update(),
                 Schema,
                 variables: variables,
                 context: context(user)
               )

      assert is_binary(title_error)
    end

    # @tag :skip
    test "succeeds" do
      user = RegFactory.insert()
      experience = Factory.insert(user_id: user.id)
      id = experience.id

      variables = %{
        "input" => %{
          "id" => id,
          "title" => "aa",
          "description" => "b"
        }
      }

      assert {:ok,
              %{
                data: %{
                  "updateExperience" => %{
                    "experience" => %{
                      "id" => ^id,
                      "title" => "aa",
                      "description" => "b"
                    }
                  }
                }
              }} =
               Absinthe.run(
                 Query.update(),
                 Schema,
                 variables: variables,
                 context: context(user)
               )
    end
  end

  describe "update data definitions" do
    test "unauthorized" do
      variables = %{
        "input" => %{
          "experience_id" => "a",
          "definitions" => [
            %{
              "id" => "a",
              "name" => "a"
            }
          ]
        }
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
                 Query.update_definitions(),
                 Schema,
                 variables: variables
               )
    end

    test "fails: exception logged" do
      log =
        capture_log(fn ->
          assert {:error, error} =
                   EbnisData.update_definitions(
                     %{
                       experience_id: "a",
                       definitions: [
                         %{
                           id: "a"
                         }
                       ]
                     },
                     0
                   )

          assert is_binary(error)
        end)

      assert log =~ "STACK"
    end

    test "fails: experience does not exist" do
      variables = %{
        "input" => %{
          "experience_id" => @bogus_id,
          "definitions" => [
            %{
              "id" => @bogus_id,
              "name" => "x"
            }
          ]
        }
      }

      assert {:ok,
              %{
                errors: [
                  %{
                    message: "experience does not exist"
                  }
                ]
              }} =
               Absinthe.run(
                 Query.update_definitions(),
                 Schema,
                 variables: variables,
                 context: context(%{id: Ecto.ULID.generate()})
               )
    end

    test "one succeeds, one defintion not found" do
      user = RegFactory.insert()

      experience =
        Factory.insert(
          %{user_id: user.id},
          [
            "integer",
            "decimal"
          ]
        )

      [def1, def2] = experience.data_definitions
      id1 = def1.id
      updated_at = "2019-08-15T10:20:24Z"

      id2 = def2.id
      date2 = DateTime.to_iso8601(def2.updated_at)

      bogus_definition_id = @bogus_id

      variables = %{
        "input" => %{
          "experience_id" => experience.id,
          "definitions" => [
            %{
              "id" => bogus_definition_id,
              "name" => "b"
            },
            %{
              "id" => id1,
              "name" => "aa",
              "updatedAt" => updated_at
            }
          ]
        }
      }

      assert {:ok,
              %{
                data: %{
                  "updateDefinitions" => %{
                    "experience" => %{
                      "id" => _,
                      "updatedAt" => ^updated_at,
                      "dataDefinitions" => [
                        %{
                          "id" => ^id1,
                          "updatedAt" => ^updated_at
                        },
                        %{
                          "id" => ^id2,
                          "updatedAt" => ^date2
                        }
                      ]
                    },
                    "definitions" => [
                      %{
                        "definition" => nil,
                        "errors" => %{
                          "id" => ^bogus_definition_id,
                          "errors" => %{
                            "definition" => error
                          }
                        }
                      },
                      %{
                        "definition" => %{
                          "id" => ^id1,
                          "name" => updated_name,
                          "updatedAt" => ^updated_at
                        },
                        "errors" => nil
                      }
                    ]
                  }
                }
              }} =
               Absinthe.run(
                 Query.update_definitions(),
                 Schema,
                 variables: variables,
                 context: context(user)
               )

      refute def1.name == updated_name
      assert is_binary(error)
      refute DateTime.to_iso8601(def1.updated_at) == updated_at
    end

    test "fails: definition can not be updated" do
      user = RegFactory.insert()

      experience =
        Factory.insert(
          %{user_id: user.id},
          [
            "integer",
            "decimal"
          ]
        )

      [def1, def2] = experience.data_definitions

      %{id: id1} = def1
      %{name: name2} = def2

      assert %{
               experience: %{
                 id: _,
                 data_definitions: [
                   %{},
                   %{}
                 ]
               },
               definitions: [
                 %{
                   errors: %{
                     id: ^id1,
                     errors: [{:name, {name_error, _}}]
                   }
                 }
               ]
             } =
               EbnisData.update_definitions(
                 %{
                   experience_id: experience.id,
                   definitions: [
                     %{
                       id: id1,
                       # we attempt to update with name of another definition
                       name: name2
                     }
                   ]
                 },
                 user.id
               )

      assert is_binary(name_error)
    end

    test "wrong arguments" do
      assert {:error, _} = EbnisData.update_definitions(%{}, "a")
    end
  end

  describe "update experiences" do
    test "unauthorized" do
      assert {
               :ok,
               %{
                 data: %{
                   "updateExperiences" => %{
                     "error" => error
                   }
                 }
               }
             } =
               Absinthe.run(
                 Query.update_experiences(),
                 Schema,
                 variables: %{
                   "input" => []
                 }
               )

      assert is_binary(error)
    end

    test "successes/failures/exceptions" do
      bogus_id = @bogus_id
      user = RegFactory.insert()

      %{
        id: update_own_fields_success_experience_id,
        description: update_own_fields_success_description,
        title: own_fields_success_title,
        data_definitions: definitions
      } =
        experience =
        Factory.insert(
          %{user_id: user.id},
          [
            "integer",
            "integer"
          ]
        )

      [definition0, definition1] = definitions
      definition0_id = definition0.id
      definition1_id = definition1.id
      definition1_name = definition1.name
      definition0_name = definition0.name
      refute definition0_name == definition1_name
      definition0_name_updated = definition0_name <> "1"

      updated_at0 = "1980-01-21T05:27:17Z"
      updated_at1 = "1982-01-21T05:27:17Z"
      updated_title = "aa"
      # refute updated_at == DateTime.to_iso8601(experience.updated_at)
      refute own_fields_success_title == updated_title

      own_fields_success_variable = %{
        "experienceId" => update_own_fields_success_experience_id,
        "ownFields" => %{
          "title" => updated_title
        }
      }

      experience_not_found_variable = %{
        "experienceId" => bogus_id
      }

      raises_id = "1"

      raises_variable = %{
        "experienceId" => raises_id
      }

      own_fields_error_variable = %{
        "experienceId" => update_own_fields_success_experience_id,
        "ownFields" => %{
          # title must be at least 2 chars long
          "title" => "a"
        }
      }

      definitions_variables = %{
        "experienceId" => update_own_fields_success_experience_id,
        "updateDefinitions" => [
          %{
            "id" => bogus_id,
            "name" => "aa"
          },
          %{
            "id" => raises_id,
            "name" => "aa"
          },
          %{
            "id" => definition0_id,
            # name must be at least 2 chars long
            "name" => "a"
          },
          %{
            "id" => definition0_id,
            # name already taken
            "name" => definition1_name
          },
          %{
            "id" => definition0_id,
            # success
            "name" => definition0_name_updated
          }
        ]
      }

      %{
        id: entry_id,
        data_objects: data_objects
      } = _entry = EntryFactory.insert(%{}, experience)

      [
        %{
          id: data0_id,
          data: data0_data,
          updated_at: data0_updated_at
        },
        _
      ] = data_objects

      refute data0_data["integer"] == 1
      refute updated_at0 == DateTime.to_iso8601(data0_updated_at)

      entry_not_found_variable = %{
        "experienceId" => update_own_fields_success_experience_id,
        "updateEntries" => [
          %{
            "entryId" => bogus_id,
            "dataObjects" => [
              %{
                "id" => "1",
                "data" => ~s({"integer":1})
              }
            ]
          }
        ]
      }

      entry_raises_variable = %{
        "experienceId" => update_own_fields_success_experience_id,
        "updateEntries" => [
          %{
            "entryId" => raises_id,
            "dataObjects" => [
              %{
                "id" => "1",
                "data" => ~s({"integer":1})
              }
            ]
          }
        ]
      }

      entry_data_object_raises_variable = %{
        "experienceId" => update_own_fields_success_experience_id,
        "updateEntries" => [
          %{
            "entryId" => entry_id,
            "dataObjects" => [
              %{
                "id" => raises_id,
                "data" => ~s({"integer":1})
              }
            ]
          }
        ]
      }

      entry_data_object_not_found_variable = %{
        "experienceId" => update_own_fields_success_experience_id,
        "updateEntries" => [
          %{
            "entryId" => entry_id,
            "dataObjects" => [
              %{
                "id" => bogus_id,
                "data" => ~s({"integer":1})
              }
            ]
          }
        ]
      }

      data_updated_success_variable = %{
        "experienceId" => update_own_fields_success_experience_id,
        "updateEntries" => [
          %{
            "entryId" => entry_id,
            "dataObjects" => [
              %{
                "id" => data0_id,
                "data" => ~s({"integer":1}),
                "updatedAt" => updated_at0
              },
              %{
                "id" => data0_id,
                "data" => ~s({"integer":0.1})
              },
              %{
                "id" => data0_id,
                "data" => ~s({"integer":5}),
                "updatedAt" => updated_at1
              }
            ]
          }
        ]
      }

      create_entry_invalid_data = %{
        "experienceId" => update_own_fields_success_experience_id,
        "addEntries" => [
          %{
            "dataObjects" => [
              %{
                "definitionId" => definition0_id,
                "data" => ~s({"integer":0.1})
              },
              %{
                "definitionId" => definition1_id,
                "data" => ~s({"integer":1})
              }
            ]
          }
        ]
      }

      create_entry_client_id_not_unique = %{
        "experienceId" => update_own_fields_success_experience_id,
        "addEntries" => [
          %{
            "clientId" => "a",
            "dataObjects" => [
              %{
                "definitionId" => definition0_id,
                "data" => ~s({"integer":1}),
                "clientId" => "x"
              },
              %{
                "definitionId" => definition1_id,
                "data" => ~s({"integer":2}),
                "clientId" => "y"
              }
            ]
          },
          %{
            "clientId" => "a",
            "dataObjects" => [
              %{
                "definitionId" => definition0_id,
                "data" => ~s({"integer":3})
              },
              %{
                "definitionId" => definition1_id,
                "data" => ~s({"integer":4})
              }
            ]
          }
        ]
      }

      variables = %{
        "input" => [
          experience_not_found_variable,
          raises_variable,
          own_fields_success_variable,
          own_fields_error_variable,
          definitions_variables,
          entry_not_found_variable,
          entry_raises_variable,
          entry_data_object_raises_variable,
          entry_data_object_not_found_variable,
          data_updated_success_variable,
          create_entry_invalid_data,
          create_entry_client_id_not_unique
        ]
      }

      log =
        capture_log(fn ->
          assert {
                   :ok,
                   %{
                     data: %{
                       "updateExperiences" => %{
                         "experiences" => [
                           %{
                             "errors" => %{
                               "experienceId" => ^bogus_id,
                               "error" => experience_not_found_error
                             }
                           },
                           %{
                             "errors" => %{
                               "experienceId" => ^raises_id,
                               "error" => raises_error
                             }
                           },
                           %{
                             "experience" => %{
                               "experienceId" => ^update_own_fields_success_experience_id,
                               # "updatedAt" => "update_own_fields_experience_updated_at",
                               "ownFields" => %{
                                 "data" => %{
                                   "description" => ^update_own_fields_success_description,
                                   "title" => ^updated_title
                                 }
                               }
                             }
                           },
                           %{
                             "experience" => %{
                               "experienceId" => ^update_own_fields_success_experience_id,
                               "ownFields" => %{
                                 "errors" => %{
                                   "title" => own_fields_error_title
                                 }
                               }
                             }
                           },
                           %{
                             "experience" => %{
                               "experienceId" => ^update_own_fields_success_experience_id,
                               "updatedDefinitions" => [
                                 %{
                                   "errors" => %{
                                     "id" => ^bogus_id,
                                     "error" => definition_not_found_error
                                   }
                                 },
                                 %{
                                   "errors" => %{
                                     "id" => ^raises_id,
                                     "error" => _
                                   }
                                 },
                                 %{
                                   "errors" => %{
                                     "id" => ^definition0_id,
                                     "name" => definition_name_too_short_error
                                   }
                                 },
                                 %{
                                   "errors" => %{
                                     "id" => ^definition0_id,
                                     "name" => definition_name_taken_error
                                   }
                                 },
                                 %{
                                   "definition" => %{
                                     "id" => ^definition0_id,
                                     "name" => ^definition0_name_updated
                                   }
                                 }
                               ]
                             }
                           },
                           %{
                             "experience" => %{
                               "experienceId" => _,
                               "updatedEntries" => [
                                 %{
                                   "errors" => %{
                                     "entryId" => ^bogus_id,
                                     "error" => entry_not_found_error
                                   }
                                 }
                               ]
                             }
                           },
                           %{
                             "experience" => %{
                               "experienceId" => _,
                               "updatedEntries" => [
                                 %{
                                   "errors" => %{
                                     "entryId" => ^raises_id,
                                     "error" => _entry_not_found_error
                                   }
                                 }
                               ]
                             }
                           },
                           %{
                             "experience" => %{
                               "experienceId" => _,
                               "updatedEntries" => [
                                 %{
                                   "entry" => %{
                                     "entryId" => ^entry_id,
                                     "updatedAt" => _,
                                     "dataObjects" => [
                                       %{
                                         "errors" => %{
                                           "id" => ^raises_id,
                                           "error" => data_object_not_found_error
                                         }
                                       }
                                     ]
                                   }
                                 }
                               ]
                             }
                           },
                           %{
                             "experience" => %{
                               "experienceId" => _,
                               "updatedEntries" => [
                                 %{
                                   "entry" => %{
                                     "entryId" => ^entry_id,
                                     "updatedAt" => _,
                                     "dataObjects" => [
                                       %{
                                         "errors" => %{
                                           "id" => ^bogus_id,
                                           "error" => _
                                         }
                                       }
                                     ]
                                   }
                                 }
                               ]
                             }
                           },
                           %{
                             "experience" => %{
                               "experienceId" => ^update_own_fields_success_experience_id,
                               "updatedEntries" => [
                                 %{
                                   "entry" => %{
                                     "entryId" => ^entry_id,
                                     "updatedAt" => ^updated_at1,
                                     "dataObjects" => [
                                       %{
                                         "dataObject" => %{
                                           "id" => ^data0_id,
                                           "updatedAt" => ^updated_at0,
                                           "data" => ~s({"integer":1})
                                         }
                                       },
                                       %{
                                         "errors" => %{
                                           "id" => ^data0_id,
                                           "data" => data_wrong_error
                                         }
                                       },
                                       %{
                                         "dataObject" => %{
                                           "id" => ^data0_id,
                                           "updatedAt" => ^updated_at1,
                                           "data" => ~s({"integer":5})
                                         }
                                       }
                                     ]
                                   }
                                 }
                               ]
                             }
                           },
                           %{
                             "experience" => %{
                               "experienceId" => _,
                               "newEntries" => [
                                 %{
                                   "errors" => %{
                                     "dataObjects" => [
                                       %{
                                         "data" => "is invalid",
                                         "index" => 0
                                       }
                                     ],
                                     "meta" => %{
                                       "index" => 0
                                     }
                                   }
                                 }
                               ],
                               "updatedAt" => _
                             }
                           },
                           %{
                             "experience" => %{
                               "experienceId" => ^update_own_fields_success_experience_id,
                               "newEntries" => [
                                 %{
                                   "entry" => %{
                                     "id" => _,
                                     "experienceId" => ^update_own_fields_success_experience_id,
                                     "clientId" => "a",
                                     "dataObjects" => [
                                       %{
                                         "definitionId" => definition0_id,
                                         "data" => ~s({"integer":1}),
                                         "clientId" => "x"
                                       },
                                       %{
                                         "definitionId" => definition1_id,
                                         "data" => ~s({"integer":2}),
                                         "clientId" => "y"
                                       }
                                     ]
                                   }
                                 },
                                 %{
                                   "errors" => %{
                                     "meta" => %{
                                       "index" => 1,
                                       "clientId" => "a"
                                     },
                                     "clientId" => client_id_not_unique_error
                                   }
                                 }
                               ]
                             }
                           }
                         ]
                       }
                     }
                   }
                 } =
                   Absinthe.run(
                     Query.update_experiences(),
                     Schema,
                     variables: variables,
                     context: context(user)
                   )

          assert is_binary(experience_not_found_error)
          assert is_binary(raises_error)
          assert is_binary(own_fields_error_title)
          assert is_binary(definition_not_found_error)
          assert is_binary(definition_name_too_short_error)
          assert is_binary(definition_name_taken_error)
          assert is_binary(entry_not_found_error)
          assert is_binary(data_object_not_found_error)
          assert is_binary(data_wrong_error)
          assert is_binary(client_id_not_unique_error)
        end)

      assert log =~ "STACK"
    end
  end

  describe "create experiences" do
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
                    message: error
                  }
                ]
              }} =
               Absinthe.run(
                 Query.create_experiences(),
                 Schema,
                 variables: variables
               )

      assert is_binary(error)
    end

    # @tag :skip
    test "succeeds for happy path" do
      user = RegFactory.insert()

      inserted_at_string = "2016-05-05T09:41:22Z"
      client_id_taken = ".,"

      success_no_entry_input = %{
        "title" => "a1",
        "dataDefinitions" => [
          %{
            "name" => "a1",
            "type" => "DATE"
          }
        ],
        "insertedAt" => inserted_at_string,
        "updatedAt" => inserted_at_string,
        "clientId" => client_id_taken
      }

      title_case_insensitive_not_unique_input = %{
        "title" => "A1",
        "dataDefinitions" => [
          %{
            "name" => "a1",
            "type" => "DATE"
          }
        ]
      }

      definition_name_taken_input =
        %{
          data_definitions: [
            DataDefinitionFactory.params(name: "F0"),
            DataDefinitionFactory.params(name: "f0")
          ],
          client_id: "a"
        }
        |> Factory.params()
        |> Factory.stringify()

      experience_raises_input = %{
        "title" => "a2",
        "description" =>
          "1111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111",
        "dataDefinitions" => [
          %{
            "name" => "a1",
            "type" => "DATE"
          }
        ]
      }

      client_id_taken_input = %{
        "clientId" => client_id_taken,
        "title" => "a3",
        "dataDefinitions" => [
          %{
            "name" => "a1",
            "type" => "DATE"
          }
        ]
      }

      entry_experience_id_not_experience_client_id_input = %{
        "clientId" => "a4",
        "title" => "a4",
        "dataDefinitions" => [
          %{
            "name" => "a1",
            "type" => "INTEGER"
          }
        ],
        "entries" => [
          %{
            "clientId" => "a41",
            # differs from experience.client_id
            "experienceId" => "a4.",
            "dataObjects" => [
              %{
                "data" => ~s({"integer":1}),
                "definitionId" => "a1"
              }
            ]
          }
        ]
      }

      definition_id_not_definition_client_id_input = %{
        "clientId" => "a5",
        "title" => "a5",
        "dataDefinitions" => [
          %{
            "name" => "a1",
            "type" => "INTEGER",
            "clientId" => "a1"
          },
          %{
            "name" => "a2",
            "type" => "INTEGER",
            "clientId" => "a2"
          },
          %{
            "name" => "a3",
            "type" => "INTEGER",
            "clientId" => "a3"
          }
        ],
        "entries" => [
          %{
            "clientId" => "a51",
            "experienceId" => "a5",
            "dataObjects" => [
              %{
                "data" => ~s({"integer":1}),
                # differs from definition.client_id
                "definitionId" => "a1."
              },
              %{
                "data" => ~s({"integer":1}),
                "definitionId" => "a2"
              },
              %{
                "data" => ~s({"integer":1}),
                # differs from definition.client_id
                "definitionId" => "a3."
              }
            ]
          }
        ]
      }

      success_and_errors_has_entry_input = %{
        "title" => "a6",
        "dataDefinitions" => [
          %{
            "name" => "a1",
            "type" => "INTEGER",
            "clientId" => "0"
          }
        ],
        "entries" => [
          %{
            "experienceId" => "a5",
            "dataObjects" => [
              %{
                "data" => ~s({"integer":0.1}),
                "definitionId" => "0"
              }
            ]
          },
          %{
            "experienceId" => "a5",
            "dataObjects" => [
              %{
                "data" => ~s({"integer":1}),
                "definitionId" => "0"
              }
            ]
          },
          %{
            "experienceId" => "a5",
            "dataObjects" => [
              %{
                "data" => ~s({"integer":1}),
                "definitionId" => ","
              }
            ]
          }
        ]
      }

      variables = %{
        "input" => [
          success_no_entry_input,
          title_case_insensitive_not_unique_input,
          definition_name_taken_input,
          experience_raises_input,
          client_id_taken_input,
          entry_experience_id_not_experience_client_id_input,
          definition_id_not_definition_client_id_input,
          success_and_errors_has_entry_input
        ]
      }

      log =
        capture_log(fn ->
          assert {:ok,
                  %{
                    data: %{
                      "createExperiences" => [
                        %{
                          "experience" => %{
                            "insertedAt" => ^inserted_at_string,
                            "updatedAt" => ^inserted_at_string,
                            "id" => _,
                            "title" => "a1",
                            "dataDefinitions" => [
                              %{
                                "name" => "a1"
                              }
                            ],
                            "clientId" => ^client_id_taken,
                            "hasUnsaved" => nil,
                            "entries" => %{
                              "edges" => [],
                              "pageInfo" => %{
                                "hasNextPage" => false,
                                "hasPreviousPage" => false
                              }
                            }
                          }
                        },
                        %{
                          "errors" => %{
                            "meta" => %{
                              "index" => 1,
                              "clientId" => nil
                            },
                            "title" => title_case_insensitive_not_unique_error
                          }
                        },
                        %{
                          "errors" => %{
                            "meta" => %{
                              "index" => 2,
                              "clientId" => "a"
                            },
                            "title" => nil,
                            "dataDefinitions" => [
                              %{
                                "index" => 1,
                                "name" => definition_name_taken_error,
                                "type" => nil
                              }
                            ]
                          }
                        },
                        %{
                          "errors" => %{
                            "meta" => %{
                              "index" => 3
                            },
                            "error" => experience_raises_error
                          }
                        },
                        %{
                          "errors" => %{
                            "meta" => %{
                              "index" => 4,
                              "clientId" => ^client_id_taken
                            },
                            "clientId" => client_id_taken_error,
                            "title" => nil
                          }
                        },
                        %{
                          "experience" => %{
                            "id" => entry_experience_id_not_experience_client_id,
                            "title" => "a4",
                            "dataDefinitions" => [
                              %{
                                "name" => "a1"
                              }
                            ],
                            "clientId" => "a4",
                            "entries" => %{
                              "edges" => []
                            }
                          },
                          "entriesErrors" => [
                            %{
                              "meta" => %{
                                "index" => 0,
                                "experienceId" => entry_experience_id_not_experience_client_id,
                                "clientId" => "a41"
                              },
                              "experienceId" =>
                                entry_experience_id_not_experience_client_id_error,
                              "clientId" => nil
                            }
                          ]
                        },
                        %{
                          "experience" => %{
                            "id" => definition_id_not_definition_client_id_input_id,
                            "title" => "a5",
                            "dataDefinitions" => [
                              %{
                                "name" => "a1"
                              },
                              %{
                                "name" => "a2"
                              },
                              %{
                                "name" => "a3"
                              }
                            ],
                            "clientId" => "a5",
                            "entries" => %{
                              "edges" => []
                            }
                          },
                          "entriesErrors" => [
                            %{
                              "meta" => %{
                                "index" => 0,
                                "experienceId" => definition_id_not_definition_client_id_input_id,
                                "clientId" => "a51"
                              },
                              "experienceId" => nil,
                              "clientId" => nil,
                              "dataObjects" => [
                                %{
                                  "index" => 0,
                                  "definitionId" => definition_id_not_definition_client_id_error0
                                },
                                %{
                                  "index" => 2,
                                  "definitionId" => definition_id_not_definition_client_id_error2
                                }
                              ]
                            }
                          ]
                        },
                        %{
                          "experience" => %{
                            "id" => success_and_errors_has_entry_input_id,
                            "title" => "a6",
                            "dataDefinitions" => [
                              %{
                                "name" => "a1",
                                "id" => success_and_errors_has_entry_input_definition_id
                              }
                            ],
                            "entries" => %{
                              "edges" => [
                                %{
                                  "node" => %{
                                    "id" => _,
                                    "dataObjects" => [
                                      %{
                                        "id" => _,
                                        "definitionId" =>
                                          success_and_errors_has_entry_input_definition_id
                                      }
                                    ]
                                  }
                                }
                              ]
                            }
                          },
                          "entriesErrors" => [
                            %{
                              "meta" => %{
                                "index" => 0,
                                "experienceId" => success_and_errors_has_entry_input_id
                              },
                              "dataObjects" => [
                                %{
                                  "data" => success_and_errors_has_entry_input_error0
                                }
                              ]
                            },
                            %{
                              "meta" => %{
                                "index" => 2,
                                "experienceId" => success_and_errors_has_entry_input_id
                              },
                              "dataObjects" => [
                                %{
                                  "definitionId" => success_and_errors_has_entry_input_error2
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  }} =
                   Absinthe.run(
                     Query.create_experiences(),
                     Schema,
                     variables: variables,
                     context: context(user)
                   )

          assert is_binary(title_case_insensitive_not_unique_error)
          assert is_binary(definition_name_taken_error)
          assert is_binary(experience_raises_error)
          assert is_binary(client_id_taken_error)
          assert is_binary(entry_experience_id_not_experience_client_id_error)
          assert is_binary(definition_id_not_definition_client_id_error0)
          assert is_binary(definition_id_not_definition_client_id_error2)
          assert is_binary(success_and_errors_has_entry_input_error0)
          assert is_binary(success_and_errors_has_entry_input_error2)
        end)

      assert log =~ "STACK"
    end

    # @tag :skip
    test "fails: data definition type does not exist" do
      user = RegFactory.insert()

      attrs = %{
        data_definitions: [
          %{
            name: "ff",
            type: "integer1"
          }
        ],
        user_id: user.id,
        title: "aa"
      }

      assert {
               :error,
               %{
                 changes: %{
                   data_definitions: [
                     %{
                       errors: [
                         type: {
                           type_error,
                           _
                         }
                       ]
                     }
                   ]
                 }
               }
             } = EbnisData.create_experience1(attrs)

      assert is_binary(type_error)
    end
  end

  defp context(user), do: %{current_user: user}
end
