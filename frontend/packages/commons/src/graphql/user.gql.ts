import gql from "graphql-tag";

export const USER_FRAGMENT = gql`
  fragment UserFragment on User {
    id
    name
    email
    jwt
  }
`;

const REGISTER_USER_ERROR = gql`
  fragment RegisterUserErrorFragment on RegisterUserError {
    email
    password
    passwordConfirmation
  }
`;

export const REGISTER_USER_MUTATION = gql`
  mutation RegisterUserMutation($input: RegisterUserInput!) {
    registerUser(input: $input) {
      __typename
      ... on UserSuccess {
        user {
          ...UserFragment
        }
      }
      ... on RegisterUserErrors {
        errors {
          ...RegisterUserErrorFragment
        }
      }
    }
  }
  ${USER_FRAGMENT}
  ${REGISTER_USER_ERROR}
`;

export const LOGIN_MUTATION = gql`
  mutation LoginMutation($input: LoginInput!) {
    login(input: $input) {
      __typename
      ... on UserSuccess {
        user {
          ...UserFragment
        }
      }
      ... on LoginError {
        error
      }
    }
  }
  ${USER_FRAGMENT}
`;
