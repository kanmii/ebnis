defmodule EbnisData.Schema.EntryTest do
  use EbnisData.DataCase, async: true

  import ExUnit.CaptureLog

  alias EbnisData.Schema
  alias EbnisData.Factory.Registration, as: RegFactory
  alias EbnisData.Factory.Entry, as: Factory
  alias EbnisData.Factory.Experience, as: ExperienceFactory
  alias EbnisData.Query.Entry, as: Query
  alias EbnisData.Factory.DataDefinition, as: DataDefinitionFactory

  @moduletag capture_log: true
  @bogus_id Ecto.ULID.generate()

  describe "create entry" do
    # @tag :skip
    test "fails: no user context" do
      params = %{
        experience_id: @bogus_id,
        data_objects: [
          %{
            definition_id: "a",
            data: %{"integer" => 1}
          }
        ]
      }

      variables = %{
        "input" => Factory.stringify(params)
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
    test "succeeds without client ID" do
      user = RegFactory.insert()

      {:ok, experience} =
        EbnisData.create_experience(%{
          user_id: user.id,
          title: "aa",
          data_definitions: [
            %{
              name: "bb",
              type: "multi_line_text"
            }
          ]
        })

      experience_id = experience.id
      [%{id: definition_id}] = experience.data_definitions

      variables = %{
        "input" =>
          Factory.stringify(%{
            experience_id: experience.id,
            data_objects: [
              %{
                definition_id: definition_id,
                data: %{
                  multi_line_text: "aa"
                }
              }
            ]
          })
      }

      assert {:ok,
              %{
                data: %{
                  "createEntry" => %{
                    "entry" => %{
                      "id" => _,
                      "experienceId" => ^experience_id,
                      "modOffline" => nil,
                      "dataObjects" => [
                        %{
                          "definitionId" => definition_id_gql
                        }
                      ],
                      "clientId" => _
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

      assert definition_id == definition_id_gql
    end

    # @tag :skip
    test "fails: experience id does not exist" do
      user = RegFactory.insert()

      params = %{
        experience_id: "0",
        data_objects: [
          %{
            definition_id: @bogus_id,
            data: %{"integer" => 1}
          }
        ]
      }

      variables = %{
        "input" => Factory.stringify(params)
      }

      assert {:ok,
              %{
                data: %{
                  "createEntry" => %{
                    "entry" => nil,
                    "errors" => %{
                      "experience" => experienceError
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

      assert is_binary(experienceError)
    end

    # @tag :skip
    test "fails: creator of entry is not owner of experience" do
      user = RegFactory.insert()
      experience = ExperienceFactory.insert(user_id: user.id)

      variables = %{
        "input" =>
          experience
          |> Factory.params()
          |> Factory.stringify()
      }

      bogus_user = %{id: @bogus_id}

      assert {:ok,
              %{
                data: %{
                  "createEntry" => %{
                    "entry" => nil,
                    "errors" => %{
                      "experience" => experienceError
                    }
                  }
                }
              }} =
               Absinthe.run(
                 Query.create(),
                 Schema,
                 variables: variables,
                 context: context(bogus_user)
               )

      assert is_binary(experienceError)
    end

    # @tag :skip
    test "fails: data definition does not exist" do
      user = RegFactory.insert()
      experience = ExperienceFactory.insert(user_id: user.id)
      params = Factory.params(experience)

      bogus_field = %{
        data: %{"integer" => 1},
        definition_id: @bogus_id
      }

      params = update_in(params.data_objects, &[bogus_field | &1])

      variables = %{
        "input" => Factory.stringify(params)
      }

      assert {:ok,
              %{
                data: %{
                  "createEntry" => %{
                    "entry" => nil,
                    "errors" => %{
                      "dataObjectsErrors" => [
                        %{
                          "index" => 0,
                          "errors" => %{
                            "definition" => field_definition_error
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

      assert is_binary(field_definition_error)
    end

    # @tag :skip
    test "fails: data definition ID not unique" do
      user = RegFactory.insert()
      experience = ExperienceFactory.insert(user_id: user.id)
      params = Factory.params(experience)

      # duplicate the first data_object
      params =
        update_in(
          params.data_objects,
          &(&1 ++ [hd(&1)])
        )

      index_of_duplicate_data_object = length(params.data_objects) - 1

      variables = %{
        "input" => Factory.stringify(params)
      }

      assert {:ok,
              %{
                data: %{
                  "createEntry" => %{
                    "entry" => nil,
                    "errors" => %{
                      "dataObjectsErrors" => [
                        %{
                          "index" => ^index_of_duplicate_data_object,
                          "errors" => %{
                            "definitionId" => field_definition_id
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

      assert is_binary(field_definition_id)
    end

    # @tag :skip
    test "fails: data_object.data.type != definition.type" do
      user = RegFactory.insert()

      experience =
        %{
          user_id: user.id,
          data_definitions: [%{name: "aa", type: "integer"}]
        }
        |> ExperienceFactory.insert()

      params = %{
        experience_id: experience.id,
        data_objects: [
          %{
            definition_id: hd(experience.data_definitions).id,
            data: %{decimal: 0.1}
          }
        ]
      }

      variables = %{
        "input" => Factory.stringify(params)
      }

      assert {:ok,
              %{
                data: %{
                  "createEntry" => %{
                    "entry" => nil,
                    "errors" => %{
                      "dataObjectsErrors" => [
                        %{
                          "index" => 0,
                          "errors" => %{
                            "data" => data_error
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

      assert is_binary(data_error)
    end

    # @tag :skip
    test "succeeds with client id" do
      user = RegFactory.insert()
      experience = ExperienceFactory.insert(user_id: user.id)
      client_id = "me"

      entry_params = Factory.params(experience, client_id: client_id)

      entry_params =
        update_in(
          entry_params.data_objects,
          fn [obj | rest] ->
            [
              Map.put(obj, :client_id, "a") | rest
            ]
          end
        )

      variables = %{
        "input" => Factory.stringify(entry_params)
      }

      assert {:ok,
              %{
                data: %{
                  "createEntry" => %{
                    "entry" => %{
                      "id" => _,
                      "clientId" => ^client_id,
                      "dataObjects" => [
                        %{
                          "clientId" => "a"
                        }
                        | _
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
    end

    # @tag :skip
    test "fails for non unique client id" do
      user = RegFactory.insert()
      experience = ExperienceFactory.insert(user_id: user.id)
      client_id = "me"
      Factory.insert(%{client_id: client_id}, experience)

      variables = %{
        "input" =>
          experience
          |> Factory.params(client_id: client_id)
          |> Factory.stringify()
      }

      assert {:ok,
              %{
                data: %{
                  "createEntry" => %{
                    "errors" => %{
                      "clientId" => client_id_error
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

      assert is_binary(client_id_error)
    end

    # @tag :skip
    test "succeeds with timestamps" do
      inserted_at = ~U[2012-01-01 03:04:05Z]
      inserted_at_string = "2012-01-01T03:04:05Z"

      timestamps = %{
        inserted_at: inserted_at,
        updated_at: inserted_at
      }

      user = RegFactory.insert()
      experience = ExperienceFactory.insert(user_id: user.id)

      params =
        Factory.params(experience)
        |> Map.merge(timestamps)

      params =
        update_in(
          params.data_objects,
          fn [obj | rest] ->
            [
              Map.merge(
                obj,
                timestamps
              )
              | rest
            ]
          end
        )

      variables = %{
        "input" => Factory.stringify(params)
      }

      assert {:ok,
              %{
                data: %{
                  "createEntry" => %{
                    "entry" => %{
                      "id" => _,
                      "insertedAt" => ^inserted_at_string,
                      "updatedAt" => ^inserted_at_string,
                      "dataObjects" => [
                        %{
                          "insertedAt" => ^inserted_at_string,
                          "updatedAt" => ^inserted_at_string
                        }
                        | _
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
    end

    # @tag :skip
    test "fails: data_object.data can not be cast" do
      user = RegFactory.insert()

      experience =
        %{
          user_id: user.id,
          title: "aa",
          data_definitions: [%{name: "bb", type: "integer"}]
        }
        |> ExperienceFactory.insert()

      [definition | _] = experience.data_definitions
      definitionClientId = "a"

      params = %{
        experience_id: experience.id,
        data_objects: [
          %{
            definition_id: definition.id,
            # notice how we specified a decimal value for an integer data
            data: %{integer: 0.1},
            client_id: definitionClientId
          }
        ]
      }

      variables = %{
        "input" => Factory.stringify(params)
      }

      assert {:ok,
              %{
                data: %{
                  "createEntry" => %{
                    "errors" => %{
                      "dataObjectsErrors" => [
                        %{
                          "clientId" => ^definitionClientId,
                          "index" => 0,
                          "errors" => %{
                            "data" => data_errors
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

      assert is_binary(data_errors)
    end

    # @tag :skip
    test "fails: data objects must contain all definitions" do
      user = RegFactory.insert()

      experience =
        ExperienceFactory.insert(%{
          user_id: user.id,
          data_definitions: DataDefinitionFactory.params_list(2)
        })

      params = Factory.params(experience)

      # use only one data object
      params = update_in(params.data_objects, &[&1 |> hd()])

      variables = %{
        "input" => Factory.stringify(params)
      }

      assert {:ok,
              %{
                data: %{
                  "createEntry" => %{
                    "entry" => nil,
                    "errors" => %{
                      "dataObjectsErrors" => [
                        %{
                          "index" => 1,
                          "errors" => %{
                            "definitionId" => field_definition_id
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

      assert is_binary(field_definition_id)
    end
  end

  describe "create entries" do
    # @tag :skip
    test "fails: unauthenticated" do
      variables = %{
        "input" => [
          %{
            client_id: 1,
            experience_id: 0,
            data_objects: [%{definition_id: "a", data: %{"integer" => 1}}]
          }
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
                 Query.create_entries(),
                 Schema,
                 variables: variables
               )
    end

    # @tag :skip
    test "happy path" do
      user = RegFactory.insert()
      experience1 = ExperienceFactory.insert(user_id: user.id)
      id1 = experience1.id

      experience2 = ExperienceFactory.insert(user_id: user.id)
      id2 = experience2.id

      {entries_params, _} =
        Factory.params_list(2, experience1)
        |> Enum.reduce({[], 1}, fn p, {acc, i} ->
          {[Map.put(p, :client_id, i) | acc], i + 1}
        end)

      entry_params = Factory.params(experience2, client_id: 1)

      variables = %{
        "input" =>
          Enum.map(
            [entry_params | entries_params],
            &Factory.stringify/1
          )
      }

      assert {:ok,
              %{
                data: %{
                  "createEntries" => [
                    %{
                      "experienceId" => ^id2,
                      "entries" => [
                        %{
                          "id" => _,
                          "experienceId" => ^id2,
                          "clientId" => "1",
                          "dataObjects" => _
                        }
                      ],
                      "errors" => nil
                    },
                    %{
                      "experienceId" => ^id1,
                      "entries" => [
                        %{
                          "id" => _,
                          "experienceId" => ^id1,
                          "clientId" => "2",
                          "dataObjects" => _
                        },
                        %{
                          "id" => _,
                          "experienceId" => ^id1,
                          "clientId" => "1",
                          "dataObjects" => _
                        }
                      ],
                      "errors" => nil
                    }
                  ]
                }
              }} =
               Absinthe.run(
                 Query.create_entries(),
                 Schema,
                 variables: variables,
                 context: context(user)
               )
    end

    # @tag :skip
    test "valids and invalids" do
      user = RegFactory.insert()

      experience1 =
        ExperienceFactory.insert(
          %{user_id: user.id},
          ["integer"]
        )

      id1 = experience1.id

      params1 = Factory.params(experience1, client_id: "a")

      # notice that we gave a decimal data to an integer field. it will fail
      params2 =
        update_in(
          Factory.params(experience1, client_id: "b").data_objects,
          fn [object] ->
            [%{object | data: %{"integer" => 0.1}}]
          end
        )

      experience2 =
        ExperienceFactory.insert(
          %{user_id: user.id},
          ["integer"]
        )

      id2 = experience2.id

      # notice that we gave a decimal data to an integer field. it will fail
      params3 =
        update_in(
          Factory.params(experience2, client_id: "c").data_objects,
          fn [object] ->
            [%{object | data: %{"integer" => 0.1}}]
          end
        )

      variables = %{
        "input" =>
          [
            params1,
            params2,
            params3
          ]
          |> Enum.map(&Factory.stringify/1)
      }

      assert {:ok,
              %{
                data: %{
                  "createEntries" => [
                    %{
                      "experienceId" => ^id1,
                      "entries" => [
                        %{
                          "id" => _,
                          "clientId" => "a",
                          "experienceId" => ^id1
                        }
                      ],
                      "errors" => [
                        %{
                          "clientId" => "b",
                          "experienceId" => ^id1,
                          "errors" => %{
                            "dataObjectsErrors" => [
                              %{
                                "index" => _,
                                "errors" => %{
                                  "data" => data_error_1
                                }
                              }
                            ]
                          }
                        }
                      ]
                    },
                    %{
                      "experienceId" => ^id2,
                      "errors" => [
                        %{
                          "clientId" => "c",
                          "experienceId" => ^id2,
                          "errors" => %{
                            "dataObjectsErrors" => [
                              %{
                                "index" => _,
                                "errors" => %{
                                  "data" => data_error_2
                                }
                              }
                            ]
                          }
                        }
                      ]
                    }
                  ]
                }
              }} =
               Absinthe.run(
                 Query.create_entries(),
                 Schema,
                 variables: variables,
                 context: context(user)
               )

      assert is_binary(data_error_1)
      assert is_binary(data_error_2)
    end

    # @tag :skip
    test "client IDs must be unique" do
      user = RegFactory.insert()

      experience1 =
        ExperienceFactory.insert(
          %{user_id: user.id},
          ["integer"]
        )

      id1 = experience1.id

      variables = %{
        "input" =>
          [
            Factory.params(experience1, client_id: "a"),
            Factory.params(experience1, client_id: "a")
          ]
          |> Enum.map(&Factory.stringify/1)
      }

      assert {:ok,
              %{
                data: %{
                  "createEntries" => [
                    %{
                      "experienceId" => ^id1,
                      "entries" => [
                        %{
                          "id" => _,
                          "clientId" => "a",
                          "experienceId" => ^id1
                        }
                      ],
                      "errors" => [
                        %{
                          "clientId" => "a",
                          "experienceId" => ^id1,
                          "errors" => %{
                            "clientId" => client_id_error
                          }
                        }
                      ]
                    }
                  ]
                }
              }} =
               Absinthe.run(
                 Query.create_entries(),
                 Schema,
                 variables: variables,
                 context: context(user)
               )

      assert is_binary(client_id_error)
    end
  end

  describe "delete entry" do
    test "fails: unauthorized" do
      variables = %{"id" => 0}

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

    test "fails: entry not found" do
      variables = %{"id" => @bogus_id}

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
                 context: context(%{id: 0})
               )
    end

    test "succeeds" do
      user = RegFactory.insert()
      experience = ExperienceFactory.insert(%{user_id: user.id})
      entry = Factory.insert(%{}, experience)
      id = entry.id

      variables = %{"id" => id}

      assert {:ok,
              %{
                data: %{
                  "deleteEntry" => %{
                    "id" => ^id,
                    "dataObjects" => _
                  }
                }
              }} =
               Absinthe.run(
                 Query.delete(),
                 Schema,
                 variables: variables,
                 context: context(user)
               )

      assert EbnisData.get_entry(entry.id) == nil
    end
  end

  describe "update data object" do
    test "fails: unauthorized" do
      variables = %{
        "input" => %{
          "id" => "a",
          "data" => ~s({"integer":1})
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
                 Query.update_data_object(),
                 Schema,
                 variables: variables
               )
    end

    test "fails: data object not found" do
      variables = %{
        "input" => %{
          "id" => @bogus_id,
          "data" => ~s({"integer":1})
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
                 Query.update_data_object(),
                 Schema,
                 variables: variables,
                 context: context(%{id: 0})
               )
    end

    test "recovers from exception" do
      variables = %{
        "input" => %{
          # this will cause exception because ID ought to be ULID
          "id" => "1",
          "data" => ~s({"integer":1})
        }
      }

      log_message =
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
                     Query.update_data_object(),
                     Schema,
                     variables: variables,
                     context: context(%{id: 0})
                   )
        end)

      assert log_message =~ "STACK"
    end

    test "fails: data type can not be cast" do
      user = RegFactory.insert()

      experience =
        ExperienceFactory.insert(
          %{user_id: user.id},
          ["integer"]
        )

      [data_object] = Factory.insert(%{}, experience).data_objects
      id = data_object.id

      variables = %{
        "input" => %{
          "id" => id,
          "data" => ~s({"integer":0.1})
        }
      }

      assert {:ok,
              %{
                data: %{
                  "updateDataObject" => %{
                    "dataObject" => nil,
                    "errors" => %{
                      "data" => data_error
                    }
                  }
                }
              }} =
               Absinthe.run(
                 Query.update_data_object(),
                 Schema,
                 variables: variables,
                 context: context(user)
               )

      assert is_binary(data_error)
    end

    test "succeeds" do
      user = RegFactory.insert()

      experience =
        ExperienceFactory.insert(
          %{user_id: user.id},
          ["integer"]
        )

      [data_object] = Factory.insert(%{}, experience).data_objects
      id = data_object.id

      refute data_object.data["integer"] == 1

      new_data = ~s({"integer":1})

      variables = %{
        "input" => %{
          "id" => id,
          "data" => new_data
        }
      }

      assert {:ok,
              %{
                data: %{
                  "updateDataObject" => %{
                    "dataObject" => %{
                      "id" => ^id,
                      "data" => ^new_data,
                      "definitionId" => _
                    },
                    "errors" => nil
                  }
                }
              }} =
               Absinthe.run(
                 Query.update_data_object(),
                 Schema,
                 variables: variables,
                 context: context(user)
               )
    end
  end

  describe "update data objects" do
    test "fails: unauthorized" do
      variables = %{
        "input" => [
          %{
            "id" => "a",
            "data" => ~s({"integer":1})
          }
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
                 Query.update_data_objects(),
                 Schema,
                 variables: variables
               )
    end

    # @tag :skip
    test "one data object succeeds, one not found" do
      user = RegFactory.insert()

      experience =
        ExperienceFactory.insert(
          %{
            user_id: user.id
          },
          ["integer"]
        )

      [data_object] = Factory.insert(%{}, experience).data_objects

      id0 = @bogus_id
      id1 = data_object.id

      data0 = ~s({"integer":1})
      data1 = ~s({"integer":2})

      variables = %{
        "input" => [
          %{
            "id" => id0,
            "data" => data0
          },
          %{
            "id" => id1,
            "data" => data1
          }
        ]
      }

      assert {:ok,
              %{
                data: %{
                  "updateDataObjects" => [
                    %{
                      "index" => 0,
                      "id" => ^id0,
                      "stringError" => string_error,
                      "dataObject" => nil,
                      "fieldErrors" => nil
                    },
                    %{
                      "index" => 1,
                      "id" => ^id1,
                      "stringError" => nil,
                      "fieldErrors" => nil,
                      "dataObject" => %{
                        "id" => ^id1,
                        "data" => ^data1
                      }
                    }
                  ]
                }
              }} =
               Absinthe.run(
                 Query.update_data_objects(),
                 Schema,
                 variables: variables,
                 context: context(user)
               )

      assert is_binary(string_error)
    end

    # @tag :skip
    test "one succeeds, can not cast data type of other" do
      user = RegFactory.insert()

      experience =
        ExperienceFactory.insert(
          %{
            user_id: user.id
          },
          ["integer", "integer"]
        )

      [object0, object1] = Factory.insert(%{}, experience).data_objects

      id0 = object0.id
      id1 = object1.id

      # here decimal data given to integer type: will fail
      data0 = ~s({"integer":0.1})

      # we can parse a string as integer, so this is okay
      data1 = ~s({"integer":"2"})

      variables = %{
        "input" => [
          %{
            "id" => id0,
            "data" => data0
          },
          %{
            "id" => id1,
            "data" => data1
          }
        ]
      }

      assert {:ok,
              %{
                data: %{
                  "updateDataObjects" => [
                    %{
                      "index" => 0,
                      "id" => ^id0,
                      "stringError" => nil,
                      "dataObject" => nil,
                      "fieldErrors" => %{
                        "data" => data_error
                      }
                    },
                    %{
                      "index" => 1,
                      "id" => ^id1,
                      "stringError" => nil,
                      "fieldErrors" => nil,
                      "dataObject" => %{
                        "id" => ^id1,
                        "data" => ~s({"integer":2})
                      }
                    }
                  ]
                }
              }} =
               Absinthe.run(
                 Query.update_data_objects(),
                 Schema,
                 variables: variables,
                 context: context(user)
               )

      assert is_binary(data_error)
    end
  end

  defp context(user), do: %{current_user: user}
end
