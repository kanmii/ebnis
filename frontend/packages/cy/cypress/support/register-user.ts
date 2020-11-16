import { REGISTER_USER_MUTATION } from "@ebnis/commons/src/graphql/user.gql";
import { RegisterUserInput } from "@ebnis/commons/src/graphql/apollo-types/globalTypes";
import { manageUserAuthentication } from "@ebnis/cra/src/utils/manage-user-auth";
import {
  RegisterUserMutation,
  RegisterUserMutationVariables,
  RegisterUserMutation_registerUser,
} from "@ebnis/commons/src/graphql/apollo-types/RegisterUserMutation";
import { mutate } from "./mutate";
import { REGISTER_USER_ATTRS } from "./create-user-attrs";
import { UserFragment } from "@ebnis/commons/src/graphql/apollo-types/UserFragment";

export async function registerUser(
  userData: RegisterUserInput = REGISTER_USER_ATTRS,
) {
  return mutate<RegisterUserMutation, RegisterUserMutationVariables>({
    mutation: REGISTER_USER_MUTATION,
    variables: {
      input: userData,
    },
  }).then((result) => {
    let user: null | UserFragment = null;

    const data = (result &&
      result.data &&
      result.data.registerUser) as RegisterUserMutation_registerUser;

    if (data.__typename === "UserSuccess") {
      user = data.user;
      manageUserAuthentication(user);
    }

    expect(user).not.eq(null);

    return user;
  });
}
