import { GetEntriesDetailView } from "@eb/cm/src/graphql/apollo-types/GetEntriesDetailView";
import { emptyPageInfo } from "@eb/cm/src/graphql/utils.gql";
import { EbnisGlobals, StateValue } from "@eb/cm/src/utils/types";
import {
  mockOfflineEntry1,
  mockOnlineDataObject1,
  mockOnlineEntry1,
  mockOnlineEntry2,
  mockOnlineExperience1,
  mockOnlineExperienceId1,
} from "@eb/cm/src/__tests__/mock-data";
import { getEntriesDetailViewGqlMsw } from "@eb/cm/src/__tests__/msw-handlers";
import { mswServer, mswServerListen } from "@eb/cm/src/__tests__/msw-server";
import { componentTimeoutsMs } from "@eb/cm/src/__tests__/wait-for-count";
import { cleanup, render, waitFor } from "@testing-library/react";
import { ComponentType } from "react";
import { act } from "react-dom/test-utils";
import { makeApolloClient } from "../apollo/client";
import { useWithSubscriptionContext } from "../apollo/injectables";
import { Entries } from "../components/entries/entries.component";
import { Props } from "../components/entries/entries.utils";
import {
  dataValueSelector,
  entryUpdateMenuItemSelector,
} from "../components/Entry/entry.dom";
import { Props as UpsertEntryProps } from "../components/UpsertEntry/upsert-entry.utils";
import { getAllByClass, getById, getOneByClass } from "../tests.utils";
import { deleteObjectKey } from "../utils";
import { getEntriesDetailView } from "../utils/experience.gql.types";
import { updateExperiencesMutation } from "../utils/update-experiences.gql";

const mockUpsertEntryCloseId = "@t/mock-upsert-entry-close";
const mockUpdateEntrySuccessId = "@t/mock-update-entry-success";
let mockUpdatedEntry = {} as any;
const mockStateValue = StateValue;
jest.mock("../components/entries/entries.lazy", () => ({
  UpsertEntry: (props: UpsertEntryProps) => {
    const { onClose, onSuccess } = props;

    return (
      <div>
        <span id={mockUpsertEntryCloseId} onClick={onClose} />
        <span
          id={mockUpdateEntrySuccessId}
          onClick={() => {
            onSuccess(mockUpdatedEntry, mockStateValue.online);
          }}
        />
      </div>
    );
  },
}));

jest.mock("../apollo/injectables");
const mockUseWithSubscriptionContext = useWithSubscriptionContext as jest.Mock;

const mockLoadingId = "@t/loading";
jest.mock("../components/Loading/loading.component", () => {
  return () => <span id={mockLoadingId} />;
});

const ebnisObject = {} as EbnisGlobals;
const mockParentDispatch = jest.fn();

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

describe("component", () => {
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

  const getEntriesDetailViewGqlMsw1: GetEntriesDetailView = {
    getEntries: {
      __typename: "GetEntriesSuccess",
      entries: {
        __typename: "EntryConnection",
        pageInfo: {
          ...emptyPageInfo,
        },
        edges: [
          {
            __typename: "EntryEdge",
            node: {
              ...mockOfflineEntry1,
              experienceId: mockOnlineExperienceId1,
            },
            cursor: "",
          },
          {
            __typename: "EntryEdge",
            node: {
              ...mockOnlineEntry2,
            },
            cursor: "",
          },
        ],
      },
    },
  };

  it("update entry success", async () => {
    const { ui } = makeComp();

    mswServer.use(getEntriesDetailViewGqlMsw(getEntriesDetailViewGqlMsw1));

    mockUpdatedEntry = {
      ...mockOnlineEntry1,
      dataObjects: [
        {
          ...mockOnlineDataObject1,
          data: `{"integer":2}`,
        },
      ],
    };

    await act(async () => {
      // ebnisObject.logReducers = true;
      // ebnisObject.logApolloQueries = true;

      // When component is rendered
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { debug } = render(ui);

      // Task busy UI should be visible
      expect(getById(mockLoadingId)).not.toBeNull();

      // Trigger UpsertEntry Ui should not be visible
      expect(getOneByClass(entryUpdateMenuItemSelector)).toBeNull();

      // Trigger UpsertEntry Ui should be visible
      const triggerUpsertUiEl = await waitFor(() => {
        const el = getOneByClass(entryUpdateMenuItemSelector);
        expect(el).not.toBeNull();
        return el;
      });

      // Task busy UI should not be visible
      expect(getById(mockLoadingId)).toBeNull();

      // Upsert Ui should not be visible
      expect(getById(mockUpsertEntryCloseId)).toBeNull();

      // When trigger upsert Ui clicked
      triggerUpsertUiEl.click();

      // Upsert Ui should be visible
      // when clicked
      getById(mockUpsertEntryCloseId).click();

      // Upsert Ui should not be visible
      expect(getById(mockUpsertEntryCloseId)).toBeNull();

      // When trigger upsert Ui clicked
      triggerUpsertUiEl.click();

      // we confirm the data before edit
      let dataUis = getAllByClass(dataValueSelector);
      expect((dataUis.item(0) as HTMLElement).textContent).toContain("1");

      // when edit succeeds
      getById(mockUpdateEntrySuccessId).click();

      // new data should be displayed: 1 changed to 2
      dataUis = getAllByClass(dataValueSelector);
      expect((dataUis.item(0) as HTMLElement).textContent).not.toContain("1");
      expect((dataUis.item(0) as HTMLElement).textContent).toContain("2");
    });
  });
});

////////////////////////// HELPER FUNCTIONS ///////////////////////////

const EntriesP = Entries as ComponentType<Partial<Props>>;

function makeComp({ props = {} }: { props?: Partial<Props> } = {}) {
  return {
    ui: (
      <EntriesP
        experience={{
          ...mockOnlineExperience1,
        }}
        updateExperiencesMutation={updateExperiencesMutation}
        getEntriesDetailView={getEntriesDetailView}
        componentTimeoutsMs={componentTimeoutsMs}
        parentDispatch={mockParentDispatch}
        postActions={[]}
        {...props}
      />
    ),
  };
}
