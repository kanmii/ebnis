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
  @inserted_at_string "2016-05-05T09:41:22Z"

  describe "erstellen erfahrungen" do
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

    test "fails: insensitive title not unique" do
      user = RegFactory.insert()
      # title lower
      Factory.insert(title: "a1", user_id: user.id)

      title_case_insensitive_not_unique_input = %{
        # title upper
        "title" => "A1",
        "dataDefinitions" => [
          %{
            "name" => "a1",
            "type" => "DATE"
          }
        ]
      }

      variables = %{
        "input" => [
          title_case_insensitive_not_unique_input
        ]
      }

      assert {:ok,
              %{
                data: %{
                  "createExperiences" => [
                    %{
                      "errors" => %{
                        "meta" => %{
                          "index" => 0,
                          "clientId" => nil
                        },
                        "title" => title_case_insensitive_not_unique_error
                      }
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
    end

    test "fails: definition name taken - case insensitive" do
      user = RegFactory.insert()

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

      variables = %{
        "input" => [
          definition_name_taken_input
        ]
      }

      assert {:ok,
              %{
                data: %{
                  "createExperiences" => [
                    %{
                      "errors" => %{
                        "meta" => %{
                          "index" => 0,
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

      assert is_binary(definition_name_taken_error)
    end

    test "fail: definition_id != definition_client_id" do
      user = RegFactory.insert()

      input = %{
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
              }
            ]
          }
        ]
      }

      variables = %{
        "input" => [
          input
        ]
      }

      assert {:ok,
              %{
                data: %{
                  "createExperiences" => [
                    %{
                      "entries" => [
                        %{
                          "errors" => %{
                            "clientId" => nil,
                            "dataObjects" => [
                              %{
                                "definitionId" => definition_id_not_definition_client_id_error0,
                                "meta" => %{"index" => 0}
                              }
                            ],
                            "experienceId" => nil,
                            "meta" => %{
                              "clientId" => "a51",
                              "experienceId" => definition_id_not_definition_client_id_input_id,
                              "index" => 0
                            }
                          }
                        }
                      ],
                      "experience" => %{
                        "clientId" => "a5",
                        "dataDefinitions" => [
                          %{
                            "name" => "a1"
                          },
                          %{
                            "name" => "a2"
                          }
                        ],
                        "id" => definition_id_not_definition_client_id_input_id,
                        "title" => "a5"
                      }
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

      assert is_binary(definition_id_not_definition_client_id_error0)
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

    test "online/fails: data object error" do
      user = RegFactory.insert()

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
                "data" => ~s({"integer":1}),
                "definitionId" => "0"
              }
            ]
          },
          %{
            "experienceId" => "a5",
            "dataObjects" => [
              %{
                # data object wrong
                "data" => ~s({"integer":0.2}),
                "definitionId" => "0"
              }
            ]
          }
        ]
      }

      variables = %{
        "input" => [
          success_and_errors_has_entry_input
        ]
      }

      assert {:ok,
              %{
                data: %{
                  "createExperiences" => [
                    %{
                      "entries" => [
                        %{
                          "entry" => %{
                            "id" => _,
                            "experienceId" => experience_id,
                            "dataObjects" => [
                              %{
                                "id" => _,
                                "definitionId" => definitionId
                              }
                            ]
                          }
                        },
                        %{
                          "errors" => %{
                            "dataObjects" => [
                              %{
                                "data" => data_error,
                                "meta" => %{
                                  "index" => 0
                                }
                              }
                            ],
                            "meta" => %{
                              "index" => 1,
                              "experienceId" => experience_id
                            }
                          }
                        }
                      ],
                      "experience" => %{
                        "id" => experience_id,
                        "title" => "a6",
                        "dataDefinitions" => [
                          %{
                            "name" => "a1",
                            "id" => definitionId
                          }
                        ]
                      }
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

      assert is_binary(data_error)
    end

    test "fails: client_id taken" do
      user = RegFactory.insert()
      inserted_at_string = @inserted_at_string
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

      variables = %{
        "input" => [
          success_no_entry_input,
          client_id_taken_input
        ]
      }

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
                        "clientId" => ^client_id_taken
                      }
                    },
                    %{
                      "errors" => %{
                        "meta" => %{
                          "index" => 1,
                          "clientId" => ^client_id_taken
                        },
                        "clientId" => client_id_taken_error,
                        "title" => nil
                      }
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

      assert is_binary(client_id_taken_error)
    end

    test "success: entry_experience_id not client id" do
      user = RegFactory.insert()

      input = %{
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

      variables = %{
        "input" => [
          input
        ]
      }

      assert {:ok,
              %{
                data: %{
                  "createExperiences" => [
                    %{
                      "entries" => [
                        %{
                          "errors" => %{
                            "meta" => %{
                              "index" => 0,
                              "experienceId" => entry_experience_id_not_experience_client_id,
                              "clientId" => "a41"
                            },
                            "experienceId" => entry_experience_id_not_experience_client_id_error,
                            "clientId" => nil
                          }
                        }
                      ],
                      "experience" => %{
                        "id" => entry_experience_id_not_experience_client_id,
                        "title" => "a4",
                        "dataDefinitions" => [
                          %{
                            "name" => "a1"
                          }
                        ],
                        "clientId" => "a4"
                      }
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

      assert is_binary(entry_experience_id_not_experience_client_id_error)
    end

    # @tag :skip
    test "offline success" do
      user = RegFactory.insert()

      input = %{
        "title" => "a7",
        "clientId" => "a7",
        "dataDefinitions" => [
          %{
            "name" => "a1",
            "clientId" => "a1",
            "type" => "INTEGER"
          }
        ],
        "entries" => [
          %{
            "experienceId" => "a7",
            "dataObjects" => [
              %{
                "definitionId" => "a1",
                "data" => ~s({"integer":1})
              }
            ]
          }
        ]
      }

      variables = %{
        "input" => [
          input
        ]
      }

      assert {:ok,
              %{
                data: %{
                  "createExperiences" => [
                    %{
                      "entries" => [
                        %{
                          "entry" => %{
                            "experienceId" => experience_id,
                            "dataObjects" => [
                              %{
                                "definitionId" => definition_id
                              }
                            ]
                          }
                        }
                      ],
                      "experience" => %{
                        "id" => experience_id,
                        "title" => "a7",
                        "clientId" => "a7",
                        "dataDefinitions" => [
                          %{
                            "name" => "a1",
                            "id" => definition_id
                          }
                        ]
                      }
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

    test "scheitern: erfahrung nicht gefunden" do
      bogus_id = @bogus_id
      user = RegFactory.insert()

      experience_not_found_variable = %{
        "experienceId" => bogus_id
      }

      variables = %{
        "input" => [
          experience_not_found_variable
        ]
      }

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
    end

    test "erhebt Ausnahme" do
      user = RegFactory.insert()
      raises_id = "1"

      raises_variable = %{
        "experienceId" => raises_id
      }

      variables = %{
        "input" => [
          raises_variable
        ]
      }

      assert {
               :ok,
               %{
                 data: %{
                   "updateExperiences" => %{
                     "experiences" => [
                       %{
                         "errors" => %{
                           "experienceId" => ^raises_id,
                           "error" => raises_error
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

      assert is_binary(raises_error)
    end

    test "scheitern: einege Felder fehler" do
      user = RegFactory.insert()

      %{
        id: update_own_fields_success_experience_id
        # description: update_own_fields_success_description,
        # title: own_fields_success_title,
        # data_definitions: definitions
      } =
        experience =
        Factory.insert(
          %{user_id: user.id},
          [
            "integer",
            "integer"
          ]
        )

      own_fields_error_variable = %{
        "experienceId" => update_own_fields_success_experience_id,
        "ownFields" => %{
          # title must be at least 2 chars long
          "title" => "a"
        }
      }

      variables = %{
        "input" => [
          own_fields_error_variable
        ]
      }

      assert {
               :ok,
               %{
                 data: %{
                   "updateExperiences" => %{
                     "experiences" => [
                       %{
                         "experience" => %{
                           "experienceId" => ^update_own_fields_success_experience_id,
                           "ownFields" => %{
                             "errors" => %{
                               "title" => own_fields_error_title
                             }
                           }
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

      assert is_binary(own_fields_error_title)
    end
  end

  defp context(user), do: %{current_user: user}

  defp client_session_context(context_val, val \\ "s") do
    Map.put(context_val, :client_session, val)
  end

  defp client_token_context(context_val, val \\ "t") do
    Map.put(context_val, :client_token, val)
  end
end
