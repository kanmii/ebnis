defmodule EbnisWeb.Schema.ExperienceTest do
  use EbnisWeb.DataCase, async: true

  alias EbnisWeb.Schema
  alias EbData.Factory.Experience, as: Factory
  alias EbData.Factory.Registration, as: RegFactory
  alias EbData.Factory.FieldDef, as: FieldDefFactory
  alias EbnisWeb.Query.Experience, as: Query
  alias EbnisWeb.Resolver
  alias EbData.Factory.Entry, as: EntryFactory

  @moduletag :db
  @iso_extended_format "{ISO:Extended:Z}"

  @invalid_field_types Enum.map(
                         ["integer1", "date2", "datetime2", "decimal4"],
                         &%{type: &1}
                       )

  describe "create an experience" do
    # @tag :skip
    test "with field values succeeds" do
      %{title: title} = params = Factory.params()
      user = RegFactory.insert()

      variables = %{
        "input" => Factory.stringify(params)
      }

      query = Query.create()

      assert {:ok,
              %{
                data: %{
                  "createExperience" => %{
                    "id" => _,
                    "title" => ^title,
                    "fieldDefs" => _,
                    "clientId" => nil
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

      error = Jason.encode!(%{title: "has already been taken"})

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
    test "fails if field name (case insensitive) not unique for experience" do
      user = RegFactory.insert()

      attrs = %{
        field_defs: [
          FieldDefFactory.params(name: "Field 0"),
          FieldDefFactory.params(name: "field 0")
        ]
      }

      variables = %{
        "input" =>
          attrs
          |> Factory.params()
          |> Factory.stringify()
      }

      query = Query.create()

      error =
        %{
          field_defs: [
            %{name: "field 0---1 has already been taken"}
          ]
        }
        |> Jason.encode!()

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
    test "fails if field has wrong data type" do
      user = RegFactory.insert()

      attrs = %{
        field_defs: [
          Enum.random(@invalid_field_types) |> Map.put(:name, "invalid field")
        ]
      }

      variables = %{
        "input" => Factory.params(attrs) |> Factory.stringify()
      }

      query = Query.create()

      assert {:ok,
              %{
                errors: [
                  %{
                    message: _
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
    test "fails if user context not supplied" do
      variables = %{
        "input" =>
          Factory.params()
          |> Factory.stringify()
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

    # @tag :skip
    test "with timestamps succeeds" do
      inserted_at =
        DateTime.utc_now()
        |> Timex.shift(hours: -5)
        |> Timex.to_datetime()
        |> DateTime.truncate(:second)

      inserted_at_string =
        inserted_at
        |> Timex.format!(@iso_extended_format)

      params =
        Factory.params(
          inserted_at: inserted_at,
          updated_at: inserted_at
        )

      user = RegFactory.insert()

      variables = %{
        "input" => Factory.stringify(params)
      }

      query = Query.create()

      assert {:ok,
              %{
                data: %{
                  "createExperience" => %{
                    "id" => _,
                    "fieldDefs" => _,
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

  describe "get one experience" do
    # @tag :skip
    test "succeeds for existing experience" do
      user = RegFactory.insert()
      %{id: id} = Factory.insert(user_id: user.id)
      id = Integer.to_string(id)

      variables = %{
        "id" => Resolver.convert_to_global_id(id, :experience)
      }

      assert {:ok,
              %{
                data: %{
                  "getExperience" => %{
                    "_id" => ^id,
                    "id" => _
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
        "id" => Resolver.convert_to_global_id("0", :experience)
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
    test "fails for wrong user" do
      user = RegFactory.insert()
      %{id: id} = Factory.insert(user_id: user.id)
      id = Integer.to_string(id)

      variables = %{
        "id" => Resolver.convert_to_global_id(id, :experience)
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
    # @tag :skip
    test "succeeds" do
      user = RegFactory.insert()
      %{id: id1} = Factory.insert(user_id: user.id)
      %{id: id2} = Factory.insert(user_id: user.id)

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
                  "exps" => %{
                    "edges" => [
                      %{
                        "node" => %{
                          "_id" => ida,
                          "entries" => %{}
                        }
                      },
                      %{
                        "node" => %{
                          "_id" => idb,
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

      assert [
               Integer.to_string(id1),
               Integer.to_string(id2)
             ] == Enum.sort([ida, idb])
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
                  "exps" => %{
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
      %{id: id1} = Factory.insert(user_id: user.id)
      Factory.insert(user_id: user.id)

      id1_string = Integer.to_string(id1)

      variables = %{
        "input" => %{
          "ids" => [Resolver.convert_to_global_id(id1, :experience)]
        }
      }

      assert {:ok,
              %{
                data: %{
                  "exps" => %{
                    "edges" => [
                      %{
                        "node" => %{
                          "_id" => ^id1_string,
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

  describe "sync offline experience" do
    # @tag :skip
    test "fails if client id not unique for user" do
      user = RegFactory.insert()
      Factory.insert(client_id: "abcd", user_id: user.id)
      field_def = FieldDefFactory.params()

      params =
        Factory.params(
          client_id: "abcd",
          field_defs: [
            Map.put(field_def, :client_id, 1)
          ]
        )

      variables = %{
        "input" => [Factory.stringify(params)]
      }

      query = Query.sync_offline_experiences()

      assert {:ok,
              %{
                data: %{
                  "syncOfflineExperiences" => [
                    %{
                      "entriesErrors" => nil,
                      "experience" => nil,
                      "experienceError" => %{
                        "error" => error,
                        "index" => 0,
                        "clientId" => "abcd"
                      }
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

      assert error =~ ~S("client_id":)
    end

    # @tag :skip
    test "one succeeds and one fails when client id not provided" do
      user = RegFactory.insert()

      field_defs1 =
        FieldDefFactory.params_list(2)
        |> Enum.with_index(1)
        |> Enum.map(fn {map, index} -> Map.put(map, :client_id, index) end)

      params1 = Factory.params(client_id: "a", field_defs: field_defs1)

      entries_params =
        EntryFactory.params_list(2, params1)
        |> Enum.with_index(1)
        |> Enum.map(fn {map, index} -> Map.put(map, :client_id, index) end)

      params2 = Factory.params()

      variables = %{
        "input" => [
          params1
          |> Map.put(:entries, entries_params)
          |> Factory.stringify(),
          Factory.stringify(params2)
        ]
      }

      query = Query.sync_offline_experiences()

      assert {:ok,
              %{
                data: %{
                  "syncOfflineExperiences" => [
                    %{
                      "entriesErrors" => nil,
                      "experience" => %{
                        "id" => _,
                        "clientId" => "a",
                        "fieldDefs" => _,
                        "entries" => %{
                          "edges" => edges
                        }
                      },
                      "experienceError" => nil
                    },
                    %{
                      "entriesErrors" => nil,
                      "experience" => nil,
                      "experienceError" => %{
                        "error" => error,
                        "index" => 1,
                        "clientId" => nil
                      }
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

      assert entries_params
             |> Enum.map(&"#{&1.client_id}")
             |> Enum.sort() ==
               edges
               |> Enum.map(&~s(#{&1["node"]["clientId"]}))
               |> Enum.sort()

      assert error =~ ~S("client_id":)
    end

    # @tag :skip
    test "fails if entry.exp_id != experience.client_id" do
      field_defs =
        FieldDefFactory.params_list(2)
        |> Enum.with_index(1)
        |> Enum.map(fn {map, index} -> Map.put(map, :client_id, index) end)

      params = Factory.params(client_id: "a", field_defs: field_defs)

      [entry_1, entry_2] =
        EntryFactory.params_list(2, params)
        |> Enum.with_index(1)
        |> Enum.map(fn {map, index} -> Map.put(map, :client_id, index) end)

      user = RegFactory.insert()
      entry_1 = Map.put(entry_1, :exp_id, "pat")

      variables = %{
        "input" => [
          params
          |> Map.put(:entries, [entry_1, entry_2])
          |> Factory.stringify()
        ]
      }

      query = Query.sync_offline_experiences()

      assert {:ok,
              %{
                data: %{
                  "syncOfflineExperiences" => [
                    %{
                      "experience" => %{
                        "_id" => experience_id,
                        "clientId" => "a",
                        "fieldDefs" => _,
                        "entries" => %{
                          "edges" => edges
                        }
                      },
                      "entriesErrors" => [
                        %{
                          "clientId" => "1",
                          "error" => error,
                          "experienceId" => entry_error_experience_id
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

      assert experience_id == entry_error_experience_id
      assert length(edges) == 1
      assert error =~ ~s("exp_id":)
    end

    test "fails if entry.fields.def_id != experience.field_defs.client_id" do
      field_def = FieldDefFactory.params(client_id: "b")

      params = Factory.params(client_id: "a", field_defs: [field_def])
      entry = EntryFactory.params(params, %{client_id: "c"})
      [entry_field] = entry.fields
      entry = Map.put(entry, :fields, [Map.put(entry_field, :def_id, "d")])

      user = RegFactory.insert()

      variables = %{
        "input" => [
          params
          |> Map.put(:entries, [entry])
          |> Factory.stringify()
        ]
      }

      query = Query.sync_offline_experiences()

      assert {:ok,
              %{
                data: %{
                  "syncOfflineExperiences" => [
                    %{
                      "experience" => %{
                        "_id" => _,
                        "clientId" => "a",
                        "fieldDefs" => _,
                        "entries" => %{
                          "edges" => []
                        }
                      },
                      "entriesErrors" => [
                        %{
                          "clientId" => "c",
                          "error" => error,
                          "experienceId" => _
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

      assert error =~ ~s("fields":[{"errors":{"def_id":)
      assert error =~ ~s("meta":{"def_id":"d")
    end

    test "fails if entry.fields.def_id not unique" do
      field_def = FieldDefFactory.params()

      params =
        Factory.params(
          client_id: "a",
          field_defs: [
            Map.put(field_def, :client_id, "b")
          ]
        )

      entry = EntryFactory.params(params, %{client_id: "c"})
      [entry_field] = entry.fields
      entry = Map.put(entry, :fields, [entry_field, entry_field])

      user = RegFactory.insert()

      variables = %{
        "input" => [
          params
          |> Map.put(:entries, [entry])
          |> Factory.stringify()
        ]
      }

      query = Query.sync_offline_experiences()

      assert {:ok,
              %{
                data: %{
                  "syncOfflineExperiences" => [
                    %{
                      "experience" => %{
                        "_id" => _,
                        "clientId" => "a",
                        "fieldDefs" => _,
                        "entries" => %{
                          "edges" => []
                        }
                      },
                      "entriesErrors" => [
                        %{
                          "clientId" => "c",
                          "error" => error,
                          "experienceId" => _
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

      assert error =~ ~s("fields":[{"errors":{"def_id":)
      assert error =~ ~s("meta":{"def_id":"b")
    end

    test "fails if entry.fields.data.type != experience.field_defs.type" do
      field_def = FieldDefFactory.params(type: "integer")

      params =
        Factory.params(
          client_id: "a",
          field_defs: [
            field_def
          ]
        )

      entry = EntryFactory.params(params, %{client_id: "c"})

      entry_field = %{
        data: %{"decimal" => 5.0},
        def_id: field_def.client_id
      }

      entry = Map.put(entry, :fields, [entry_field])

      user = RegFactory.insert()

      variables = %{
        "input" => [
          params
          |> Map.put(:entries, [entry])
          |> Factory.stringify()
        ]
      }

      query = Query.sync_offline_experiences()

      assert {:ok,
              %{
                data: %{
                  "syncOfflineExperiences" => [
                    %{
                      "experience" => %{
                        "_id" => _,
                        "clientId" => "a",
                        "fieldDefs" => _,
                        "entries" => %{
                          "edges" => []
                        }
                      },
                      "entriesErrors" => [
                        %{
                          "clientId" => "c",
                          "error" => error,
                          "experienceId" => _
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

      assert error =~ ~s("fields":[{"errors":{"def_id":)
      assert error =~ ~s("meta":{"def_id":)
    end

    test "fails if entry.fields.def_id not in experience.field_defs.client_ids" do
      field_defs = FieldDefFactory.params_list(2)

      params =
        Factory.params(
          client_id: "a",
          field_defs: field_defs
        )

      entry = EntryFactory.params(params, %{client_id: "c"})
      [entry_field, missing_entry_field] = entry.fields
      entry = Map.put(entry, :fields, [entry_field])

      user = RegFactory.insert()

      variables = %{
        "input" => [
          params
          |> Map.put(:entries, [entry])
          |> Factory.stringify()
        ]
      }

      query = Query.sync_offline_experiences()

      assert {:ok,
              %{
                data: %{
                  "syncOfflineExperiences" => [
                    %{
                      "experience" => %{
                        "_id" => _,
                        "clientId" => _,
                        "fieldDefs" => _,
                        "entries" => %{
                          "edges" => []
                        }
                      },
                      "entriesErrors" => [
                        %{
                          "clientId" => _,
                          "error" => error,
                          "experienceId" => _
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

      assert error =~ ~s("fields":[{"errors":{"data":)
      assert error =~ ~s("meta":{"def_id":"#{missing_entry_field.def_id}")
    end

    # @tag :skip
    test "fails if entry.client_ids not unique for experience" do
      params = Factory.params(client_id: "a")
      entries = EntryFactory.params_list(2, params, client_id: "b")

      user = RegFactory.insert()

      variables = %{
        "input" => [
          params
          |> Map.put(:entries, entries)
          |> Factory.stringify()
        ]
      }

      query = Query.sync_offline_experiences()

      assert {:ok,
              %{
                data: %{
                  "syncOfflineExperiences" => [
                    %{
                      "experience" => %{
                        "_id" => experience_id,
                        "clientId" => _,
                        "fieldDefs" => _,
                        "entries" => %{
                          "edges" => edges
                        }
                      },
                      "entriesErrors" => [
                        %{
                          "clientId" => "b",
                          "error" => error,
                          "experienceId" => entry_error_experience_id
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

      assert experience_id == entry_error_experience_id
      assert length(edges) == 1
      assert error =~ ~s("client_id":)
    end

    # @tag :skip
    test "fails if no user context" do
      params = Factory.params()

      variables = %{
        "input" => [
          params
          |> Factory.stringify()
        ]
      }

      query = Query.sync_offline_experiences()

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

    # @tag :skip
    test "fails if user does not exist" do
      user = %{id: 0}
      params = Factory.params(client_id: "a")

      variables = %{
        "input" => [
          Factory.stringify(params)
        ]
      }

      query = Query.sync_offline_experiences()

      assert {:ok,
              %{
                data: %{
                  "syncOfflineExperiences" => [
                    %{
                      "experienceError" => %{
                        "clientId" => "a",
                        "index" => 0,
                        "error" => error
                      }
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

      assert error =~ ~s("user":)
    end
  end

  defp context(user), do: %{current_user: user}
end
