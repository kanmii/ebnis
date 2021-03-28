defmodule EbnisData.Schema.EntriesTest do
  use EbnisData.DataCase, async: true

  import ExUnit.CaptureLog

  alias EbnisData.Schema
  alias EbnisData.Factory.Registration, as: RegFactory
  alias EbnisData.Factory.Experience, as: Factory
  alias EbnisData.Query.Experience, as: Query
  alias EbnisData.Factory.Entry, as: EntryFactory

  @moduletag capture_log: true
  @bogus_id Ecto.ULID.generate()

  describe "create" do
    # @tag :skip
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

    # @tag :skip
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

    test "erstellen eintrag: scheitet (Daten ist falsch)" do
      user = RegFactory.insert()

      %{
        id: experience_id,
        data_definitions: [
          %{
            id: definition0_id
          }
        ]
      } =
        _experience =
        Factory.insert(
          %{user_id: user.id},
          [
            "integer"
          ]
        )

      create_entry_invalid_data = %{
        "experienceId" => experience_id,
        "addEntries" => [
          %{
            "dataObjects" => [
              %{
                "definitionId" => definition0_id,
                "data" => ~s({"integer":0.1})
              }
            ]
          }
        ]
      }

      variables = %{
        "input" => [
          create_entry_invalid_data
        ]
      }

      assert {
               :ok,
               %{
                 data: %{
                   "updateExperiences" => %{
                     "experiences" => [
                       %{
                         "entries" => %{
                           "newEntries" => [
                             %{
                               "errors" => %{
                                 "dataObjects" => [
                                   %{
                                     "data" => "is invalid",
                                     "meta" => %{
                                       "index" => 0
                                     }
                                   }
                                 ],
                                 "meta" => %{
                                   "index" => 0
                                 }
                               }
                             }
                           ]
                         },
                         "experience" => %{
                           "experienceId" => ^experience_id,
                           "updatedAt" => _
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
    end

    test "erstellen eintrag: eine erfolg, eine scheitet klient ID nicht einzigartig" do
      user = RegFactory.insert()

      %{
        id: experience_id,
        data_definitions: [
          %{
            id: definition0_id
          }
        ]
      } =
        _experience =
        Factory.insert(
          %{user_id: user.id},
          [
            "integer"
          ]
        )

      create_entry_client_id_not_unique = %{
        "experienceId" => experience_id,
        "addEntries" => [
          %{
            "clientId" => "a",
            "dataObjects" => [
              %{
                "definitionId" => definition0_id,
                "data" => ~s({"integer":1}),
                "clientId" => "x"
              }
            ]
          },
          %{
            # schon genohmmen
            "clientId" => "a",
            "dataObjects" => [
              %{
                "definitionId" => definition0_id,
                "data" => ~s({"integer":3})
              }
            ]
          }
        ]
      }

      variables = %{
        "input" => [
          create_entry_client_id_not_unique
        ]
      }

      assert {
               :ok,
               %{
                 data: %{
                   "updateExperiences" => %{
                     "experiences" => [
                       %{
                         "entries" => %{
                           "newEntries" => [
                             %{
                               "entry" => %{
                                 "id" => _,
                                 "experienceId" => ^experience_id,
                                 "clientId" => "a",
                                 "dataObjects" => [
                                   %{
                                     "definitionId" => ^definition0_id,
                                     "data" => ~s({"integer":1}),
                                     "clientId" => "x"
                                   }
                                 ]
                               }
                             },
                             %{
                               "errors" => %{
                                 "clientId" => client_id_not_unique_error,
                                 "meta" => %{
                                   "clientId" => "a",
                                   "index" => 1
                                 }
                               }
                             }
                           ]
                         },
                         "experience" => %{
                           "experienceId" => ^experience_id
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

      assert is_binary(client_id_not_unique_error)
    end

    test "success/create entry with comment" do
      user = RegFactory.insert()

      %{
        id: experience_id,
        data_definitions: [
          %{
            id: definition0_id
          }
        ]
      } =
        _experience =
        Factory.insert(
          %{user_id: user.id},
          [
            "integer"
          ]
        )

      create_entry_client_id_not_unique = %{
        "experienceId" => experience_id,
        "addEntries" => [
          %{
            "comment_text" => "text",
            "clientId" => "a",
            "dataObjects" => [
              %{
                "definitionId" => definition0_id,
                "data" => ~s({"integer":1}),
                "clientId" => "x"
              }
            ]
          }
        ]
      }

      variables = %{
        "input" => [
          create_entry_client_id_not_unique
        ]
      }

      assert {
               :ok,
               %{
                 data: %{
                   "updateExperiences" => %{
                     "experiences" => [
                       %{
                         "entries" => %{
                           "newEntries" => [
                             %{
                               "entry" => %{
                                 "id" => _,
                                 "experienceId" => ^experience_id,
                                 "clientId" => "a",
                                 "dataObjects" => [
                                   %{
                                     "definitionId" => ^definition0_id,
                                     "data" => ~s({"integer":1}),
                                     "clientId" => "x"
                                   }
                                 ],
                                 "comments" => [
                                   %{
                                     "id" => _,
                                     "text" => "text"
                                   }
                                 ]
                               }
                             }
                           ]
                         },
                         "experience" => %{
                           "experienceId" => ^experience_id
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
    end
  end

  describe "update" do
    test "scheitern: Eintrag nicht gefunden" do
      bogus_id = @bogus_id
      user = RegFactory.insert()

      %{
        id: experience_id
      } =
        Factory.insert(
          %{user_id: user.id},
          [
            "integer"
          ]
        )

      entry_not_found_variable = %{
        "experienceId" => experience_id,
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

      variables = %{
        "input" => [
          entry_not_found_variable
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
                           "experienceId" => _
                         },
                         "entries" => %{
                           "updatedEntries" => [
                             %{
                               "errors" => %{
                                 "entryId" => ^bogus_id,
                                 "error" => entry_not_found_error
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

      assert is_binary(entry_not_found_error)
    end

    test "scheitern: Eintrag bearbeiten - erhebt Ausnahme" do
      user = RegFactory.insert()
      raises_id = "1"

      %{
        id: experience_id
      } =
        Factory.insert(
          %{user_id: user.id},
          [
            "integer"
          ]
        )

      entry_raises_variable = %{
        "experienceId" => experience_id,
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

      variables = %{
        "input" => [
          entry_raises_variable
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
                             "entries" => %{
                               "updatedEntries" => [
                                 %{
                                   "errors" => %{
                                     "entryId" => ^raises_id,
                                     "error" => raises_error
                                   }
                                 }
                               ]
                             },
                             "experience" => %{
                               "experienceId" => _
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
        end)

      assert log =~ "STACK"
    end

    test "scheitern: Daten Gegenstand bearbeiten - erhebt Ausnahme" do
      raises_id = "1"
      user = RegFactory.insert()

      %{
        id: experience_id
      } =
        experience =
        Factory.insert(
          %{user_id: user.id},
          [
            "integer"
          ]
        )

      %{
        id: entry_id
      } = _entry = EntryFactory.insert(%{}, experience)

      raises_variable = %{
        "experienceId" => experience_id,
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

      variables = %{
        "input" => [
          raises_variable
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
                             "experience" => %{
                               "experienceId" => ^experience_id
                             },
                             "entries" => %{
                               "updatedEntries" => [
                                 %{
                                   "entry" => %{
                                     "entryId" => ^entry_id,
                                     "updatedAt" => _,
                                     "dataObjects" => [
                                       %{
                                         "errors" => %{
                                           "meta" => %{
                                             "id" => ^raises_id
                                           },
                                           "error" => raises_error
                                         }
                                       }
                                     ]
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

          assert is_binary(raises_error)
        end)

      assert log =~ "STACK"
    end

    test "scheitern: Daten Gegenstand bearbeiten - nicht gefunden" do
      bogus_id = @bogus_id
      user = RegFactory.insert()

      %{
        id: experience_id
      } =
        experience =
        Factory.insert(
          %{user_id: user.id},
          [
            "integer"
          ]
        )

      %{
        id: entry_id
      } = _entry = EntryFactory.insert(%{}, experience)

      entry_data_object_not_found_variable = %{
        "experienceId" => experience_id,
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

      variables = %{
        "input" => [
          entry_data_object_not_found_variable
        ]
      }

      assert {
               :ok,
               %{
                 data: %{
                   "updateExperiences" => %{
                     "experiences" => [
                       %{
                         "entries" => %{
                           "updatedEntries" => [
                             %{
                               "entry" => %{
                                 "entryId" => ^entry_id,
                                 "updatedAt" => _,
                                 "dataObjects" => [
                                   %{
                                     "errors" => %{
                                       "meta" => %{
                                         "id" => ^bogus_id
                                       },
                                       "error" => not_found_error
                                     }
                                   }
                                 ]
                               }
                             }
                           ]
                         },
                         "experience" => %{
                           "experienceId" => ^experience_id
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

      assert is_binary(not_found_error)
    end

    test "erfolg: Daten Gegenstand bearbeiten - aber mit Fehler" do
      user = RegFactory.insert()

      %{
        id: experience_id
      } =
        experience =
        Factory.insert(
          %{user_id: user.id},
          [
            "integer",
            "integer"
          ]
        )

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
        %{
          id: data1_id
        }
      ] = data_objects

      updated_at0 = "1980-01-21T05:27:17Z"
      refute data0_data["integer"] == 1
      refute updated_at0 == DateTime.to_iso8601(data0_updated_at)

      data_updated_success_variable = %{
        "experienceId" => experience_id,
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
                "id" => data1_id,
                "data" => ~s({"integer":0.1})
              }
            ]
          }
        ]
      }

      variables = %{
        "input" => [
          data_updated_success_variable
        ]
      }

      assert {
               :ok,
               %{
                 data: %{
                   "updateExperiences" => %{
                     "experiences" => [
                       %{
                         "entries" => %{
                           "updatedEntries" => [
                             %{
                               "entry" => %{
                                 "entryId" => ^entry_id,
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
                                       "meta" => %{
                                         "id" => ^data1_id
                                       },
                                       "data" => data_wrong_error
                                     }
                                   }
                                 ]
                               }
                             }
                           ]
                         },
                         "experience" => %{
                           "experienceId" => ^experience_id
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

      assert is_binary(data_wrong_error)
    end

    # @tag :skip
    test " erfolg: decimal to integer, but with data object already updated by client" do
      user = RegFactory.insert()

      definition_type_updated = "INTEGER"
      definition_type_updated_lower = String.downcase(definition_type_updated)
      new_data_value = 1

      %{
        id: experience_id,
        data_definitions: [
          %{
            id: definition0_id,
            type: definition0_type
          }
        ]
      } =
        experience =
        Factory.insert(
          %{user_id: user.id},
          [
            "decimal"
          ]
        )

      %{
        id: entry_id,
        data_objects: [
          %{
            id: data_object0_id
          }
        ]
      } = _entry = EntryFactory.insert(%{}, experience)

      refute definition0_type == definition_type_updated_lower

      new_data_for_update = ~s({"#{definition_type_updated_lower}":#{new_data_value}})

      definitions_variables = %{
        "experienceId" => experience_id,
        "updateDefinitions" => [
          %{
            "id" => definition0_id,
            "type" => definition_type_updated
          }
        ],
        "updateEntries" => [
          %{
            "entryId" => entry_id,
            "dataObjects" => [
              %{
                "id" => data_object0_id,
                "data" => new_data_for_update
              }
            ]
          }
        ]
      }

      variables = %{
        "input" => [
          definitions_variables
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
                           "experienceId" => ^experience_id,
                           "updatedDefinitions" => [
                             %{
                               "definition" => %{
                                 "id" => ^definition0_id,
                                 "type" => ^definition_type_updated
                               }
                             }
                           ]
                         },
                         "entries" => %{
                           "updatedEntries" => [
                             %{
                               "entry" => %{
                                 "entryId" => ^entry_id,
                                 "dataObjects" => [
                                   %{
                                     "dataObject" => %{
                                       "id" => ^data_object0_id,
                                       "data" => ^new_data_for_update
                                     }
                                   }
                                 ]
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

      new_data_from_db =
        Map.new([
          {definition_type_updated_lower, new_data_value}
        ])

      assert %{
               data: ^new_data_from_db
             } = EbnisData.get_data_object(data_object0_id)
    end
  end

  describe "get entries" do
    # @tag :skip
    test "scheitet: unauthenticated" do
      assert {:ok,
              %{
                errors: [
                  %{
                    message: _
                  }
                ]
              }} =
               Absinthe.run(
                 Query.sammeln_einträge(),
                 Schema,
                 variables: %{
                   "experienceId" => "0",
                   "pagination" => %{
                     "first" => 2
                   }
                 }
               )
    end

    # @tag :skip
    test "erhebt Ausnahme" do
      raises_id = "1"

      user = %{
        id: @bogus_id
      }

      log_message =
        capture_log(fn ->
          assert {:ok,
                  %{
                    data: %{
                      "getEntries" => %{
                        "errors" => %{
                          "experienceId" => ^raises_id,
                          "error" => raises_error
                        }
                      }
                    }
                  }} =
                   Absinthe.run(
                     Query.sammeln_einträge(),
                     Schema,
                     variables: %{
                       "experienceId" => raises_id,
                       "pagination" => %{
                         "first" => 2
                       }
                     },
                     context: context(user)
                   )

          assert is_binary(raises_error)
        end)

      assert log_message =~ "STACK"
    end

    # @tag :skip
    test "kein eintrag" do
      user = RegFactory.insert()

      %{id: experience_id} =
        Factory.insert(
          %{user_id: user.id},
          [
            "integer"
          ]
        )

      assert {:ok,
              %{
                data: %{
                  "getEntries" => %{
                    "entries" => %{
                      "edges" => [],
                      "pageInfo" => %{}
                    }
                  }
                }
              }} =
               Absinthe.run(
                 Query.sammeln_einträge(),
                 Schema,
                 variables: %{
                   "experienceId" => experience_id,
                   "pagination" => %{
                     "first" => 1
                   }
                 },
                 context: context(user)
               )
    end

    # @tag :skip
    test "seitennummeriergung" do
      user = RegFactory.insert()

      %{id: experience_id} =
        experience =
        Factory.insert(
          %{user_id: user.id},
          [
            "integer"
          ]
        )

      [
        %{
          id: entry1_id,
          data_objects: [
            %{
              id: data_object1_id
            }
          ]
        },
        %{
          id: entry2_id
        },
        %{
          id: entry3_id
        }
      ] =
        1..3
        |> Enum.map(fn _ ->
          EntryFactory.insert(%{}, experience)
        end)

      assert {:ok,
              %{
                data: %{
                  "getEntries" => %{
                    "entries" => %{
                      "edges" => edges,
                      "pageInfo" => %{
                        "hasPreviousPage" => false,
                        "hasNextPage" => true,
                        "endCursor" => end_cursor
                      }
                    }
                  }
                }
              }} =
               Absinthe.run(
                 Query.sammeln_einträge(),
                 Schema,
                 variables: %{
                   "experienceId" => experience_id,
                   "pagination" => %{
                     "first" => 2
                   }
                 },
                 context: context(user)
               )

      assert Enum.map(
               edges,
               fn edge ->
                 edge["node"]["id"]
               end
             ) == [
               entry3_id,
               entry2_id
             ]

      assert {:ok,
              %{
                data: %{
                  "getEntries" => %{
                    "entries" => %{
                      "edges" => [
                        %{
                          "node" => %{
                            "id" => ^entry1_id,
                            "dataObjects" => [
                              %{
                                "id" => ^data_object1_id
                              }
                            ]
                          }
                        }
                      ],
                      "pageInfo" => %{
                        "hasPreviousPage" => true,
                        "hasNextPage" => false,
                        "startCursor" => start_cursor
                      }
                    }
                  }
                }
              }} =
               Absinthe.run(
                 Query.sammeln_einträge(),
                 Schema,
                 variables: %{
                   "experienceId" => experience_id,
                   "pagination" => %{
                     "first" => 2,
                     "after" => end_cursor
                   }
                 },
                 context: context(user)
               )

      assert {:ok,
              %{
                data: %{
                  "getEntries" => %{
                    "entries" => %{
                      "edges" => edges,
                      "pageInfo" => %{
                        "hasPreviousPage" => false,
                        "hasNextPage" => true
                      }
                    }
                  }
                }
              }} =
               Absinthe.run(
                 Query.sammeln_einträge(),
                 Schema,
                 variables: %{
                   "experienceId" => experience_id,
                   "pagination" => %{
                     "last" => 2,
                     "before" => start_cursor
                   }
                 },
                 context: context(user)
               )

      assert Enum.map(
               edges,
               fn edge ->
                 edge["node"]["id"]
               end
             ) == [
               entry3_id,
               entry2_id
             ]
    end
  end

  describe "delete" do
    test "löschen eintrag: eine erfolg, eine eintrag nicht gefunden" do
      bogus_id = @bogus_id
      user = RegFactory.insert()

      %{
        id: experience_id
      } =
        experience =
        Factory.insert(
          %{user_id: user.id},
          [
            "integer"
          ]
        )

      %{
        id: entry_id
      } = _entry = EntryFactory.insert(%{}, experience)

      delete_entries_variables = %{
        "experienceId" => experience_id,
        "deleteEntries" => [
          bogus_id,
          entry_id
        ]
      }

      variables = %{
        "input" => [
          delete_entries_variables
        ]
      }

      assert {
               :ok,
               %{
                 data: %{
                   "updateExperiences" => %{
                     "experiences" => [
                       %{
                         "entries" => %{
                           "deletedEntries" => [
                             %{
                               "errors" => %{
                                 "id" => ^bogus_id,
                                 "error" => deleted_entry_not_found_error
                               }
                             },
                             %{
                               "entry" => %{
                                 "id" => ^entry_id
                               }
                             }
                           ]
                         },
                         "experience" => %{
                           "experienceId" => ^experience_id
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

      assert is_binary(deleted_entry_not_found_error)
    end
  end

  defp context(user), do: %{current_user: user}
end
