import { ExperienceDetailViewFragment } from "@eb/shared/src/graphql/apollo-types/ExperienceDetailViewFragment";
import { OnlineStatus } from "@eb/shared/src/utils/types";
import { ReactMouseEvent } from "@eb/shared/src/utils/types/react";
import { createContext } from "react";
import { UseWithSubscriptionContextInject } from "../../../../shared/src/apollo/injectables";
import { CommentRemoteAction } from "../experience-comments/experience-comments.utils";
import { DataState, DispatchType } from "./detailed-experience-utils";

export type DispatchContextValue = Readonly<
  {
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
  } & UseWithSubscriptionContextInject
>;

export const DispatchContext = createContext<DispatchContextValue>(
  {} as DispatchContextValue,
);

export const DispatchProvider = DispatchContext.Provider;

export type DataStateContextValue = DataState["data"];

export const DataStateContext = createContext<DataStateContextValue>(
  {} as DataStateContextValue,
);

export const DataStateProvider = DataStateContext.Provider;
