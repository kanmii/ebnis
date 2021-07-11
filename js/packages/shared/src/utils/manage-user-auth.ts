/* istanbul ignore file */
import { UserFragment } from "../graphql/apollo-types/UserFragment";

const LOGGED_IN_USER_KEY = "Qxh/MFAJO/rKi8D10ZPQmY+7X3J4fO9zAxzPto";
const LOGGED_OUT_USER_KEY = "DphF4ksph7pU04HrrQ3M7s/flARX2Q3G3uff7";

export function manageUserAuthentication(user: UserFragment | null) {
  if (user) {
    // login

    localStorage.setItem(LOGGED_IN_USER_KEY, JSON.stringify(user));
    localStorage.removeItem(LOGGED_OUT_USER_KEY);
  } else {
    // logout

    const data = localStorage.getItem(LOGGED_IN_USER_KEY);
    localStorage.removeItem(LOGGED_IN_USER_KEY);

    if (data) {
      localStorage.setItem(LOGGED_OUT_USER_KEY, data);
    } else {
      localStorage.removeItem(LOGGED_OUT_USER_KEY);
    }
  }
}

export function getUser() {
  const data = localStorage.getItem(LOGGED_IN_USER_KEY);
  return data ? (JSON.parse(data) as UserFragment) : null;
}

export type GetUserInjectType = {
  getUserInject: typeof getUser;
};

export function getToken() {
  const data = getUser();
  return data && data.jwt;
}
