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

      delete_entries_variables = %{
        "experienceId" => update_own_fields_success_experience_id,
        "deleteEntries" => [
          bogus_id,
          entry_id
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
          create_entry_client_id_not_unique,
          delete_entries_variables
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
                                           "meta" => %{
                                             "id" => ^raises_id
                                           },
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
                                           "meta" => %{
                                             "id" => ^bogus_id
                                           },
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
                                           "meta" => %{
                                             "id" => ^data0_id
                                           },
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
                           },
                           %{
                             "experience" => %{
                               "experienceId" => ^update_own_fields_success_experience_id,
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
          assert is_binary(deleted_entry_not_found_error)
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

    test "success: no entry/ fail: client id taken" do
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
                        "clientId" => ^client_id_taken,
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

      # assert is_binary(client_id_taken_error)
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

    test "definition name taken/" do
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

    test "success: entry_experience_id not client id" do
      user = RegFactory.insert()

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

      variables = %{
        "input" => [
          entry_experience_id_not_experience_client_id_input
        ]
      }

      assert {:ok,
              %{
                data: %{
                  "createExperiences" => [
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
                          "experienceId" => entry_experience_id_not_experience_client_id_error,
                          "clientId" => nil
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

      assert is_binary(entry_experience_id_not_experience_client_id_error)
    end

    test "fail: definition_id != definition_client_id" do
      user = RegFactory.insert()

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

      variables = %{
        "input" => [
          definition_id_not_definition_client_id_input
        ]
      }

      assert {:ok,
              %{
                data: %{
                  "createExperiences" => [
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
                              "definitionId" => definition_id_not_definition_client_id_error0,
                              "meta" => %{"index" => 0}
                            },
                            %{
                              "definitionId" => definition_id_not_definition_client_id_error2,
                              "meta" => %{"index" => 2}
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

      assert is_binary(definition_id_not_definition_client_id_error0)
      assert is_binary(definition_id_not_definition_client_id_error2)
    end

    # @tag :skip
    test "online: success+data object data error/offline sucess" do
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

      offline_experience_with_entry_input = %{
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
          success_and_errors_has_entry_input,
          offline_experience_with_entry_input
        ]
      }

      assert {:ok,
              %{
                data: %{
                  "createExperiences" => [
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
                    },
                    %{
                      "experience" => %{
                        "id" => offline_experience_with_entry_input_id,
                        "title" => "a7",
                        "clientId" => "a7",
                        "dataDefinitions" => [
                          %{
                            "name" => "a1",
                            "id" => offline_experience_with_entry_input_definition_id
                          }
                        ],
                        "entries" => %{
                          "edges" => [
                            %{
                              "node" => %{
                                "experienceId" => offline_experience_with_entry_input_id,
                                "dataObjects" => [
                                  %{
                                    "definitionId" =>
                                      offline_experience_with_entry_input_definition_id
                                  }
                                ]
                              }
                            }
                          ]
                        }
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

      # assert is_binary(definition_id_not_definition_client_id_error0)
      # assert is_binary(definition_id_not_definition_client_id_error2)
      assert is_binary(success_and_errors_has_entry_input_error0)
      assert is_binary(success_and_errors_has_entry_input_error2)
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
  end

  describe "delete experiences" do
    # @tag :skip
    test "unauthorized" do
      assert {
               :ok,
               %{
                 data: %{
                   "deleteExperiences" => %{
                     "error" => error
                   }
                 }
               }
             } =
               Absinthe.run(
                 Query.delete_experiences(),
                 Schema,
                 variables: %{
                   "input" => ["1"]
                 }
               )

      assert is_binary(error)
    end

    test "successes and failures" do
      bogus_id = @bogus_id
      raises_id = "1"
      user = RegFactory.insert()

      %{id: experience_id} =
        Factory.insert(
          %{user_id: user.id},
          [
            "integer"
          ]
        )

      variables = %{
        "input" => [
          raises_id,
          bogus_id,
          experience_id
        ]
      }

      log =
        capture_log(fn ->
          assert {
                   :ok,
                   %{
                     data: %{
                       "deleteExperiences" => %{
                         "experiences" => [
                           %{
                             "errors" => %{
                               "id" => ^raises_id,
                               "error" => raises_error
                             }
                           },
                           %{
                             "errors" => %{
                               "id" => ^bogus_id,
                               "error" => not_found_error
                             }
                           },
                           %{
                             "experience" => %{
                               "id" => ^experience_id
                             }
                           }
                         ]
                       }
                     }
                   }
                 } =
                   Absinthe.run(
                     Query.delete_experiences(),
                     Schema,
                     variables: variables,
                     context:
                       user
                       |> context()
                       |> client_session_context()
                       |> client_token_context()
                   )

          assert is_binary(raises_error)
          assert is_binary(not_found_error)
        end)

      assert log =~ "STACK"
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
