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

  @iso_extended_format "{ISO:Extended:Z}"

  describe "create entry" do
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
                      "entryDataList" => entry_data_list,
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

      entry_data_list_ids =
        entry_data_list
        |> Enum.map(& &1["fieldDefinitionId"])
        |> Enum.sort()

      assert experience.field_definitions
             |> Enum.map(& &1.id)
             |> Enum.sort() == entry_data_list_ids
    end

    # @tag :skip
    test "fails if experience id does not exist" do
      user = RegFactory.insert()

      params = %{
        experience_id: "0",
        entry_data_list: [
          %{
            field_definition_id: Ecto.UUID.generate(),
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
                    "entryErrors" => %{
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
    test "fails if creator of entry is not owner of experience" do
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
                    "entryErrors" => %{
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
    test "fails if field definition does not exist" do
      user = RegFactory.insert()
      experience = ExperienceFactory.insert(user_id: user.id)
      params = Factory.params(experience)

      bogus_field = %{
        data: %{"integer" => 1},
        field_definition_id: Ecto.UUID.generate()
      }

      params = update_in(params.entry_data_list, &[bogus_field | &1])

      variables = %{
        "input" => Factory.stringify(params)
      }

      assert {:ok,
              %{
                data: %{
                  "createEntry1" => %{
                    "entry" => nil,
                    "entryDataListErrors" => [
                      %{
                        "index" => 0,
                        "errors" => %{
                          "fieldDefinition" => fieldDefinitionError
                        }
                      }
                    ]
                  }
                }
              }} =
               Absinthe.run(
                 Query.create(),
                 Schema,
                 variables: variables,
                 context: context(user)
               )

      assert is_binary(fieldDefinitionError)
    end

    # @tag :skip
    test "fails if field definition ID not unique" do
      user = RegFactory.insert()
      experience = ExperienceFactory.insert(user_id: user.id)
      params = Factory.params(experience)

      # duplicate the first entry_data
      params =
        update_in(
          params.entry_data_list,
          &(&1 ++ [hd(&1)])
        )

      index_of_duplicate_entry_data = length(params.entry_data_list) - 1

      variables = %{
        "input" => Factory.stringify(params)
      }

      assert {:ok,
              %{
                data: %{
                  "createEntry1" => %{
                    "entry" => nil,
                    "entryDataListErrors" => [
                      %{
                        "index" => ^index_of_duplicate_entry_data,
                        "errors" => %{
                          "fieldDefinitionId" => fieldDefinitionId
                        }
                      }
                    ]
                  }
                }
              }} =
               Absinthe.run(
                 Query.create(),
                 Schema,
                 variables: variables,
                 context: context(user)
               )

      assert is_binary(fieldDefinitionId)
    end

    # @tag :skip
    test "fails if entry_data.data.type != field_definition.type" do
      user = RegFactory.insert()

      experience =
        %{
          user_id: user.id,
          field_definitions: [%{name: "aa", type: "integer"}]
        }
        |> ExperienceFactory.insert()

      params = %{
        experience_id: experience.id,
        entry_data_list: [
          %{
            field_definition_id: hd(experience.field_definitions).id,
            data: %{decimal: 1.0}
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
                    "entryDataListErrors" => [
                      %{
                        "index" => 0,
                        "errors" => %{
                          "data" => data
                        }
                      }
                    ]
                  }
                }
              }} =
               Absinthe.run(
                 Query.create(),
                 Schema,
                 variables: variables,
                 context: context(user)
               )

      assert is_binary(data)
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
                    "entryErrors" => %{
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
    test "fails if no user context" do
      params = %{
        experience_id: "0",
        entry_data_list: [
          %{
            field_definition_id: "a",
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
    test "fails if entry_data.data can not be cast" do
      user = RegFactory.insert()

      experience =
        %{
          user_id: user.id,
          title: "aa",
          field_definitions: [%{name: "bb", type: "integer"}]
        }
        |> ExperienceFactory.insert()

      [field_definition | _] = experience.field_definitions

      params = %{
        experience_id: experience.id,
        entry_data_list: [
          %{
            field_definition_id: field_definition.id,
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
                    "entryDataListErrors" => [
                      %{
                        "index" => 0,
                        "errors" => %{
                          "data" => data_errors
                        }
                      }
                    ]
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
                     entry_errors: %{
                       experience: experience
                     }
                   }
                 } =
                   %{
                     input: %{
                       entry_data_list: [
                         %{
                           field_definition_id: "a",
                           data: %{"integer" => 1}
                         }
                       ],
                       experience_id: nil
                     }
                   }
                   |> Entry1Resolver.create(%{context: context(%{id: 1})})

          assert is_binary(experience)
        end)

      assert log =~ "STACK"
    end
  end

  defp context(user), do: %{current_user: user}
end
