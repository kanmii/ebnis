import {
  LoginMutation,
  LoginMutationVariables,
  LoginMutation_login,
} from "@eb/shared/src/graphql/apollo-types/LoginMutation";
import { UserFragment } from "@eb/shared/src/graphql/apollo-types/UserFragment";
import { LOGIN_MUTATION } from "@eb/shared/src/graphql/user.gql";
import { manageUserAuthentication } from "@eb/shared/src/utils/manage-user-auth";
import { loginMswGql } from "@eb/shared/src/__tests__/msw-handlers";
import { CREATE_USER_ATTRS, MOCK_USER } from "./create-user-attrs";
import { useCypressMsw } from "./cypress-msw";
import { mutate } from "./mutate";

export function loginMockUser() {
  useCypressMsw(
    loginMswGql({
      login: {
        __typename: "UserSuccess",
        user: {
          ...MOCK_USER,
        },
      },
    }),
  );

  return mutate<LoginMutation, LoginMutationVariables>({
    mutation: LOGIN_MUTATION,
    variables: {
      input: CREATE_USER_ATTRS,
    },
  }).then((result) => {
    let user: null | UserFragment = null;

    const data = (result &&
      result.data &&
      result.data.login) as LoginMutation_login;

    if (data.__typename === "UserSuccess") {
      user = data.user;
      manageUserAuthentication(user);
    }

    expect(user).not.eq(null);
    return user;
  });
}
