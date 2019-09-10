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
        ]
      }

      variables = %{
        "input" => Factory.params(attrs) |> Factory.stringify()
      }

      query = Query.create()

      assert {:ok,
              %{
                data: %{
                  "createExperience" => %{
                    "errors" => %{
                      "dataDefinitionsErrors" => [
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

               [
                 node["id"],
                 (node["dataDefinitions"] |> hd())["id"],
                 (node["entries"]["edges"] |> hd())["node"]["id"]
               ]
             end)
             |> Enum.sort() ==
               Enum.sort([
                 experience1.id,
                 entry1.id,
                 (experience1.data_definitions |> hd()).id,
                 experience2.id,
                 entry2.id,
                 (experience2.data_definitions |> hd()).id,
                 experience3.id,
                 entry3.id,
                 (experience3.data_definitions |> hd()).id
               ])
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
      experience = Factory.insert(user_id: user.id)
      Factory.insert(user_id: user.id)

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
                          "id" => ^id,
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
        "input" => [
          %{
            "id" => "a",
            "name" => "a"
          }
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
                     [
                       %{
                         id: "a"
                       }
                     ],
                     0
                   )

          assert is_binary(error)
        end)

      assert log =~ "STACK"
    end

    test "fails: experience does not exist" do
      variables = %{
        "input" => [
          %{
            "id" => Ecto.ULID.generate(),
            "name" => "x"
          }
        ]
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
      date2 = EbnisData.to_iso_datetime_string(def2.updated_at)

      bogus_definition_id = @bogus_id

      variables = %{
        "input" => [
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

      assert {:ok,
              %{
                data: %{
                  "updateDefinitions" => %{
                    "experience" => %{
                      "id" => _,
                      "updatedAt" => ^updated_at,
                      "dataDefinitions" => [
                        %{
                          "id" => ^id2,
                          "updatedAt" => ^date2
                        },
                        %{
                          "id" => ^id1,
                          "updatedAt" => ^updated_at
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
      refute EbnisData.to_iso_datetime_string(def1.updated_at) == updated_at
    end

    test "fails: definition can not be updated" do
      user = RegFactory.insert()

      [def1, def2] =
        Factory.insert(
          %{user_id: user.id},
          [
            "integer",
            "decimal"
          ]
        ).data_definitions

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
                 [
                   %{
                     id: id1,
                     # we attempt to update with name of another definition
                     name: name2
                   }
                 ],
                 user.id
               )

      assert is_binary(name_error)
    end
  end

  defp context(user), do: %{current_user: user}
end
