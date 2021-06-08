const EXPERIENCE_DETAIL_URL_MATCH = ":experienceId";

export const ROOT_URL = "/";
export const LOGIN_URL = "/fK1keJ4U";
export const SIGN_UP_URL = "/tIk3KAcE";
export const MY_URL = "/experiences";
export const EXPERIENCE_DETAIL_URL_PREFIX = "/experiences";

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
