/* istanbul ignore file */
import { lazy } from "react";

export const Comments = lazy(
  () => import("../experience-comments/experience-comments.component"),
);

export type CommentsInjectType = {
  CommentsInject: typeof Comments;
};
