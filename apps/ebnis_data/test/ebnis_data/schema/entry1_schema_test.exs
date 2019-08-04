defmodule EbnisData.Schema.Entry1Test do
  use EbnisData.DataCase, async: true

  alias EbnisData.Schema
  alias EbnisData.Factory.Registration, as: RegFactory
  alias EbnisData.Factory.Entry1, as: Factory
  alias EbnisData.Factory.Experience1, as: ExperienceFactory
  alias EbnisData.Query.Entry1, as: Query
  alias EbnisData.Resolver

  describe "create entry" do
    @tag :skip
    test "succeeds" do
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
  end

  defp context(user), do: %{current_user: user}
end
