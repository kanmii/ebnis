import { RegisterUserInput } from "@eb/shared/src/graphql/apollo-types/globalTypes";
import {
  RegisterUserMutation,
  RegisterUserMutationVariables,
  RegisterUserMutation_registerUser,
} from "@eb/shared/src/graphql/apollo-types/RegisterUserMutation";
import { UserFragment } from "@eb/shared/src/graphql/apollo-types/UserFragment";
import { REGISTER_USER_MUTATION } from "@eb/shared/src/graphql/user.gql";
import { manageUserAuthentication } from "@eb/shared/src/utils/manage-user-auth";
import { REGISTER_USER_ATTRS } from "./create-user-attrs";
import { mutate } from "./mutate";

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
