import { ExperienceDetailViewFragment } from "@eb/cm/src/graphql/apollo-types/ExperienceDetailViewFragment";
import { OnlineStatus } from "@eb/cm/src/utils/types";
import { ReactMouseEvent } from "@eb/cm/src/utils/types/react";
import { createContext } from "react";
import { CommentRemoteAction } from "../experience-comments/experience-comments.utils";
import { DataState, DispatchType } from "./detailed-experience-utils";

export type DispatchContextValue = Readonly<{
  onDeleteDeclined: (e: ReactMouseEvent) => void;
  onDeleteConfirmed: (e: ReactMouseEvent) => void;
  onDeleteRequested: (e: ReactMouseEvent) => void;
  requestUpdateUiCb: (e: ReactMouseEvent) => void;
  cancelUpdateUiRequestCb: (e: ReactMouseEvent) => void;
  onUpdateSuccess: (
    e: ExperienceDetailViewFragment,
    onlineStatus: OnlineStatus,
  ) => void;
  toggleMenuCb: (e: ReactMouseEvent) => void;
  dispatch: DispatchType;
  onUpdateError: (error: string) => void;
  closeSyncErrorsMsg: (e: ReactMouseEvent) => void;
  refetchCb: (e: ReactMouseEvent) => void;
  commentCb: (e: ReactMouseEvent, commentAction: CommentRemoteAction) => void;
}>;

export const DispatchContext = createContext<DispatchContextValue>(
  {} as DispatchContextValue,
);

export const DispatchProvider = DispatchContext.Provider;

export type DataStateContextValue = DataState["data"];

export const DataStateContext = createContext<DataStateContextValue>(
  {} as DataStateContextValue,
);

export const DataStateProvider = DataStateContext.Provider;
