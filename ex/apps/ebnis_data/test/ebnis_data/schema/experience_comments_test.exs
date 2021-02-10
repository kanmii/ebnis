defmodule EbnisData.Schema.ExperienceCommentsTest do
  use EbnisData.DataCase, async: true

  alias EbnisData.Schema
  alias EbnisData.Factory.Registration, as: RegFactory
  alias EbnisData.Factory.Experience, as: Factory
  alias EbnisData.Query.Experience, as: Query

  # @tag :skip
  test "success: create experience with comments" do
    user = RegFactory.insert()

    input = %{
      "title" => "a4",
      "dataDefinitions" => [
        %{
          "name" => "a1",
          "type" => "INTEGER"
        }
      ],
      "comment_text" => "text"
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
                    "experience" => %{
                      "id" => _,
                      "comments" => [
                        %{
                          "id" => _,
                          "text" => "text"
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

  # @tag :skip
  test "fetch experiences when comments present" do
    user = RegFactory.insert()

    %{
      id: experience_id
    } =
      _experience =
      Factory.insert(
        %{
          user_id: user.id,
          comment_text: "aa"
        },
        [
          "integer"
        ]
      )

    assert {:ok,
            %{
              data: %{
                "preFetchExperiences" => [
                  %{
                    "comments" => [
                      %{
                        "id" => _,
                        "text" => "aa"
                      }
                    ],
                    "id" => ^experience_id
                  }
                ]
              }
            }} =
             Absinthe.run(
               Query.vorholen_erfahrungen(),
               Schema,
               variables: %{
                 "ids" => [experience_id],
                 "entryPagination" => %{
                   "first" => 1
                 }
               },
               context: context(user)
             )
  end

  # @tag :skip
  test "get experience comments: returns comments list" do
    user = RegFactory.insert()

    %{
      id: experience_id
    } =
      _experience =
      Factory.insert(
        %{
          user_id: user.id,
          comment_text: "aa"
        },
        [
          "integer"
        ]
      )

    variables = %{
      "experienceId" => experience_id
    }

    assert {:ok,
            %{
              data: %{
                "getExperienceComments" => %{
                  "experienceId" => ^experience_id,
                  "comments" => [
                    %{
                      "id" => _,
                      "text" => _
                    }
                  ]
                }
              }
            }} =
             Absinthe.run(
               Query.get_experience_comments(),
               Schema,
               variables: variables,
               context: context(user)
             )
  end

  # @tag :skip
  test "success/error:text too short: create comment for existing experience" do
    user = RegFactory.insert()

    %{
      id: experience_id
    } =
      _experience =
      Factory.insert(
        %{user_id: user.id},
        [
          "integer"
        ]
      )

    create_comments_input = %{
      "experienceId" => experience_id,
      "createComments" => [
        %{
          "text" => "text"
        },
        %{
          "text" => "a"
        }
      ]
    }

    variables = %{
      "input" => [
        create_comments_input
      ]
    }

    assert {
             :ok,
             %{
               data: %{
                 "updateExperiences" => %{
                   "experiences" => [
                     %{
                       "comments" => %{
                         "inserts" => [
                           %{
                             "comment" => %{
                               "id" => _,
                               "text" => "text"
                             }
                           },
                           %{
                             "errors" => %{
                               "meta" => %{
                                 "id" => _,
                                 "index" => 1
                               },
                               "errors" => %{
                                 "id" => nil,
                                 "association" => nil,
                                 "error" => text_error
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

    assert is_binary(text_error)
  end

  defp context(user) do
    %{current_user: user}
  end
end
