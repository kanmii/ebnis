defmodule EbnisData.Query.User do
  @frag_name "UserAllFieldsFragment"

  def all_fields_fragment do
    fragment = """
      fragment #{@frag_name} on User {
        id
        name
        email
        jwt
        insertedAt
        updatedAt
      }
    """

    {@frag_name, fragment}
  end

  @doc "update"
  def update do
    {user_frag_name, user_frag} = all_fields_fragment()

    query = """
        updateUser(input: $input) {
          __typename
          ... on UserSuccess {
            user {
              ...#{user_frag_name}
            }
          }
        }
    """

    %{
      query: query,
      fragments: ~s( #{user_frag} ),
      parameters: "$input: UpdateUserInput!"
    }
  end

  @doc "refresh"
  def refresh do
    {user_frag_name, user_frag} = all_fields_fragment()

    query = """
        refresh(refresh: $refresh) {
          ...#{user_frag_name}
        }
    """

    %{
      query: query,
      fragments: ~s( #{user_frag} ),
      parameters: "$refresh: RefreshInput!"
    }
  end

  @doc "Login"
  def login do
    {_, user_frag} = all_fields_fragment()

    query = """
        login(input: $input) {
          __typename
          ... on UserSuccess {
            user {
              ...#{@frag_name}
            }
          }

          ... on LoginError {
            error
          }
        }
    """

    %{
      query: query,
      fragments: ~s(  #{user_frag} ),
      parameters: "$input: LoginInput!"
    }
  end
end
