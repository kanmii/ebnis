defmodule EbnisData.Schema.Entry1Test do
  use EbnisData.DataCase, async: true

  import ExUnit.CaptureLog

  alias EbnisData.Schema
  alias EbnisData.Factory.Registration, as: RegFactory
  alias EbnisData.Factory.Entry1, as: Factory
  alias EbnisData.Factory.Experience1, as: ExperienceFactory
  alias EbnisData.Query.Entry1, as: Query
  alias EbnisData.Resolver
  alias EbnisData.Resolver.Entry1, as: Entry1Resolver
  alias EbnisData.Factory.DataDefinition, as: DataDefinitionFactory

  @iso_extended_format "{ISO:Extended:Z}"

  describe "create entry" do
    # @tag :skip
    test "fails: no user context" do
      params = %{
        experience_id: "0",
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
      experience = ExperienceFactory.insert(user_id: user.id)

      global_experience_id =
        experience.id
        |> Resolver.convert_to_global_id(:experience1)

      params =
        experience
        |> Factory.params()
        |> Map.delete(:exp_id)

      variables = %{
        "input" => Factory.stringify(params)
      }

      assert {:ok,
              %{
                data: %{
                  "createEntry1" => %{
                    "entry" => %{
                      "id" => _,
                      "experienceId" => ^global_experience_id,
                      "dataObjects" => data_objects,
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

      data_objects_ids =
        data_objects
        |> Enum.map(& &1["definitionId"])
        |> Enum.sort()

      assert experience.data_definitions
             |> Enum.map(& &1.id)
             |> Enum.sort() == data_objects_ids
    end

    # @tag :skip
    test "fails: experience id does not exist" do
      user = RegFactory.insert()

      params = %{
        experience_id: "0",
        data_objects: [
          %{
            definition_id: Ecto.UUID.generate(),
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
                  "createEntry1" => %{
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

      bogus_user = %{id: 0}

      assert {:ok,
              %{
                data: %{
                  "createEntry1" => %{
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
        definition_id: Ecto.UUID.generate()
      }

      params = update_in(params.data_objects, &[bogus_field | &1])

      variables = %{
        "input" => Factory.stringify(params)
      }

      assert {:ok,
              %{
                data: %{
                  "createEntry1" => %{
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
                  "createEntry1" => %{
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
                  "createEntry1" => %{
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

      variables = %{
        "input" =>
          experience
          |> Factory.params(client_id: client_id)
          |> Factory.stringify()
      }

      assert {:ok,
              %{
                data: %{
                  "createEntry1" => %{
                    "entry" => %{
                      "id" => _,
                      "clientId" => ^client_id
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
                  "createEntry1" => %{
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
      inserted_at =
        DateTime.utc_now()
        |> Timex.shift(hours: -15)
        |> Timex.to_datetime()
        |> DateTime.truncate(:second)

      inserted_at_string =
        inserted_at
        |> Timex.format!(@iso_extended_format)

      user = RegFactory.insert()
      experience = ExperienceFactory.insert(user_id: user.id)

      params =
        Factory.params(
          experience,
          inserted_at: inserted_at,
          updated_at: inserted_at
        )

      variables = %{
        "input" => Factory.stringify(params)
      }

      assert {:ok,
              %{
                data: %{
                  "createEntry1" => %{
                    "entry" => %{
                      "id" => _,
                      "insertedAt" => ^inserted_at_string,
                      "updatedAt" => ^inserted_at_string
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

      params = %{
        experience_id: experience.id,
        data_objects: [
          %{
            definition_id: definition.id,
            # notice how we specified a decimal value for an integer data
            data: %{integer: 0.1}
          }
        ]
      }

      variables = %{
        "input" => Factory.stringify(params)
      }

      assert {:ok,
              %{
                data: %{
                  "createEntry1" => %{
                    "errors" => %{
                      "dataObjectsErrors" => [
                        %{
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
    test "catches exception and logs stacktrace" do
      log =
        capture_log(fn ->
          assert {
                   :ok,
                   %{
                     errors: %{
                       experience: experience
                     }
                   }
                 } =
                   %{
                     input: %{
                       data_objects: [
                         %{
                           definition_id: "a",
                           data: %{"integer" => 1}
                         }
                       ],
                       # This will cause an exception. DB ID can not be nil
                       experience_id: nil
                     }
                   }
                   |> Entry1Resolver.create(%{context: context(%{id: 1})})

          assert is_binary(experience)
        end)

      assert log =~ "STACK"
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
                  "createEntry1" => %{
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
      id1 = Resolver.convert_to_global_id(experience1.id, :experience1)

      experience2 = ExperienceFactory.insert(user_id: user.id)
      id2 = Resolver.convert_to_global_id(experience2.id, :experience1)

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
                  "createEntries1" => [
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
                      "errors" => []
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
                      "errors" => []
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

      id1 = Resolver.convert_to_global_id(experience1.id, :experience1)

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

      id2 = Resolver.convert_to_global_id(experience2.id, :experience1)

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
                  "createEntries1" => [
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

      id1 = Resolver.convert_to_global_id(experience1.id, :experience1)

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
                  "createEntries1" => [
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

  defp context(user), do: %{current_user: user}
end
