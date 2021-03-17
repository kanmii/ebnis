/* eslint-disable @typescript-eslint/no-explicit-any */
import { CreateEntryErrorFragment } from "@eb/cm/src/graphql/apollo-types/CreateEntryErrorFragment";
import { DataObjectErrorFragment } from "@eb/cm/src/graphql/apollo-types/DataObjectErrorFragment";
import { DeleteExperiences } from "@eb/cm/src/graphql/apollo-types/DeleteExperiences";
import { ComponentTimeoutsMs } from "@eb/cm/src/utils/timers";
import { EbnisGlobals, OnSyncedData, StateValue } from "@eb/cm/src/utils/types";
import {
  mockOfflineExperience1,
  mockOfflineExperienceId1,
  mockOnlineDataDefinitionId1,
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
  // getDeleteExperienceLedger,
  putOrRemoveDeleteExperienceLedger,
} from "../apollo/delete-experience-cache";
import {
  // getCachedEntriesDetailView,
  getCachedExperienceAndEntriesDetailView,
} from "../apollo/get-detailed-experience-query";
import { useWithSubscriptionContext } from "../apollo/injectables";
import {
  getAndRemoveOfflineExperienceIdFromSyncFlag,
  // getSyncError,
  putOfflineExperienceIdInSyncFlag,
} from "../apollo/sync-to-server-cache";
import { removeUnsyncedExperiences } from "../apollo/unsynced-ledger";
import { DetailExperience } from "../components/DetailExperience/detail-experience.component";
import {
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
  Match,
  Props,
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
  // cleanUpOfflineExperiences,
  cleanUpSyncedOfflineEntries,
} from "../components/WithSubscriptions/with-subscriptions.utils";
import { getById, getOneByClass } from "../tests.utils";
import { deleteObjectKey } from "../utils";
import { getIsConnected } from "../utils/connections";
import { deleteExperiences } from "../utils/delete-experiences.gql";
import { GetExperienceAndEntriesDetailViewQueryResult } from "../utils/experience.gql.types";
import { ChangeUrlType, windowChangeUrl } from "../utils/global-window";
import { updateExperiencesMutation } from "../utils/update-experiences.gql";
import { MY_URL } from "../utils/urls";
import { activeClassName } from "../utils/utils.dom";

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
// const mockGetDeleteExperienceLedger = getDeleteExperienceLedger as jest.Mock;
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
    const x = postActions[0];

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
        {x && x.type === mockEntriesRemoteActionType.upsert && (
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
// const mockGetSyncError = getSyncError as jest.Mock;
const mockgetAndRemoveOfflineExperienceIdFromSyncFlag = getAndRemoveOfflineExperienceIdFromSyncFlag as jest.Mock;
const mockPutOfflineExperienceIdInSyncFlag = putOfflineExperienceIdInSyncFlag as jest.Mock;
// const mockPutOrRemoveSyncError = putOrRemoveSyncError as jest.Mock;

jest.mock("../components/WithSubscriptions/with-subscriptions.utils");
// const mockCleanUpOfflineExperiences = cleanUpOfflineExperiences as jest.Mock;
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

      return (
        <div className={mockNoTriggerDocumentEventClassName}>
          <span
            id={mockUpsertCommentsId}
            onClick={() => {
              const { type } = postActions[0];

              if (type === mockCommentRemoteActionType.upsert) {
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
              const x = postActions[0];

              if (!x) {
                return;
              }

              const { type } = x;

              if (type === mockCommentRemoteActionType.hide_menus) {
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

const componentTimeoutsMs: ComponentTimeoutsMs = {
  fetchRetries: [0],
  closeNotification: 0,
};

const ebnisObject = {
  persistor: {
    persist: mockPersistFunc as any,
  },
  // logApolloQueries: true,
  // logReducers: true,
} as EbnisGlobals;

beforeAll(() => {
  window.____ebnis = ebnisObject;
});

afterAll(() => {
  deleteObjectKey(window, "____ebnis");
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

    const { client, cache } = makeApolloClient({ testing: true });
    ebnisObject.cache = cache;
    ebnisObject.client = client;
  });

  afterEach(() => {
    mswServer.resetHandlers();
    cleanup();
    deleteObjectKey(ebnisObject, "client");
    deleteObjectKey(ebnisObject, "cache");
    jest.clearAllMocks();
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
      render(ui);

      const triggerUpdateUiEl = await waitFor(() => {
        const el = getById(updateMenuItemId);
        expect(el).not.toBeNull();
        return el;
      });

      expect(getById(mockUpsertCancelId)).toBeNull();

      triggerUpdateUiEl.click();
      getById(mockUpsertCancelId).click();
      expect(getById(mockUpsertCancelId)).toBeNull();

      expect(getById(mockUpsertSuccessId)).toBeNull();
      expect(getById(updateSuccessNotificationId)).toBeNull();
      triggerUpdateUiEl.click();
      getById(mockUpsertSuccessId).click();

      getById(updateSuccessNotificationId).click();

      expect(getById(updateSuccessNotificationId)).toBeNull();
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
      render(ui);

      const triggerDeleteUiEl = await waitFor(() => {
        const el = getById(deleteMenuItemId);
        expect(el).not.toBeNull();
        return el;
      });

      expect(getById(deleteHeaderCloseId)).toBeNull();

      triggerDeleteUiEl.click();

      getById(deleteHeaderCloseId).click();
      expect(getById(deleteHeaderCloseId)).toBeNull();

      expect(getById(deleteFooterCloseId)).toBeNull();

      triggerDeleteUiEl.click();

      getById(deleteFooterCloseId).click();
      expect(getById(deleteFooterCloseId)).toBeNull();

      triggerDeleteUiEl.click();
      getById(deleteOkId).click();

      const calls = await waitForCount(() => {
        const calls = mockHistoryPushFn.mock.calls[0];
        return calls;
      });

      expect(calls[0]).toBe(MY_URL);
      expect(mockPutOrRemoveDeleteExperienceLedger).toBeCalled();
      expect(mockRemoveUnsyncedExperiences).toBeCalled();
      expect(mockPersistFunc).toBeCalled();
    });
  });

  const withSubscriptionContext1 = {
    onSyncData: {
      offlineIdToOnlineExperienceMap: {
        [mockOfflineExperienceId1]: mockOnlineExperience1,
      },
      syncErrors: {
        [mockOfflineExperienceId1]: {
          createEntries: {
            1: {
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
        },
      },
    } as OnSyncedData,
  };

  const mockGetCachedExperienceAndEntriesDetailView1 = {
    data: {
      getExperience: {
        ...mockOfflineExperience1,
      } as any,
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
            [mockOnlineDataDefinitionId1]: {
              __typename: "DefinitionError",
              id: mockOnlineDataDefinitionId1,
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

  it("sync online experience - with updateEntries and own fields errors", async () => {
    mockUseWithSubscriptionContext.mockReturnValue(withSubscriptionContext2);

    mockgetAndRemoveOfflineExperienceIdFromSyncFlag.mockReturnValue(
      mockOfflineExperienceId1,
    );

    mockGetCachedExperienceAndEntriesDetailView.mockReturnValue(
      mockGetCachedExperienceAndEntriesDetailView2,
    );

    const { ui } = makeComp();

    await act(async () => {
      render(ui);
      expect(getById(syncErrorsNotificationId)).toBeNull();

      await waitFor(() => {
        expect(getById(syncErrorsNotificationId)).not.toBeNull();
      });

      expect(mockCleanUpSyncedOfflineEntries).toBeCalled();
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

////////////////////////// HELPER FUNCTIONS ///////////////////////////

const DetailExperienceP = DetailExperience as ComponentType<Partial<Props>>;

function makeComp({
  props = {},
}: {
  props?: Partial<Props>;
} = {}) {
  const location = props.location || ({} as any);
  const history = {
    push: mockHistoryPushFn,
  } as any;

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
        {...props}
      />
    ),
  };
}
