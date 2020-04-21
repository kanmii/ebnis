defmodule EbnisData.Schema.User do
  use Absinthe.Schema.Notation

  alias EbnisData.User.Resolver

  @desc "A User"
  object :user do
    field(:id, non_null(:id))
    field(:jwt, non_null(:string))
    field(:email, non_null(:string))
    field(:name, non_null(:string))
    field(:credential, :credential)

    field(:inserted_at, non_null(:datetime))
    field(:updated_at, non_null(:datetime))
  end

  object :user_success do
    field(:user, non_null(:user))
  end

  object :registration_error do
    field(:email, :string)
    field(:password, :string)
    field(:password_confirmation, :string)
  end

  object :registration_errors do
    field(:errors, non_null(:registration_error))
  end

  union :registration do
    types([
      :user_success,
      :registration_errors
    ])

    resolve_type(&Resolver.registration_union/2)
  end

  object :login_error do
    field(:error, non_null(:string))
  end

  union :login do
    types([
      :user_success,
      :login_error
    ])

    resolve_type(&Resolver.login_union/2)
  end

  object :update_user_error do
    field(:password, :string)
    field(:password_confirmation, :string)
  end

  object :update_user_errors do
    field(:errors, non_null(:update_user_error))
  end

  union :update_user do
    types([
      :user_success,
      :update_user_errors
    ])

    resolve_type(&Resolver.update_union/2)
  end

  @desc "Variables for creating User and credential"
  input_object :register_user_input do
    field(:name, non_null(:string))
    field(:email, non_null(:string))
    field(:source, non_null(:string))
    field(:password, non_null(:string))
    field(:password_confirmation, non_null(:string))
  end

  @desc "Variables for updating User"
  input_object :update_user_input do
    field(:jwt, non_null(:string))
    field(:name, :string)
    field(:email, :string)
  end

  @desc "Variables for login in User"
  input_object :login_input do
    field(:password, non_null(:string))
    field(:email, non_null(:string))
  end

  @desc "Input variables for refreshing user"
  input_object :refresh_input do
    field(:jwt, non_null(:string))
  end

  ######################### MUTATION SECTION #######################

  @desc "Mutations allowed on User object"
  object :user_mutation do
    @doc "Create a user and her credential"
    field :register_user, :registration do
      arg(
        :input,
        non_null(:register_user_input)
      )

      resolve(&Resolver.create/2)
    end

    @doc "Log in a user"
    field :login, :login do
      arg(
        :input,
        non_null(:login_input)
      )

      resolve(&Resolver.login/2)
    end

    @doc "Update a user"
    field :update_user, :update_user do
      arg(
        :input,
        non_null(:update_user_input)
      )

      resolve(&Resolver.update/2)
    end
  end

  ######################### END MUTATION SECTION #######################

  @desc "Queries allowed on User object"
  object :user_query do
    @desc "Refresh a user session"
    field :refresh, :user do
      arg(:refresh, non_null(:refresh_input))
      resolve(&Resolver.refresh/3)
    end
  end
end
