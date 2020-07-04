defmodule EbnisData.Query.Registration do
  alias EbnisData.Query.Credential
  alias EbnisData.Query.User

  @doc "Register"
  def register do
    {user_frag_name, user_frag} = User.all_fields_fragment()
    {credential_frag_name, credential_frag} = Credential.all_fields_fragment()

    query = """
        registerUser(input: $input) {
          __typename
          ... on UserSuccess {
            user {
            ...#{user_frag_name}
              credential {
                ...#{credential_frag_name}
              }
            }
          }

          ... on RegisterUserErrors {
            errors {
              email
              password
              passwordConfirmation
            }
          }
        }
    """

    %{
      query: query,
      fragments: ~s( #{credential_frag} #{user_frag} ),
      parameters: "$input: RegisterUserInput!"
    }
  end
end
