/* eslint-disable @typescript-eslint/no-explicit-any */
import { clearTimeoutFn } from "../components/DetailExperience/detail-experience.injectables";
import { CreateEntryErrorFragment } from "@eb/cm/src/graphql/apollo-types/CreateEntryErrorFragment";
import { DataObjectErrorFragment } from "@eb/cm/src/graphql/apollo-types/DataObjectErrorFragment";
import { DeleteExperiences } from "@eb/cm/src/graphql/apollo-types/DeleteExperiences";
import { ComponentTimeoutsMs } from "@eb/cm/src/utils/timers";
import {
  EbnisGlobals,
  OnSyncedData,
  StateValue,
  SyncErrors,
} from "@eb/cm/src/utils/types";
import {
  mockOfflineEntry1,
  mockOfflineEntry1Id,
  mockOfflineExperience1,
  mockOfflineExperienceId1,
  mockOnlineDataDefinitionInteger1Id,
  mockOnlineDataObject1id,
  mockOnlineEntry1,
  mockOnlineEntry1Id,
  mockOnlineEntry2,
  mockOnlineEntry2Id,
  mockOnlineExperience1,
  mockOnlineExperienceId1,
} from "@eb/cm/src/__tests__/mock-data";
import {
  deleteExperiencesMswGql,
  // updateMswExperiencesGql,
  getExperienceAndEntriesDetailViewGqlMsw,
} from "@eb/cm/src/__tests__/msw-handlers";
import { mswServer, mswServerListen } from "@eb/cm/src/__tests__/msw-server";
import { waitForCount } from "@eb/cm/src/__tests__/wait-for-count";
import { cleanup, render, waitFor } from "@testing-library/react";
import { ComponentType } from "react";
import { act } from "react-dom/test-utils";
import { makeApolloClient } from "../apollo/client";
import {
  getDeleteExperienceLedger,
  putOrRemoveDeleteExperienceLedger,
} from "../apollo/delete-experience-cache";
import {
  // getCachedEntriesDetailView,
  getCachedExperienceAndEntriesDetailView,
} from "../apollo/get-detailed-experience-query";
import { useWithSubscriptionContext } from "../apollo/injectables";
import {
  getAndRemoveOfflineExperienceIdFromSyncFlag,
  getSyncError,
  putOfflineExperienceIdInSyncFlag,
} from "../apollo/sync-to-server-cache";
import { removeUnsyncedExperiences } from "../apollo/unsynced-ledger";
import { DetailExperience } from "../components/DetailExperience/detail-experience.component";
import {
  closeSyncErrorsMsgBtnId,
  deleteFailNotificationCloseId,
  deleteFooterCloseId,
  deleteHeaderCloseId,
  deleteMenuItemId,
  deleteOkId,
  domPrefix,
  menuSelector,
  menuTriggerSelector,
  newEntryMenuItemSelector,
  noTriggerDocumentEventClassName,
  refetchId,
  syncErrorsNotificationId,
  updateMenuItemId,
  updateSuccessNotificationId,
} from "../components/DetailExperience/detail-experience.dom";
import {
  ActionType,
  EffectArgs,
  effectFunctions,
  EffectType as E,
  initState,
  Match,
  Props,
  reducer,
  StateMachine as S,
} from "../components/DetailExperience/detailed-experience-utils";
import {
  CallerProps as EntriesCallerProps,
  EntriesRemoteActionType,
} from "../components/entries/entries.utils";
import {
  createCommentsMenuId,
  hideCommentsMenuId,
  showCommentsMenuId,
} from "../components/experience-comments/experience-comments.dom";
import {
  CallerProps as CommentsCallerProps,
  CommentRemoteActionType,
} from "../components/experience-comments/experience-comments.utils";
import { Props as UpsertExperienceProps } from "../components/UpsertExperience/upsert-experience.utils";
import {
  cleanUpOfflineExperiences,
  cleanUpSyncedOfflineEntries,
} from "../components/WithSubscriptions/with-subscriptions.utils";
import { getById, getEffects, getOneByClass } from "../tests.utils";
import { deleteObjectKey } from "../utils";
import { GENERIC_SERVER_ERROR } from "../utils/common-errors";
import { getIsConnected } from "../utils/connections";
import { deleteExperiences } from "../utils/delete-experiences.gql";
import {
  getExperienceAndEntriesDetailView,
  GetExperienceAndEntriesDetailViewQueryResult,
} from "../utils/experience.gql.types";
import { ChangeUrlType, windowChangeUrl } from "../utils/global-window";
import { updateExperiencesMutation } from "../utils/update-experiences.gql";
import { MY_URL } from "../utils/urls";
import { activeClassName } from "../utils/utils.dom";

jest.mock("../components/DetailExperience/detail-experience.injectables");
const mockClearTimeoutFn = clearTimeoutFn as jest.Mock;

const mockActionType = ActionType;

jest.mock("../utils/global-window");
const mockWindowChangeUrl = windowChangeUrl as jest.Mock;

jest.mock("../apollo/injectables");
const mockUseWithSubscriptionContext = useWithSubscriptionContext as jest.Mock;

jest.mock("../apollo/unsynced-ledger");
const mockRemoveUnsyncedExperiences = removeUnsyncedExperiences as jest.Mock;

const mockUpsertSuccessId = "@t/upsert-success";
const mockUpsertFailId = "@t/upsert-fail";
const mockUpsertCancelId = "@t/upsert-cancel";
const mockOnline = StateValue.online;
jest.mock("../components/My/my.lazy", () => ({
  UpsertExperience: (props: UpsertExperienceProps) => {
    return (
      <div>
        <button
          id={mockUpsertSuccessId}
          onClick={() => {
            props.onSuccess(mockOnlineExperience1, mockOnline);
          }}
        />
        <button
          id={mockUpsertFailId}
          onClick={() => {
            props.onError("a");
          }}
        />
        <button id={mockUpsertCancelId} onClick={props.onClose} />
      </div>
    );
  },
}));

jest.mock("../apollo/delete-experience-cache");
const mockGetDeleteExperienceLedger = getDeleteExperienceLedger as jest.Mock;
const mockPutOrRemoveDeleteExperienceLedger = putOrRemoveDeleteExperienceLedger as jest.Mock;

const mockLoadingId = "@t/loading";
jest.mock("../components/Loading/loading.component", () => {
  return () => <span id={mockLoadingId} />;
});

const mockHeaderId = "@t/header";
jest.mock("../components/Header/header.component", () => () => (
  <div id={mockHeaderId} />
));

const mockNewEntryId = "@t/new-entry";
const mockEntryMenuId = "@t/entry-menu";
const mockEntriesRemoteActionType = EntriesRemoteActionType;
jest.mock("../components/entries/entries.component", () => {
  return (props: EntriesCallerProps) => {
    const { parentDispatch, postActions } = props;
    const action0 = postActions[0];

    return (
      <div>
        <span
          id={mockNewEntryId}
          onClick={() => {
            parentDispatch({
              type: mockActionType.hide_menus,
              menus: ["mainCircular"],
            });
          }}
        />
        {action0 && action0.type === mockEntriesRemoteActionType.upsert && (
          <span id={mockEntryMenuId} />
        )}
      </div>
    );
  };
});

jest.mock("../utils/connections");
const mockGetIsConnected = getIsConnected as jest.Mock;

jest.mock("../apollo/get-detailed-experience-query");
const mockGetCachedExperienceAndEntriesDetailView = getCachedExperienceAndEntriesDetailView as jest.Mock;

jest.mock("../apollo/sync-to-server-cache");
const mockGetSyncError = getSyncError as jest.Mock;
const mockgetAndRemoveOfflineExperienceIdFromSyncFlag = getAndRemoveOfflineExperienceIdFromSyncFlag as jest.Mock;
const mockPutOfflineExperienceIdInSyncFlag = putOfflineExperienceIdInSyncFlag as jest.Mock;
// const mockPutOrRemoveSyncError = putOrRemoveSyncError as jest.Mock;

jest.mock("../components/WithSubscriptions/with-subscriptions.utils");
const mockCleanUpOfflineExperiences = cleanUpOfflineExperiences as jest.Mock;
const mockCleanUpSyncedOfflineEntries = cleanUpSyncedOfflineEntries as jest.Mock;

const mockUpsertCommentsId = "@t/upsert-comments";
const mockCloseUpsertCommentsId = "@t/close-comments";
const mockCommentsHideMenuId = "@t/comments-hide-menu";
const mockCommentRemoteActionType = CommentRemoteActionType;
const mockNoTriggerDocumentEventClassName = noTriggerDocumentEventClassName;
jest.mock("../components/DetailExperience/detail-experience.lazy", () => {
  return {
    Comments: (props: CommentsCallerProps) => {
      const { postActions, parentDispatch } = props;
      const action0 = postActions[0];

      return (
        <div className={mockNoTriggerDocumentEventClassName}>
          <span
            id={mockUpsertCommentsId}
            onClick={() => {
              if (
                action0 &&
                action0.type === mockCommentRemoteActionType.upsert
              ) {
                parentDispatch({
                  type: mockActionType.comment_action,
                  action: {
                    type: mockCommentRemoteActionType.upsert,
                  },
                });
              }
            }}
          />
          <span
            id={mockCloseUpsertCommentsId}
            onClick={() => {
              parentDispatch({
                type: mockActionType.comment_action,
                action: {
                  type: mockCommentRemoteActionType.upsert_closed,
                },
              });
            }}
          />
          <span
            id={mockCommentsHideMenuId}
            onClick={() => {
              if (
                action0 &&
                action0.type === mockCommentRemoteActionType.hide_menus
              ) {
                parentDispatch({
                  type: mockActionType.comment_action,
                  action: {
                    type: mockCommentRemoteActionType.hide,
                  },
                });
              }
            }}
          />
        </div>
      );
    },
  };
});

const mockHistoryPushFn = jest.fn();

const mockPersistFunc = jest.fn();
const mockDeleteExperiences = jest.fn();

const componentTimeoutsMs: ComponentTimeoutsMs = {
  fetchRetries: [0],
  closeNotification: 0,
};

const history = {
  push: mockHistoryPushFn,
} as any;

const ebnisObject = {
  persistor: {
    persist: mockPersistFunc as any,
  },
} as EbnisGlobals;

beforeAll(() => {
  window.____ebnis = ebnisObject;
});

afterAll(() => {
  deleteObjectKey(window, "____ebnis");
});

afterEach(() => {
  jest.clearAllMocks();
  ebnisObject.logApolloQueries = false;
  ebnisObject.logReducers = false;
});

describe("components", () => {
  beforeAll(() => {
    mswServerListen();
  });

  afterAll(() => {
    mswServer.close();
  });

  beforeEach(() => {
    mockUseWithSubscriptionContext.mockReturnValue({});

    const { client, cache } = makeApolloClient(ebnisObject, { testing: true });
    ebnisObject.cache = cache;
    ebnisObject.client = client;
  });

  afterEach(() => {
    mswServer.resetHandlers();
    cleanup();
    deleteObjectKey(ebnisObject, "client");
    deleteObjectKey(ebnisObject, "cache");
  });

  it("fetch experience succeeds / connected / no retry", async () => {
    mockGetIsConnected.mockReturnValue(true);

    mswServer.use(
      getExperienceAndEntriesDetailViewGqlMsw({
        getExperience: {
          ...mockOnlineExperience1,
        },
        getEntries: null,
      }),
    );

    const { ui } = makeComp();

    await act(async () => {
      render(ui);

      expect(getById(mockLoadingId)).not.toBeNull();
      expect(getById(domPrefix)).toBeNull();

      await waitFor(() => {
        expect(getById(domPrefix)).not.toBeNull();
      });

      expect(getById(mockLoadingId)).toBeNull();
      expect(getById(refetchId)).toBeNull();
    });
  });

  const mockGetCachedExperienceAndEntriesDetailView2 = {
    data: {
      getExperience: {
        ...mockOnlineExperience1,
      } as any,
    },
  } as GetExperienceAndEntriesDetailViewQueryResult;

  it("first fetch of experience fails/succeeds on retry from cache", async () => {
    mockGetIsConnected.mockReturnValue(true);

    mswServer.use(
      getExperienceAndEntriesDetailViewGqlMsw({
        getExperience: null, // causes failure
        getEntries: null,
      }),
    );

    const { ui } = makeComp();

    await act(async () => {
      render(ui);

      expect(getById(mockLoadingId)).not.toBeNull();
      expect(getById(domPrefix)).toBeNull();
      expect(getById(refetchId)).toBeNull();

      const retryEl = await waitFor(() => {
        const el = getById(refetchId);
        expect(el).not.toBeNull();
        return el;
      });

      expect(getById(mockLoadingId)).toBeNull();
      expect(getById(domPrefix)).toBeNull();

      mockGetCachedExperienceAndEntriesDetailView.mockReturnValue(
        mockGetCachedExperienceAndEntriesDetailView2,
      );

      retryEl.click();

      await waitFor(() => {
        expect(getById(domPrefix)).not.toBeNull();
      });

      expect(getById(refetchId)).toBeNull();
    });
  });

  it("update experience succeeds", async () => {
    mockGetCachedExperienceAndEntriesDetailView.mockReturnValue({
      data: {
        getExperience: {
          ...mockOnlineExperience1,
        } as any,
      },
    } as GetExperienceAndEntriesDetailViewQueryResult);

    const { ui } = makeComp();

    await act(async () => {
      // ebnisObject.logReducers = true;
      render(ui);

      const triggerUpdateUiEl = await waitFor(() => {
        const el = getById(updateMenuItemId);
        expect(el).not.toBeNull();
        return el;
      });

      // Update UI should not be visible
      expect(getById(mockUpsertCancelId)).toBeNull();

      // When Update UI is requested
      triggerUpdateUiEl.click();

      // Update UI should be visible
      // When Update UI is cancelled
      getById(mockUpsertCancelId).click();

      // Update UI should not be visible
      expect(getById(mockUpsertCancelId)).toBeNull();
      expect(getById(mockUpsertSuccessId)).toBeNull();

      // When Update UI is requested
      triggerUpdateUiEl.click();

      // Notification should not be visible
      expect(getById(updateSuccessNotificationId)).toBeNull();

      // Update UI should be visible
      // When update succeeds
      getById(mockUpsertSuccessId).click();

      // Update UI should not be visible
      expect(getById(mockUpsertSuccessId)).toBeNull();

      // Notification should be visible
      // When notification is closed
      getById(updateSuccessNotificationId).click();

      // Notification should not be visible
      expect(getById(updateSuccessNotificationId)).toBeNull();

      // When Update UI is requested
      triggerUpdateUiEl.click();

      // Update UI should be visible
      // When update succeeds
      getById(mockUpsertSuccessId).click();

      // Notification should be visible
      expect(getById(updateSuccessNotificationId)).not.toBeNull();

      // Notification should auto close
      await waitFor(() => {
        expect(getById(updateSuccessNotificationId)).toBeNull();
      });
    });
  });

  const deleteExperience1Data: DeleteExperiences = {
    deleteExperiences: {
      __typename: "DeleteExperiencesSomeSuccess",
      experiences: [
        {
          __typename: "DeleteExperienceSuccess",
          experience: {
            __typename: "Experience",
            id: mockOnlineExperienceId1,
            title: "aa",
          },
        },
      ],
      clientSession: "",
      clientToken: "",
    },
  };

  it("delete experience success", async () => {
    mockGetCachedExperienceAndEntriesDetailView.mockReturnValue({
      data: {
        getExperience: {
          ...mockOnlineExperience1,
        } as any,
      },
    } as GetExperienceAndEntriesDetailViewQueryResult);

    mswServer.use(deleteExperiencesMswGql(deleteExperience1Data));

    const { ui } = makeComp();

    await act(async () => {
      // ebnisObject.logReducers = true;
      render(ui);

      const triggerDeleteUiEl = await waitFor(() => {
        const el = getById(deleteMenuItemId);
        expect(el).not.toBeNull();
        return el;
      });

      // Delete confirmation should not be visible
      expect(getById(deleteHeaderCloseId)).toBeNull();

      // When delete is requested
      triggerDeleteUiEl.click();

      // Delete confirmation should be visible
      // When delete confirmation is closed: header
      getById(deleteHeaderCloseId).click();

      // Delete confirmation should not be visible
      expect(getById(deleteHeaderCloseId)).toBeNull();
      expect(getById(deleteFooterCloseId)).toBeNull();

      // When delete is requested
      triggerDeleteUiEl.click();

      // Delete confirmation should be visible
      // When delete confirmation is closed: footer
      getById(deleteFooterCloseId).click();

      // Delete confirmation should not be visible
      expect(getById(deleteFooterCloseId)).toBeNull();

      // When delete is requested
      triggerDeleteUiEl.click();

      // When deletion is confirmed
      getById(deleteOkId).click();

      // When deletion succeeds
      // User should be navigated away from the page
      const calls = await waitForCount(() => {
        const calls = mockHistoryPushFn.mock.calls[0];
        return calls;
      });
      expect(calls[0]).toBe(MY_URL);

      // Code to clean up deleted experience from cache should be called
      expect(mockPutOrRemoveDeleteExperienceLedger).toBeCalled();
      expect(mockRemoveUnsyncedExperiences).toBeCalled();
      expect(mockPersistFunc).toBeCalled();
    });
  });

  const deleteExperience2Data: DeleteExperiences = {
    deleteExperiences: {
      __typename: "DeleteExperiencesAllFail",
      error: "a",
    },
  };

  it("delete experience fails/manually close notification", async () => {
    mockGetCachedExperienceAndEntriesDetailView.mockReturnValue({
      data: {
        getExperience: {
          ...mockOnlineExperience1,
        } as any,
      },
    } as GetExperienceAndEntriesDetailViewQueryResult);

    mswServer.use(deleteExperiencesMswGql(deleteExperience2Data));

    const { ui } = makeComp();
    let unmount1: any;

    await act(async () => {
      // ebnisObject.logReducers = true;
      // ebnisObject.logApolloQueries = true;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { unmount } = render(ui);
      unmount1 = unmount;

      const triggerDeleteUiEl = await waitFor(() => {
        const el = getById(deleteMenuItemId);
        expect(el).not.toBeNull();
        return el;
      });

      // When delete is requested and confirmed
      triggerDeleteUiEl.click();
      getById(deleteOkId).click();

      // notification should not be visible
      expect(getById(deleteFailNotificationCloseId)).toBeNull();

      // When deletion fails
      // notification should be visible
      const notificationEl = await waitFor(() => {
        const el = getById(deleteFailNotificationCloseId);
        expect(el).not.toBeNull();
        return el;
      });

      // When notification closed
      notificationEl.click();

      // notification should not be visible
      expect(getById(deleteFailNotificationCloseId)).toBeNull();

      expect(mockClearTimeoutFn).not.toBeCalled();
    });

    // timeouts should be cleared after component unmount
    expect(mockClearTimeoutFn).not.toBeCalled();
    unmount1();
    expect(mockClearTimeoutFn).toBeCalled();
  });

  it("delete experience fails/automatically close notification", async () => {
    mockGetCachedExperienceAndEntriesDetailView.mockReturnValue({
      data: {
        getExperience: {
          ...mockOnlineExperience1,
        } as any,
      },
    } as GetExperienceAndEntriesDetailViewQueryResult);

    mockDeleteExperiences.mockResolvedValue({});

    const { ui } = makeComp({
      props: {
        deleteExperiences: mockDeleteExperiences,
      },
    });

    await act(async () => {
      // ebnisObject.logReducers = true;
      // ebnisObject.logApolloQueries = true;
      render(ui);

      const triggerDeleteUiEl = await waitFor(() => {
        const el = getById(deleteMenuItemId);
        expect(el).not.toBeNull();
        return el;
      });

      // When delete is requested and confirmed
      triggerDeleteUiEl.click();
      getById(deleteOkId).click();

      // notification should not be visible
      expect(getById(deleteFailNotificationCloseId)).toBeNull();

      // When deletion fails
      // notification should be visible
      await waitFor(() => {
        const el = getById(deleteFailNotificationCloseId);
        expect(el).not.toBeNull();
        return el;
      });

      // Notification should auto close
      await waitFor(() => {
        expect(getById(deleteFailNotificationCloseId)).toBeNull();
      });
    });
  });

  const withSubscriptionContext1 = {
    onSyncData: {
      offlineIdToOnlineExperienceMap: {
        [mockOfflineExperienceId1]: mockOnlineExperience1,
        "fake-id": {},
      },
      syncErrors: {
        [mockOfflineExperienceId1]: {
          createEntries: {
            [mockOfflineEntry1Id]: {
              error: "e",
              dataObjects: [
                {
                  meta: {
                    index: 1,
                    id: "",
                    clientId: "",
                  },
                  data: "1",
                },
              ],
            } as CreateEntryErrorFragment,
          },
          updateEntries: {
            [mockOnlineEntry1Id]: "a",
          },
        },
      },
    } as OnSyncedData,
  };

  const mockGetCachedExperienceAndEntriesDetailView1 = {
    data: {
      getExperience: {
        ...mockOfflineExperience1,
      } as any,
      getEntries: {
        __typename: "GetEntriesSuccess",
        entries: {
          pageInfo: {},
          edges: [
            {
              node: {
                ...mockOfflineEntry1,
              },
            },
            {
              node: {
                ...mockOnlineEntry1,
              },
            },
          ],
        },
      },
    },
  } as GetExperienceAndEntriesDetailViewQueryResult;

  it("sync offline experience - with createEntries errors", async () => {
    mockUseWithSubscriptionContext.mockReturnValue(withSubscriptionContext1);

    mockgetAndRemoveOfflineExperienceIdFromSyncFlag.mockReturnValue(
      mockOfflineExperienceId1,
    );

    mockGetCachedExperienceAndEntriesDetailView.mockReturnValue(
      mockGetCachedExperienceAndEntriesDetailView1,
    );

    const { ui } = makeComp();

    await act(async () => {
      // ebnisObject.logReducers = true;

      render(ui);
      expect(getById(syncErrorsNotificationId)).toBeNull();

      await waitFor(() => {
        expect(getById(syncErrorsNotificationId)).not.toBeNull();
      });

      expect(mockPutOfflineExperienceIdInSyncFlag).toBeCalled();
      expect(mockPersistFunc).toBeCalled();

      const calls0 = await waitForCount(() => {
        const x = mockWindowChangeUrl.mock.calls[0];
        return x;
      });

      const [path, type] = calls0;
      expect(path.includes(mockOnlineExperienceId1)).toBe(true);
      expect(type).toEqual(ChangeUrlType.replace);

      expect(mockCleanUpOfflineExperiences).toBeCalledWith({
        "fake-id": {},
      });
    });
  });

  const withSubscriptionContext2 = {
    onSyncData: {
      onlineExperienceUpdatedMap: {
        [mockOnlineExperienceId1]: {} as any,
      },
      onlineExperienceIdToOfflineEntriesMap: {
        [mockOnlineExperienceId1]: {} as any,
      },
      syncErrors: {
        [mockOnlineExperienceId1]: {
          ownFields: {
            __typename: "UpdateExperienceOwnFieldsError",
            title: "a",
          },
          definitions: {
            [mockOnlineDataDefinitionInteger1Id]: {
              __typename: "DefinitionError",
              id: mockOnlineDataDefinitionInteger1Id,
              name: "a",
              type: null,
              error: null,
            },
          },
          updateEntries: {
            1: {
              1: {
                meta: {
                  index: 0,
                  id: "1",
                },
                data: "a",
                error: null,
              } as DataObjectErrorFragment,
            },
          },
        },
      },
    } as OnSyncedData,
  };

  const mockGetCachedExperienceAndEntriesDetailView3 = {
    data: {
      getExperience: {
        ...mockOnlineExperience1,
      } as any,
      getEntries: {
        __typename: "GetEntriesSuccess",
        entries: {
          pageInfo: {},
          edges: [
            {
              node: {
                ...mockOnlineEntry1,
              },
            },
          ],
        },
      },
    },
  } as GetExperienceAndEntriesDetailViewQueryResult;

  it("sync online experience - with updateEntries and own fields errors", async () => {
    mockUseWithSubscriptionContext.mockReturnValue(withSubscriptionContext2);

    mockgetAndRemoveOfflineExperienceIdFromSyncFlag.mockReturnValue(
      mockOfflineExperienceId1,
    );

    mockGetCachedExperienceAndEntriesDetailView.mockReturnValue(
      mockGetCachedExperienceAndEntriesDetailView3,
    );

    const { ui } = makeComp();

    await act(async () => {
      render(ui);
      expect(getById(syncErrorsNotificationId)).toBeNull();

      await waitFor(() => {
        expect(getById(syncErrorsNotificationId)).not.toBeNull();
      });

      expect(mockCleanUpSyncedOfflineEntries).toBeCalled();

      expect(getById(closeSyncErrorsMsgBtnId)).toBeNull();

      const newEntryMenuEl = getOneByClass(newEntryMenuItemSelector);
      newEntryMenuEl.click();

      getById(closeSyncErrorsMsgBtnId).click();
      expect(getById(closeSyncErrorsMsgBtnId)).toBeNull();
    });
  });

  it("comments menu", async () => {
    mockUseWithSubscriptionContext.mockReturnValue({});

    mockGetCachedExperienceAndEntriesDetailView.mockReturnValue(
      mockGetCachedExperienceAndEntriesDetailView2,
    );

    const { ui } = makeComp();

    await act(async () => {
      render(ui);

      const showCommentsMenuEl = await waitFor(() => {
        const el = getById(showCommentsMenuId);
        expect(el).not.toBeNull();
        return el;
      });

      expect(getById(mockUpsertCommentsId)).toBeNull();
      expect(getById(hideCommentsMenuId)).toBeNull();

      showCommentsMenuEl.click();
      expect(getById(mockUpsertCommentsId)).not.toBeNull();
      expect(getById(showCommentsMenuId)).toBeNull();

      getById(hideCommentsMenuId).click();
      expect(getById(mockUpsertCommentsId)).toBeNull();
      expect(getById(hideCommentsMenuId)).toBeNull();
      expect(getById(showCommentsMenuId)).not.toBeNull();

      getById(createCommentsMenuId).click();
      getById(mockUpsertCommentsId).click();
      expect(getById(hideCommentsMenuId)).toBeNull();
      expect(getById(showCommentsMenuId)).toBeNull();

      getById(mockCloseUpsertCommentsId).click();
      expect(getById(hideCommentsMenuId)).not.toBeNull();

      const mockHideCommentsEl = getById(mockCommentsHideMenuId);
      mockHideCommentsEl.click();
      expect(getById(mockUpsertCommentsId)).not.toBeNull();

      // clicking any where on the page should send hide menu event to Comments
      getById(mockHeaderId).click();
      // we test that Comments component did indeed receive this message
      mockHideCommentsEl.click();
      expect(getById(mockUpsertCommentsId)).toBeNull();
    });
  });

  it("menu", async () => {
    mockUseWithSubscriptionContext.mockReturnValue({});

    mockGetCachedExperienceAndEntriesDetailView.mockReturnValue(
      mockGetCachedExperienceAndEntriesDetailView2,
    );

    const { ui } = makeComp();

    await act(async () => {
      render(ui);

      const menuTriggerEl = await waitFor(() => {
        const el = getOneByClass(menuTriggerSelector);
        expect(el).not.toBeNull();
        return el;
      });

      const menuEl = getOneByClass(menuSelector);
      expect(menuEl.classList).not.toContain(activeClassName);

      menuTriggerEl.click();
      expect(menuEl.classList).toContain(activeClassName);

      // menu can be closed by clicking any where on the page
      getById(mockHeaderId).click();
      expect(menuEl.classList).not.toContain(activeClassName);

      menuTriggerEl.click();
      expect(menuEl.classList).toContain(activeClassName);
      // menu can also be closed by toggling
      menuTriggerEl.click();
      expect(menuEl.classList).not.toContain(activeClassName);
    });
  });

  it("entries", async () => {
    mockUseWithSubscriptionContext.mockReturnValue({});

    mockGetCachedExperienceAndEntriesDetailView.mockReturnValue(
      mockGetCachedExperienceAndEntriesDetailView2,
    );

    const { ui } = makeComp();

    await act(async () => {
      render(ui);

      const newEntryMenuEl = await waitFor(() => {
        const el = getOneByClass(newEntryMenuItemSelector);
        expect(el).not.toBeNull();
        return el;
      });

      expect(getById(mockEntryMenuId)).toBeNull();
      newEntryMenuEl.click();
      expect(getById(mockEntryMenuId)).not.toBeNull();

      const menuEl = getOneByClass(menuSelector);
      expect(menuEl.classList).not.toContain(activeClassName);
      getOneByClass(menuTriggerSelector).click();
      expect(menuEl.classList).toContain(activeClassName);

      getById(mockNewEntryId).click();
      expect(menuEl.classList).not.toContain(activeClassName);
    });
  });
});

describe("reducers", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
  });

  const mockDispatchFn = jest.fn();
  const mockGetExperienceAndEntriesDetailView = jest.fn();

  const props = {
    componentTimeoutsMs,
    match: {
      params: {
        experienceId: mockOnlineExperienceId1,
      },
    },
    getExperienceAndEntriesDetailView: mockGetExperienceAndEntriesDetailView as any,
    deleteExperiences: mockDeleteExperiences as any,
    history,
  } as Props;

  const effectArgs = {
    dispatch: mockDispatchFn,
  } as EffectArgs;

  // TEST 1 mock data

  const syncErrors1 = {
    ownFields: {
      __typename: "UpdateExperienceOwnFieldsError",
      title: "a",
    },
    definitions: {
      [mockOnlineDataDefinitionInteger1Id]: {
        __typename: "DefinitionError",
        id: mockOnlineDataDefinitionInteger1Id,
        name: "a",
        type: null,
        error: null,
      },
    },
    updateEntries: {
      [mockOnlineEntry1Id]: {
        [mockOnlineDataObject1id]: {
          meta: {
            index: 0,
            id: mockOnlineDataObject1id,
          },
          data: "a",
          error: null,
        } as DataObjectErrorFragment,
      },
      [mockOnlineEntry2Id]: "a",
    },
    createEntries: {
      [mockOfflineEntry1Id]: {
        __typename: "CreateEntryError",
        error: "e",
      } as CreateEntryErrorFragment,
    },
  } as SyncErrors;

  const mockGetExperienceAndEntriesDetailView1 = {
    data: {
      getExperience: {
        ...mockOnlineExperience1,
      } as any,
      getEntries: {
        __typename: "GetEntriesSuccess",
        entries: {
          pageInfo: {},
          edges: [
            {
              node: {
                ...mockOnlineEntry1,
              },
            },
            {
              node: {
                ...mockOfflineEntry1,
              },
            },
            {
              node: {
                ...mockOnlineEntry2,
              },
            },
          ],
        },
      },
    },
  } as GetExperienceAndEntriesDetailViewQueryResult;

  it("fetches successfully with sync errors on retry", async () => {
    // ebnisObject.logReducers = true;
    mockGetSyncError.mockReturnValue(syncErrors1);

    // first time to fetch , there is not network
    mockGetIsConnected
      .mockReturnValueOnce(false)
      // So we try again
      .mockReturnValueOnce(true);

    const fetchState = initState();
    const e = getEffects<E, S>(fetchState)[0];

    mockGetExperienceAndEntriesDetailView.mockResolvedValue(
      mockGetExperienceAndEntriesDetailView1,
    );

    await effectFunctions[e.key](e.ownArgs as any, props, effectArgs);
    jest.runOnlyPendingTimers();
    await waitFor(() => true);

    const call = mockDispatchFn.mock.calls[0][0];
    expect(call.experienceData.entriesData.key).toEqual(StateValue.success);

    reducer(fetchState, call);
  });

  it("was never able to fetch after all retries", async () => {
    // first time to fetch , there is no network
    mockGetIsConnected
      .mockReturnValueOnce(false)
      // So we try again, but no network still - we will then fail
      .mockReturnValueOnce(false);

    const fetchState = initState();
    const e = getEffects<E, S>(fetchState)[0];

    mockGetExperienceAndEntriesDetailView.mockResolvedValue(
      {} as GetExperienceAndEntriesDetailViewQueryResult,
    );

    await effectFunctions[e.key](e.ownArgs as any, props, effectArgs);
    jest.runOnlyPendingTimers();
    await waitFor(() => true);

    const call = mockDispatchFn.mock.calls[0][0];
    expect(call.experienceData.key).toEqual(StateValue.errors);
  });

  it("fetch throws exception", async () => {
    mockGetIsConnected.mockReturnValueOnce(true);

    const fetchState = initState();
    const e = getEffects<E, S>(fetchState)[0];

    mockGetExperienceAndEntriesDetailView.mockRejectedValue(new Error("a"));

    await effectFunctions[e.key](e.ownArgs as any, props, effectArgs);
    await waitFor(() => true);

    const call = mockDispatchFn.mock.calls[0][0];
    expect(call.experienceData.key).toEqual(StateValue.errors);
  });

  const mockGetCachedExperienceAndEntriesDetailView1 = {
    data: {
      getExperience: {
        ...mockOnlineExperience1,
      } as any,
    },
  } as GetExperienceAndEntriesDetailViewQueryResult;

  it("cancels external delete request", async () => {
    // ebnisObject.logReducers = true;
    mockGetCachedExperienceAndEntriesDetailView.mockReturnValue(
      mockGetCachedExperienceAndEntriesDetailView1,
    );

    mockGetDeleteExperienceLedger.mockReturnValue({
      key: StateValue.requested,
    });

    const fetchState = initState();
    const fetchEffect = getEffects<E, S>(fetchState)[0];

    effectFunctions[fetchEffect.key](
      fetchEffect.ownArgs as any,
      props,
      effectArgs,
    );

    const deleteRequestedState = reducer(
      fetchState,
      mockDispatchFn.mock.calls[0][0],
    );

    const deleteRequestedEffect = getEffects<E, S>(deleteRequestedState)[0];

    mockDispatchFn.mockClear();
    expect(mockPutOrRemoveDeleteExperienceLedger).not.toBeCalled();

    effectFunctions[deleteRequestedEffect.key](
      deleteRequestedEffect.ownArgs as any,
      props,
      effectArgs,
    );

    expect(mockPutOrRemoveDeleteExperienceLedger).toBeCalled();

    const deleteEvent = mockDispatchFn.mock.calls[0][0];
    const deleteState = reducer(deleteRequestedState, deleteEvent);

    const deleteCancelledState = reducer(deleteState, {
      type: ActionType.delete,
      value: "cancelled",
    });

    const deleteCancelledEffect = getEffects<E, S>(deleteCancelledState)[0];

    mockPutOrRemoveDeleteExperienceLedger.mockClear();
    expect(mockHistoryPushFn).not.toBeCalled();

    effectFunctions[deleteCancelledEffect.key](
      deleteCancelledEffect.ownArgs as any,
      props,
      effectArgs,
    );

    expect(mockPutOrRemoveDeleteExperienceLedger.mock.calls[0][0]).toEqual({
      id: mockOnlineExperienceId1,
      key: StateValue.cancelled,
      title: mockOnlineExperience1.title,
    });

    expect(mockHistoryPushFn).toBeCalledWith(MY_URL);
  });

  const mockDeleteExperiences1Data = {
    data: {
      deleteExperiences: {
        experiences: [
          {
            __typename: "DeleteExperienceErrors",
            errors: {
              error: "e",
              it: null,
            },
          },
        ],
      },
    },
  };

  it("delete fails", async () => {
    // ebnisObject.logReducers = true;
    mockGetCachedExperienceAndEntriesDetailView.mockReturnValue(
      mockGetCachedExperienceAndEntriesDetailView1,
    );

    const fetchState = initState();
    const fetchEffect = getEffects<E, S>(fetchState)[0];

    effectFunctions[fetchEffect.key](
      fetchEffect.ownArgs as any,
      props,
      effectArgs,
    );

    const fetchedState = reducer(fetchState, mockDispatchFn.mock.calls[0][0]);

    const deleteRequestState = reducer(fetchedState, {
      type: ActionType.delete,
      value: "request",
    });

    const deleteConfirmedState = reducer(deleteRequestState, {
      type: ActionType.delete,
      value: "confirmed",
    });

    const deleteEffect = getEffects<E, S>(deleteConfirmedState)[0];

    mockDispatchFn.mockClear();
    mockDeleteExperiences.mockResolvedValue(mockDeleteExperiences1Data);

    await effectFunctions[deleteEffect.key](
      deleteEffect.ownArgs as any,
      props,
      effectArgs,
    );

    expect(mockDispatchFn.mock.calls[0][0].errors).toEqual([["error", "e"]]);

    mockDispatchFn.mockClear();
    mockDeleteExperiences.mockRejectedValueOnce(new Error("a"));

    await effectFunctions[deleteEffect.key](
      deleteEffect.ownArgs as any,
      props,
      effectArgs,
    );

    expect(mockDispatchFn.mock.calls[0][0].errors).toEqual([
      ["", GENERIC_SERVER_ERROR],
    ]);
  });
});

////////////////////////// HELPER FUNCTIONS ///////////////////////////

const DetailExperienceP = DetailExperience as ComponentType<Partial<Props>>;

function makeComp({
  props = {},
}: {
  props?: Partial<Props>;
} = {}) {
  const location = props.location || ({} as any);

  props.match = {
    params: {
      experienceId: mockOnlineExperienceId1,
    },
  } as Match;

  return {
    ui: (
      <DetailExperienceP
        location={location}
        history={history}
        componentTimeoutsMs={componentTimeoutsMs}
        updateExperiencesMutation={updateExperiencesMutation}
        deleteExperiences={deleteExperiences}
        getExperienceAndEntriesDetailView={getExperienceAndEntriesDetailView}
        {...props}
      />
    ),
  };
}
