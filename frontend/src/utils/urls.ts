const EXPERIENCE_DETAIL_URL_MATCH = ":experienceId";

export const ROOT_URL = "/";
export const LOGIN_URL = "/login";
export const SIGN_UP_URL = "/sign-up";
export const MY_URL = "/my";

export const EXPERIENCE_DETAIL_URL_PREFIX =
  "/ksPEBixot3LklfZw89CAofihUqxT2jObKt1RV";

export const EXPERIENCE_DETAIL_URL = `${EXPERIENCE_DETAIL_URL_PREFIX}/${EXPERIENCE_DETAIL_URL_MATCH}`;

export function makeDetailedExperienceRoute(experienceId: string) {
  return EXPERIENCE_DETAIL_URL.replace(
    EXPERIENCE_DETAIL_URL_MATCH,
    experienceId,
  );
}

export interface DetailExperienceRouteMatch {
  experienceId: string;
}
