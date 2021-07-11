/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getExperienceAndEntriesDetailView,
  GetExperienceAndEntriesDetailViewQueryResult,
} from "@eb/shared/src/apollo/experience.gql.types";
import { updateExperiencesMutation } from "@eb/shared/src/apollo/update-experiences.gql";
import { makeApolloClient } from "@eb/shared/src/client";
import { ChangeUrlType } from "@eb/shared/src/global-window";
import { CreateEntryErrorFragment } from "@eb/shared/src/graphql/apollo-types/CreateEntryErrorFragment";
import { DataObjectErrorFragment } from "@eb/shared/src/graphql/apollo-types/DataObjectErrorFragment";
import { GetExperienceAndEntriesDetailView } from "@eb/shared/src/graphql/apollo-types/GetExperienceAndEntriesDetailView";
import {
  EbnisGlobals,
  OnSyncedData,
  StateValue,
  SyncErrors,
} from "@eb/shared/src/utils/types";
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
} from "@eb/shared/src/__tests__/mock-data";
import {
  deleteExperiencesMswGql,
  getExperienceAndEntriesDetailViewGqlMsw,
} from "@eb/shared/src/__tests__/msw-handlers";
import {
  mswServer,
  mswServerListen,
} from "@eb/shared/src/__tests__/msw-server";
import { componentTimeoutsMs } from "@eb/shared/src/__tests__/wait-for-count";
import { cleanup, render, waitFor } from "@testing-library/react";
import { ComponentType } from "react";
import { act } from "react-dom/test-utils";
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
import { getById, getEffects, getOneByClass } from "../tests.utils";
import { deleteObjectKey } from "../utils";
import { GENERIC_SERVER_ERROR } from "../utils/common-errors";
import { deleteExperiences } from "../utils/delete-experiences.gql";
import { MY_URL } from "../utils/urls";
import { activeClassName } from "../utils/utils.dom";

const mockUpsertSuccessId = "@t/upsert-success";
const mockUpsertFailId = "@t/upsert-fail";
const mockUpsertCancelId = "@t/upsert-cancel";
const mockLoadingId = "@t/loading";
const mockHeaderId = "@t/header";
const mockUpsertCommentsId = "@t/upsert-comments";
const mockCloseUpsertCommentsId = "@t/close-comments";
const mockCommentsHideMenuId = "@t/comments-hide-menu";
const mockNewEntryId = "@t/new-entry";
const mockEntryMenuId = "@t/entry-menu";

const mockWindowChangeUrl = jest.fn();
const mockUseWithSubscriptionContext = jest.fn();
const mockRemoveUnsyncedExperiences = jest.fn();
const mockGetCachedExperienceAndEntriesDetailView = jest.fn();
const mockClearTimeoutFn = jest.fn();
const mockGetDeleteExperienceLedger = jest.fn();
const mockPutOrRemoveDeleteExperienceLedger = jest.fn();
const mockGetIsConnected = jest.fn();
const mockGetSyncError = jest.fn();
const mockgetAndRemoveOfflineExperienceIdFromSyncFlag = jest.fn();
const mockMapOnlineExperienceIdToOfflineIdInSyncFlag = jest.fn();
const mockCleanUpOfflineExperiences = jest.fn();
const mockCleanUpSyncedOfflineEntries = jest.fn();
const mockHistoryPushFn = jest.fn();
const mockPersistFunc = jest.fn();
const mockDeleteExperiences = jest.fn();

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
  mswServerListen();
});

afterAll(() => {
  mswServer.close();
  deleteObjectKey(window, "____ebnis");
});

beforeEach(() => {
  const { client, cache } = makeApolloClient({
    ebnisGlobals: ebnisObject,
    testing: true,
  });
  ebnisObject.cache = cache;
  ebnisObject.client = client;
});

afterEach(() => {
  jest.clearAllMocks();
  ebnisObject.logApolloQueries = false;
  ebnisObject.logReducers = false;
  deleteObjectKey(ebnisObject, "client");
  deleteObjectKey(ebnisObject, "cache");
  mswServer.resetHandlers();
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
  });

  afterEach(() => {
    cleanup();
  });

  it("There is no retry prompt when experience successfully fetched from server", async () => {
    // 1

    mockGetIsConnected.mockReturnValue(true);

    // 2

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
      // ebnisObject.logReducers = true;
      // ebnisObject.logApolloQueries = true;

      // 3

      render(ui);

      // 4

      expect(getById(mockLoadingId)).not.toBeNull();

      // 5

      expect(getById(domPrefix)).toBeNull();

      // 6

      expect(getById(refetchId)).toBeNull();

      // 7

      await waitFor(() => {
        expect(getById(domPrefix)).not.toBeNull();
      });

      // 8

      expect(getById(mockLoadingId)).toBeNull();

      // 9

      expect(getById(refetchId)).toBeNull();
    });
  });

  it("Given fetching experience from server fails, when retry from cache succeeds, experience should be visible", async () => {
    // 1

    mockGetIsConnected.mockReturnValue(true);

    mswServer.use(
      getExperienceAndEntriesDetailViewGqlMsw({
        // 2

        getExperience: null, // causes failure
        getEntries: null,
      }),
    );

    const { ui } = makeComp();

    await act(async () => {
      // ebnisObject.logReducers = true;

      // 3

      render(ui);

      // 4

      expect(getById(mockLoadingId)).not.toBeNull();

      // 5

      expect(getById(domPrefix)).toBeNull();

      // 6

      expect(getById(refetchId)).toBeNull();

      // 7

      const retryEl = await waitFor(() => {
        const el = getById(refetchId);
        expect(el).not.toBeNull();
        return el;
      });

      // 8

      expect(getById(mockLoadingId)).toBeNull();

      // 9

      expect(getById(domPrefix)).toBeNull();

      // 10

      mockGetCachedExperienceAndEntriesDetailView.mockReturnValue(
        mockGetCachedExperienceAndEntriesDetailViewData,
      );

      // 11

      retryEl.click();

      // 12

      expect(getById(domPrefix)).toBeNull();

      // 13

      await waitFor(() => {
        expect(getById(domPrefix)).not.toBeNull();
      });

      // 14

      expect(getById(refetchId)).toBeNull();
    });
  });

  it("Close success notification automatically and manually when experience updated", async () => {
    // 1

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

      // 2

      render(ui);

      // 3

      const triggerUpdateUiEl = await waitFor(() => {
        const el = getById(updateMenuItemId);
        expect(el).not.toBeNull();
        return el;
      });

      // 4

      expect(getById(mockUpsertCancelId)).toBeNull();

      // 5

      triggerUpdateUiEl.click();

      // 6, 7

      getById(mockUpsertCancelId).click();

      // 8

      expect(getById(mockUpsertCancelId)).toBeNull();

      // 9

      triggerUpdateUiEl.click();

      // 10

      const x = getById(mockUpsertSuccessId);
      expect(x).not.toBeNull();

      // 11

      expect(getById(updateSuccessNotificationId)).toBeNull();

      // 12

      x.click();

      // 13

      expect(getById(mockUpsertSuccessId)).toBeNull();

      // 14, 15

      getById(updateSuccessNotificationId).click();

      // 16

      expect(getById(updateSuccessNotificationId)).toBeNull();

      // 17

      triggerUpdateUiEl.click();

      // 18

      getById(mockUpsertSuccessId).click();

      // 19

      expect(getById(updateSuccessNotificationId)).not.toBeNull();

      // 20

      await waitFor(() => {
        expect(getById(updateSuccessNotificationId)).toBeNull();
      });
    });
  });

  it("Delete experience success", async () => {
    // 1

    mockGetCachedExperienceAndEntriesDetailView.mockReturnValue({
      data: {
        getExperience: {
          ...mockOnlineExperience1,
        } as any,
      },
    } as GetExperienceAndEntriesDetailViewQueryResult);

    // 2

    mswServer.use(
      deleteExperiencesMswGql({
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
      }),
    );

    const { ui } = makeComp();

    await act(async () => {
      // ebnisObject.logReducers = true;
      // ebnisObject.logApolloQueries = true;

      // 3

      render(ui);

      // 4

      const triggerDeleteUiEl = await waitFor(() => {
        const el = getById(deleteMenuItemId);
        expect(el).not.toBeNull();
        return el;
      });

      // 5

      expect(getById(deleteHeaderCloseId)).toBeNull();

      // 6

      triggerDeleteUiEl.click();

      // 7, 8

      getById(deleteHeaderCloseId).click();

      // 9
      expect(getById(deleteHeaderCloseId)).toBeNull();

      // 10

      expect(getById(deleteFooterCloseId)).toBeNull();

      // 11

      triggerDeleteUiEl.click();

      // 12, 13

      getById(deleteFooterCloseId).click();

      // 14

      expect(getById(deleteFooterCloseId)).toBeNull();

      // 15

      triggerDeleteUiEl.click();

      // 16

      getById(deleteOkId).click();

      // 17

      expect(mockHistoryPushFn).not.toBeCalled();

      // 18

      await waitFor(() => {
        const calls = mockHistoryPushFn.mock.calls[0];
        expect(calls[0]).toBe(MY_URL);
      });

      // 19

      expect(mockPutOrRemoveDeleteExperienceLedger).toBeCalled();
      expect(mockRemoveUnsyncedExperiences).toBeCalled();
      expect(mockPersistFunc).toBeCalled();
    });
  });

  it("Delete experience failure notification can be closed manually", async () => {
    // 1

    mockGetCachedExperienceAndEntriesDetailView.mockReturnValue({
      data: {
        getExperience: {
          ...mockOnlineExperience1,
        } as any,
      },
    } as GetExperienceAndEntriesDetailViewQueryResult);

    // 2

    mswServer.use(
      deleteExperiencesMswGql({
        deleteExperiences: {
          __typename: "DeleteExperiencesAllFail",
          error: "a",
        },
      }),
    );

    const { ui } = makeComp();
    let cachedUnmount: any;

    await act(async () => {
      // ebnisObject.logReducers = true;
      // ebnisObject.logApolloQueries = true;

      // 3

      const { unmount } = render(ui);
      cachedUnmount = unmount;

      // 4

      const triggerDeleteUiEl = await waitFor(() => {
        const el = getById(deleteMenuItemId);
        expect(el).not.toBeNull();
        return el;
      });

      // 5

      expect(getById(deleteFailNotificationCloseId)).toBeNull();

      // 6

      triggerDeleteUiEl.click();

      // 7

      getById(deleteOkId).click();

      // 8

      const notificationEl = await waitFor(() => {
        const el = getById(deleteFailNotificationCloseId);
        expect(el).not.toBeNull();
        return el;
      });

      //  9

      notificationEl.click();

      // 10

      expect(getById(deleteFailNotificationCloseId)).toBeNull();

      // Timers will be cleared when component unmount

      expect(mockClearTimeoutFn).not.toBeCalled();
    });

    // timeouts should be cleared after component unmount
    expect(mockClearTimeoutFn).not.toBeCalled();
    cachedUnmount();
    expect(mockClearTimeoutFn).toBeCalled();
  });

  it("delete experience fails/automatically close notification", async () => {
    // 1

    mockGetCachedExperienceAndEntriesDetailView.mockReturnValue({
      data: {
        getExperience: {
          ...mockOnlineExperience1,
        } as any,
      },
    } as GetExperienceAndEntriesDetailViewQueryResult);

    // 2

    mockDeleteExperiences.mockResolvedValue({});

    const { ui } = makeComp({
      props: {
        deleteExperiences: mockDeleteExperiences,
      },
    });

    await act(async () => {
      // ebnisObject.logReducers = true;
      // ebnisObject.logApolloQueries = true;

      // 3

      render(ui);

      // 4

      const triggerDeleteUiEl = await waitFor(() => {
        const el = getById(deleteMenuItemId);
        expect(el).not.toBeNull();
        return el;
      });

      // 5

      expect(getById(deleteFailNotificationCloseId)).toBeNull();

      // 6

      triggerDeleteUiEl.click();

      // 7

      getById(deleteOkId).click();

      // 8

      await waitFor(() => {
        const el = getById(deleteFailNotificationCloseId);
        expect(el).not.toBeNull();
        return el;
      });

      // 9
      await waitFor(() => {
        expect(getById(deleteFailNotificationCloseId)).toBeNull();
      });
    });
  });

  it("Update cache and redirect user for successfully synced page and non page offline experiences. Show error notification for failed sync offline/part offline entries", async () => {
    mockGetCachedExperienceAndEntriesDetailView.mockReturnValue({
      data: {
        getExperience: {
          // 1

          ...mockOfflineExperience1,
        } as any,
        getEntries: {
          __typename: "GetEntriesSuccess",
          entries: {
            pageInfo: {},
            edges: [
              {
                // 2

                node: {
                  ...mockOfflineEntry1,
                },
              },
              {
                // 3

                node: {
                  ...mockOnlineEntry1,
                },
              },
            ],
          },
        },
      },
    } as GetExperienceAndEntriesDetailViewQueryResult);

    const nonPageOfflineExperienceId = "not-viewing-offline-experience-id";
    mockUseWithSubscriptionContext.mockReturnValue({
      onSyncData: {
        offlineIdToOnlineExperienceMap: {
          // 4 - offline experience has become online experience

          [mockOfflineExperienceId1]: mockOnlineExperience1,

          // 5

          [nonPageOfflineExperienceId]: {},
        },
        // 6 , 7

        syncErrors: {
          [mockOfflineExperienceId1]: {
            createEntries: {
              // 6

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
              // 7

              [mockOnlineEntry1Id]: "a",
            },
          },
        },
      } as OnSyncedData,
    });

    // 8

    mockgetAndRemoveOfflineExperienceIdFromSyncFlag.mockReturnValue(
      mockOfflineExperienceId1,
    );

    const { ui } = makeComp();

    await act(async () => {
      // ebnisObject.logReducers = true;
      // ebnisObject.logApolloQueries = true;

      // 9

      render(ui);

      // 10

      expect(getById(syncErrorsNotificationId)).toBeNull();

      // 11

      await waitFor(() => {
        expect(getById(syncErrorsNotificationId)).not.toBeNull();
      });

      // 12

      expect(mockMapOnlineExperienceIdToOfflineIdInSyncFlag).toBeCalled();
      expect(mockPersistFunc).toBeCalled();

      // 13

      const calls0 = await waitFor(() => {
        const calls = mockWindowChangeUrl.mock.calls;
        expect(calls).toHaveLength(1);
        const calls0 = calls[0];
        return calls0;
      });

      const [path, type] = calls0;
      expect(path.includes(mockOnlineExperienceId1)).toBe(true);
      expect(type).toEqual(ChangeUrlType.replace);

      // 15

      expect(mockCleanUpOfflineExperiences).toBeCalledWith({
        [nonPageOfflineExperienceId]: {},
      });
    });
  });

  it("Show error notification for failed syncing of updated experience. Prevent new entry creation until entry sync error fixed", async () => {
    mockGetCachedExperienceAndEntriesDetailView.mockReturnValue({
      data: {
        getExperience: {
          // 1

          ...mockOnlineExperience1,
        } as any,
        getEntries: {
          __typename: "GetEntriesSuccess",
          entries: {
            pageInfo: {},
            edges: [
              {
                // 2

                node: {
                  ...mockOnlineEntry1,
                },
              },
            ],
          },
        },
      },
    } as GetExperienceAndEntriesDetailViewQueryResult);

    mockUseWithSubscriptionContext.mockReturnValue({
      onSyncData: {
        onlineExperienceUpdatedMap: {
          // 3

          [mockOnlineExperienceId1]: {} as any,
        },
        onlineExperienceIdToOfflineEntriesMap: {
          // 4

          [mockOnlineExperienceId1]: {} as any,
        },
        syncErrors: {
          [mockOnlineExperienceId1]: {
            // 5

            ownFields: {
              __typename: "UpdateExperienceOwnFieldsError",
              title: "a",
            },
            // 6

            definitions: {
              [mockOnlineDataDefinitionInteger1Id]: {
                __typename: "DefinitionError",
                id: mockOnlineDataDefinitionInteger1Id,
                name: "a",
                type: null,
                error: null,
              },
            },
            // 7

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
    });

    // 8

    mockgetAndRemoveOfflineExperienceIdFromSyncFlag.mockReturnValue(
      mockOfflineExperienceId1,
    );

    const { ui } = makeComp();

    await act(async () => {
      // 9

      render(ui);

      // 10

      expect(getById(syncErrorsNotificationId)).toBeNull();

      // 11

      await waitFor(() => {
        expect(getById(syncErrorsNotificationId)).not.toBeNull();
      });

      // 13

      expect(mockCleanUpSyncedOfflineEntries).toBeCalled();

      // 14

      expect(getById(closeSyncErrorsMsgBtnId)).toBeNull();

      // 15

      getOneByClass(newEntryMenuItemSelector).click();

      // 16, 17

      getById(closeSyncErrorsMsgBtnId).click();

      // 18

      expect(getById(closeSyncErrorsMsgBtnId)).toBeNull();
    });
  });

  const mockGetCachedExperienceAndEntriesDetailViewData = {
    data: {
      getExperience: {
        ...mockOnlineExperience1,
      } as any,
    },
  } as GetExperienceAndEntriesDetailViewQueryResult;

  it("comments menu", async () => {
    mockUseWithSubscriptionContext.mockReturnValue({});

    mockGetCachedExperienceAndEntriesDetailView.mockReturnValue({
      data: {
        getExperience: {
          // 1

          ...mockOnlineExperience1,
        } as any,
      },
    } as GetExperienceAndEntriesDetailViewQueryResult);

    const { ui } = makeComp();

    await act(async () => {
      // 2

      render(ui);

      // 3

      const showCommentsMenuEl = await waitFor(() => {
        const el = getById(showCommentsMenuId);
        expect(el).not.toBeNull();
        return el;
      });

      // 4

      expect(getById(mockUpsertCommentsId)).toBeNull();

      // 5

      expect(getById(hideCommentsMenuId)).toBeNull();

      // 6

      showCommentsMenuEl.click();

      // 7

      expect(getById(mockUpsertCommentsId)).not.toBeNull();

      // 8

      expect(getById(showCommentsMenuId)).toBeNull();

      // 9, 10

      getById(hideCommentsMenuId).click();

      // 11

      expect(getById(mockUpsertCommentsId)).toBeNull();

      // 12

      expect(getById(hideCommentsMenuId)).toBeNull();

      // 13

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
      mockGetCachedExperienceAndEntriesDetailViewData,
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
      mockGetCachedExperienceAndEntriesDetailViewData,
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
    deleteExperiences: mockDeleteExperiences as any,
    getExperienceAndEntriesDetailViewInject:
      mockGetExperienceAndEntriesDetailView as any,
    history,
    getCachedExperienceAndEntriesDetailViewInject:
      mockGetCachedExperienceAndEntriesDetailView as any,
    getDeleteExperienceLedgerInject: mockGetDeleteExperienceLedger as any,
    putOrRemoveDeleteExperienceLedgerInject:
      mockPutOrRemoveDeleteExperienceLedger as any,
    getIsConnectedInject: mockGetIsConnected as any,
    getAndRemoveOfflineExperienceIdFromSyncFlagInject:
      mockgetAndRemoveOfflineExperienceIdFromSyncFlag as any,
    getSyncErrorInject: mockGetSyncError as any,
  } as Props;

  const effectArgs = {
    dispatch: mockDispatchFn,
  } as EffectArgs;

  const mockSyncErrorsData1 = {
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

  const a = {
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
  } as GetExperienceAndEntriesDetailView;

  const mockGetExperienceAndEntriesDetailView1 = {
    data: a,
  };

  it("fetches successfully with sync errors on retry", async () => {
    // ebnisObject.logReducers = true;
    // ebnisObject.logApolloQueries = true;

    mockGetSyncError.mockReturnValue(mockSyncErrorsData1);

    mockGetExperienceAndEntriesDetailView.mockResolvedValue(
      mockGetExperienceAndEntriesDetailView1,
    );

    // mswServer.use(getExperienceAndEntriesDetailViewGqlMsw(a));

    // first time to fetch , there is not network
    mockGetIsConnected
      .mockReturnValueOnce(false)
      // So we try again
      .mockReturnValueOnce(true);

    const fetchState = initState();
    const e = getEffects<E, S>(fetchState)[0];

    await effectFunctions[e.key](e.ownArgs as any, props, effectArgs);
    jest.runOnlyPendingTimers();
    await waitFor(() => true);

    const call = mockDispatchFn.mock.calls[0][0];
    expect(call.experienceData.entriesData.key).toEqual(StateValue.success);

    reducer(fetchState, call);
  });

  it("fetch throws exception", async () => {
    // ebnisObject.logReducers = true;
    ebnisObject.logApolloQueries = true;

    mockGetIsConnected.mockReturnValueOnce(true);
    mockGetExperienceAndEntriesDetailView.mockRejectedValue(new Error("a"));
    // mswServer.use(getExperienceAndEntriesDetailViewGqlMsw(a));

    const fetchState = initState();
    const e = getEffects<E, S>(fetchState)[0];

    await effectFunctions[e.key](e.ownArgs as any, props, effectArgs);
    jest.runOnlyPendingTimers();
    await waitFor(() => true);

    const call = mockDispatchFn.mock.calls[0][0];
    expect(call.experienceData.key).toEqual(StateValue.errors);
    expect(call.experienceData.error.message).toEqual("a");
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

  it("was never able to fetch after all retries", async () => {
    // first time to fetch , there is no network
    mockGetIsConnected
      .mockReturnValueOnce(false)
      // So we try again, but no network still - we will then fail
      .mockReturnValueOnce(false);

    const fetchState = initState();
    const e = getEffects<E, S>(fetchState)[0];

    await effectFunctions[e.key](e.ownArgs as any, props, effectArgs);
    jest.runOnlyPendingTimers();
    await waitFor(() => true);

    const call = mockDispatchFn.mock.calls[0][0];
    expect(call.experienceData.key).toEqual(StateValue.errors);
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
        getExperienceAndEntriesDetailViewInject={
          getExperienceAndEntriesDetailView
        }
        HeaderComponentFn={() => (<div id={mockHeaderId} />) as any}
        LoadingComponentInject={mockLoadingComponent}
        windowChangeUrlInject={mockWindowChangeUrl}
        useWithSubscriptionContextInject={mockUseWithSubscriptionContext}
        removeUnsyncedExperiencesInject={mockRemoveUnsyncedExperiences}
        getCachedExperienceAndEntriesDetailViewInject={
          mockGetCachedExperienceAndEntriesDetailView
        }
        clearTimeoutFnInject={mockClearTimeoutFn}
        getDeleteExperienceLedgerInject={mockGetDeleteExperienceLedger}
        putOrRemoveDeleteExperienceLedgerInject={
          mockPutOrRemoveDeleteExperienceLedger
        }
        getIsConnectedInject={mockGetIsConnected}
        mapOnlineExperienceIdToOfflineIdInSyncFlagInject={
          mockMapOnlineExperienceIdToOfflineIdInSyncFlag
        }
        getAndRemoveOfflineExperienceIdFromSyncFlagInject={
          mockgetAndRemoveOfflineExperienceIdFromSyncFlag
        }
        getSyncErrorInject={mockGetSyncError}
        cleanUpSyncedOfflineEntriesInject={mockCleanUpSyncedOfflineEntries}
        cleanUpOfflineExperiencesInject={mockCleanUpOfflineExperiences}
        UpsertExperienceInject={mockUpsertExperienceComponent as any}
        CommentsInject={mockCommentsComponent as any}
        EntriesInject={mockEntriesComponent as any}
        {...props}
      />
    ),
  };
}

function mockLoadingComponent() {
  return <div id={mockLoadingId} />;
}

function mockUpsertExperienceComponent(props: UpsertExperienceProps) {
  return (
    <div>
      <button
        id={mockUpsertSuccessId}
        onClick={() => {
          props.onSuccess(mockOnlineExperience1, StateValue.online);
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
}

function mockCommentsComponent(props: CommentsCallerProps) {
  const { postActions, parentDispatch } = props;
  const action0 = postActions[0];

  return (
    <div className={noTriggerDocumentEventClassName}>
      <span
        id={mockUpsertCommentsId}
        onClick={() => {
          if (action0 && action0.type === CommentRemoteActionType.upsert) {
            parentDispatch({
              type: ActionType.comment_action,
              action: {
                type: CommentRemoteActionType.upsert,
              },
            });
          }
        }}
      />
      <span
        id={mockCloseUpsertCommentsId}
        onClick={() => {
          parentDispatch({
            type: ActionType.comment_action,
            action: {
              type: CommentRemoteActionType.upsert_closed,
            },
          });
        }}
      />
      <span
        id={mockCommentsHideMenuId}
        onClick={() => {
          if (action0 && action0.type === CommentRemoteActionType.hide_menus) {
            parentDispatch({
              type: ActionType.comment_action,
              action: {
                type: CommentRemoteActionType.hide,
              },
            });
          }
        }}
      />
    </div>
  );
}

function mockEntriesComponent(props: EntriesCallerProps) {
  const { parentDispatch, postActions } = props;
  const action0 = postActions[0];

  return (
    <div>
      <span
        id={mockNewEntryId}
        onClick={() => {
          parentDispatch({
            type: ActionType.hide_menus,
            menus: ["mainCircular"],
          });
        }}
      />
      {action0 && action0.type === EntriesRemoteActionType.upsert && (
        <span id={mockEntryMenuId} />
      )}
    </div>
  );
}
