/* eslint-disable @typescript-eslint/no-explicit-any */
import { CreateEntryErrorFragment } from "@eb/shared/src/graphql/apollo-types/CreateEntryErrorFragment";
import { DataDefinitionFragment } from "@eb/shared/src/graphql/apollo-types/DataDefinitionFragment";
import { EntryFragment } from "@eb/shared/src/graphql/apollo-types/EntryFragment";
import { ExperienceDFragment } from "@eb/shared/src/graphql/apollo-types/ExperienceDFragment";
import { DataTypes } from "@eb/shared/src/graphql/apollo-types/globalTypes";
import { UpsertEntryInjections } from "@eb/shared/src/injections";
import { toISODateString, toISODatetimeString } from "@eb/shared/src/utils";
import { makeOfflineId } from "@eb/shared/src/utils/offlines";
import { EbnisGlobals, StateValue } from "@eb/shared/src/utils/types";
import { cleanup, render, waitFor } from "@testing-library/react";
import React, { ComponentType } from "react";
import { act } from "react-dom/test-utils";
import { UpsertEntry } from "../components/UpsertEntry/upsert-entry.component";
import {
  closeId,
  fieldErrorSelector,
  notificationCloseId,
  submitBtnDomId,
} from "../components/UpsertEntry/upsert-entry.dom";
import {
  ActionType,
  effectFunctions,
  GeneralEffect,
  initState,
  Props,
  reducer,
  SubmissionErrors,
} from "../components/UpsertEntry/upsert-entry.utils";
import {
  defaultExperience,
  fillField,
  getById,
  getOneByClass,
} from "../tests.utils";
import { deleteObjectKey } from "../utils";
import { GENERIC_SERVER_ERROR } from "../utils/common-errors";
import { AppPersistor } from "../utils/react-app-context";

const mockUpdateExperiencesMutation = jest.fn();
const mockCreateOfflineEntry = jest.fn();
const mockScrollIntoView = jest.fn();
const mockIsConnected = jest.fn();

jest.mock("@eb/jsx/src/components/DateField/date-field.component", () => {
  return {
    DateField: ({ onChange, value, ...props }: any) => {
      return (
        <input
          type="text"
          {...props}
          value={value}
          onChange={(el) => {
            onChange(null, new Date(el.currentTarget.value));
          }}
        />
      );
    },
  };
});

jest.mock(
  "@eb/jsx/src/components/DateTimeField/date-time-field.component",
  () => {
    return {
      DateTimeField: ({ onChange, value, ...props }: any) => {
        const text = value.toJSON();
        return (
          <input
            type="text"
            {...props}
            value={text}
            onChange={(el) => {
              onChange(null, new Date(el.currentTarget.value));
            }}
          />
        );
      },
    };
  },
);

const mockDispatch = jest.fn();
const mockPersistFn = jest.fn();
const mockOnSuccess = jest.fn();
const mockOnClose = jest.fn();

const persistor = {
  persist: mockPersistFn as any,
} as AppPersistor;

const upsertEntryInjections: UpsertEntryInjections = {
  updateExperiencesMutationInject: mockUpdateExperiencesMutation,
  createOfflineEntryMutationInject: mockCreateOfflineEntry,
  scrollIntoViewInject: mockScrollIntoView,
  getIsConnectedInject: mockIsConnected,
};

const ebnisObject = {
  persistor,
  // client: null as any,
} as EbnisGlobals;

beforeAll(() => {
  window.____ebnis = ebnisObject;
});

afterAll(() => {
  deleteObjectKey(window, "____ebnis");
});

beforeEach(() => {
  ebnisObject.upsertEntryInjections = upsertEntryInjections;
});

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
  ebnisObject.logApolloQueries = false;
  ebnisObject.logReducers = false;
});

describe("component", () => {
  it("connected/renders date field/invalid server response", async () => {
    mockIsConnected.mockReturnValue(true);

    const { ui } = makeComp({
      props: {
        experience: {
          ...defaultExperience,
          dataDefinitions: [
            {
              id: "1",
              type: DataTypes.DATE,
              name: "a",
            },
          ] as DataDefinitionFragment[],
        },
      },
    });

    await act(async () => {
      // ebnisObject.logReducers = true;
      // ebnisObject.logApolloQueries = true;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { debug } = render(ui);

      const inputEl = document.getElementById("1") as HTMLInputElement;
      const now = new Date();
      fillField(inputEl, now.toJSON());

      expect(getNotificationEl()).toBeNull();
      expect(mockScrollIntoView).not.toHaveBeenCalled();

      const submitEl = document.getElementById(submitBtnDomId) as HTMLElement;
      submitEl.click();

      const args = await waitFor(() => {
        const c = mockUpdateExperiencesMutation.mock.calls[0][0];
        expect(c).toBeDefined();
        return c;
      });

      const { onError, input } = args;

      expect(input[0].addEntries[0]).toEqual({
        dataObjects: [
          {
            data: `{"date":"${toISODateString(now)}"}`,
            definitionId: "1",
          },
        ],
        experienceId: "1",
      });

      onError();

      // const notificationEl = getNotificationEl();
      const notificationEl = await waitFor(() => {
        const el = getNotificationEl();
        expect(el).not.toBeNull();
        return el;
      });

      await waitFor(() => {
        expect(mockScrollIntoView).toHaveBeenCalled();
      });

      notificationEl.click();
      expect(getNotificationEl()).toBeNull();
    });
  });

  it("connected/renders datetime field/javascript exception", async () => {
    mockIsConnected.mockReturnValue(true);

    const { ui } = makeComp({
      props: {
        experience: {
          ...defaultExperience,
          dataDefinitions: [
            {
              id: "1",
              type: DataTypes.DATETIME,
              name: "a",
            },
          ] as DataDefinitionFragment[],
        },
      },
    });

    await act(async () => {
      render(ui);
      const inputEl = document.getElementById("1") as HTMLInputElement;
      const now = new Date().toJSON();
      fillField(inputEl, now);
      expect(getNotificationEl()).toBeNull();

      const submitEl = document.getElementById(submitBtnDomId) as HTMLElement;
      submitEl.click();

      const args = await waitFor(() => {
        const c = mockUpdateExperiencesMutation.mock.calls[0][0];
        expect(c).toBeDefined();
        return c;
      });

      const { onError, input } = args;

      expect(input[0].addEntries[0]).toEqual({
        dataObjects: [
          {
            data: `{"datetime":"${toISODatetimeString(now)}"}`,
            definitionId: "1",
          },
        ],
        experienceId: "1",
      });

      onError("a");

      const notificationEl = await waitFor(getNotificationEl);
      expect(notificationEl).not.toBeNull();
    });
  });

  it("connected/renders integer/server field errors/closes component", async () => {
    mockIsConnected.mockReturnValue(true);

    const { ui } = makeComp({
      props: {
        experience: {
          ...defaultExperience,
          dataDefinitions: [
            {
              id: "1",
              type: DataTypes.INTEGER,
              name: "a",
            },
          ] as DataDefinitionFragment[],
        },
      },
    });

    await act(async () => {
      render(ui);

      const inputEl = document.getElementById("1") as HTMLInputElement;
      fillField(inputEl, "1");

      expect(getNotificationEl()).toBeNull();
      expect(getFieldError()).toBeNull();

      const submitEl = document.getElementById(submitBtnDomId) as HTMLElement;
      submitEl.click();

      const args = await waitFor(() => {
        const c = mockUpdateExperiencesMutation.mock.calls[0][0];
        expect(c).toBeDefined();
        return c;
      });

      const { onUpdateSuccess, input } = args;

      expect(input[0].addEntries[0]).toEqual({
        dataObjects: [
          {
            data: `{"integer":"1"}`,
            definitionId: "1",
          },
        ],
        experienceId: "1",
      });

      onUpdateSuccess({
        entries: {
          newEntries: [
            {
              __typename: "CreateEntryErrors",
              errors: {
                dataObjects: [
                  {
                    meta: {
                      index: 0,
                    },
                    clientId: "a",
                    definitionId: null,
                  },
                ],
              },
            },
          ],
        },
      });

      const notificationEl = await waitFor(getNotificationEl);
      expect(notificationEl).not.toBeNull();

      expect(getFieldError()).not.toBeNull();

      getCloseComponentEl().click();
    });
  });

  it("unconnected/renders single line text/javascript exception", async () => {
    mockIsConnected.mockReturnValue(false);
    mockCreateOfflineEntry.mockReturnValue(undefined);

    const { ui } = makeComp({
      props: {
        experience: {
          ...defaultExperience,
          dataDefinitions: [
            {
              id: "1",
              type: DataTypes.SINGLE_LINE_TEXT,
              name: "a",
            },
          ] as DataDefinitionFragment[],
        },
      },
    });
    render(ui);
    const inputEl = document.getElementById("1") as HTMLInputElement;
    const submitEl = document.getElementById(submitBtnDomId) as HTMLElement;
    fillField(inputEl, "b");
    expect(getNotificationEl()).toBeNull();

    submitEl.click();
    await waitFor(getNotificationEl);
    expect(mockCreateOfflineEntry.mock.calls[0][0].dataObjects[0].data).toEqual(
      `{"single_line_text":"b"}`,
    );
  });
  it("unconnected/renders multi line text/invalid response", async () => {
    mockIsConnected.mockReturnValue(false);
    mockCreateOfflineEntry.mockReturnValue(undefined);

    const { ui } = makeComp({
      props: {
        experience: {
          ...defaultExperience,
          dataDefinitions: [
            {
              id: "1",
              type: DataTypes.MULTI_LINE_TEXT,
              name: "a",
            },
          ] as DataDefinitionFragment[],
        },
      },
    });
    render(ui);
    const inputEl = document.getElementById("1") as HTMLInputElement;
    const submitEl = document.getElementById(submitBtnDomId) as HTMLElement;
    fillField(inputEl, "a");
    expect(getNotificationEl()).toBeNull();

    submitEl.click();
    await waitFor(getNotificationEl);
    expect(mockCreateOfflineEntry.mock.calls[0][0].dataObjects[0].data).toEqual(
      `{"multi_line_text":"a"}`,
    );
  });

  it("unconnected/renders decimal/ok", async () => {
    mockIsConnected.mockReturnValue(false);
    mockCreateOfflineEntry.mockReturnValue({
      entry: {},
    });

    const { ui } = makeComp({
      props: {
        experience: {
          ...defaultExperience,
          dataDefinitions: [
            {
              id: "1",
              type: DataTypes.DECIMAL,
              name: "a",
            },
          ] as DataDefinitionFragment[],
        },
      },
    });
    render(ui);
    const inputEl = document.getElementById("1") as HTMLInputElement;
    const submitEl = document.getElementById(submitBtnDomId) as HTMLElement;
    fillField(inputEl, "1.0");
    expect(mockPersistFn).not.toHaveBeenCalled();

    submitEl.click();
    await waitFor(() => true);
    expect(mockPersistFn).toHaveBeenCalled();

    expect(mockCreateOfflineEntry.mock.calls[0][0].dataObjects[0]).toEqual({
      data: `{"decimal":"1.0"}`,
      definitionId: "1",
    });
  });

  it("connected/edit entry", async () => {
    const now = new Date();
    const nowJson = now.toJSON();

    const updatingEntry = {
      entry: {
        id: "a",
        clientId: "a",
        dataObjects: [
          {
            id: "a1",
            data: `{"integer":1}`,
            definitionId: "1",
          },
          {
            id: "a2",
            data: `{"date":"${nowJson}"}`,
            definitionId: "2",
          },
        ],
      } as EntryFragment,
    };

    mockIsConnected.mockReturnValue(true);

    const { ui } = makeComp({
      props: {
        updatingEntry,
        experience: {
          ...defaultExperience,
          dataDefinitions: [
            {
              id: "1",
              type: DataTypes.INTEGER,
              name: "a",
            },
            {
              id: "2",
              type: DataTypes.DATE,
              name: "b",
            },
          ] as DataDefinitionFragment[],
        } as ExperienceDFragment,
      },
    });

    await act(async () => {
      render(ui);

      const inputEl = document.getElementById("1") as HTMLInputElement;
      expect(inputEl.value).toBe("1");

      fillField(inputEl, "2");
      expect(getNotificationEl()).toBeNull();
      expect(getFieldError()).toBeNull();

      const submitEl = document.getElementById(submitBtnDomId) as HTMLElement;
      submitEl.click();

      const args = await waitFor(() => {
        const c = mockUpdateExperiencesMutation.mock.calls[0][0];
        expect(c).toBeDefined();
        return c;
      });

      const { onUpdateSuccess, input } = args;

      onUpdateSuccess({
        entries: {
          newEntries: [
            {
              __typename: "CreateEntryErrors",
              errors: {
                dataObjects: [
                  {
                    meta: {
                      index: 0,
                    },
                    clientId: "a",
                    definitionId: null,
                  },
                ],
              },
            },
          ],
        },
      });

      expect(input[0].addEntries[0]).toEqual({
        clientId: "a",
        dataObjects: [
          {
            data: `{"integer":"2"}`,
            definitionId: "1",
          },
          {
            data: `{"date":"${toISODateString(now)}"}`,
            definitionId: "2",
          },
        ],
        experienceId: "1",
      });

      expect(getFieldError()).not.toBeNull();

      getCloseComponentEl().click();
    });
  });
});

describe("reducer", () => {
  const onlineExperience = {
    ...defaultExperience,
    dataDefinitions: [
      {
        id: "1",
        name: "a",
        type: DataTypes.DECIMAL,
      } as DataDefinitionFragment,
    ],
  };

  const offlineId = makeOfflineId("t");

  const offlineExperience = {
    ...onlineExperience,
    id: offlineId,
    clientId: offlineId,
  };

  const effectArgs = {
    dispatch: mockDispatch,
  };

  const props = {
    experience: onlineExperience,
    onSuccess: mockOnSuccess,
    onClose: mockOnClose,
  } as unknown as Props;

  it("sets decimal to default zero/connected/success", async () => {
    mockIsConnected.mockResolvedValue(true);

    let state = initState(props);

    state = reducer(state, {
      type: ActionType.on_form_field_changed,
      fieldIndex: 0,
      value: "", // form value is empty
    });

    state = reducer(state, {
      type: ActionType.submit,
    });

    const { key, ownArgs } = (state.effects.general as GeneralEffect).hasEffects
      .context.effects[0];

    expect(mockPersistFn).not.toHaveBeenCalled();

    effectFunctions[key](ownArgs as any, props, effectArgs);
    await waitFor(() => true);

    const { onUpdateSuccess } = mockUpdateExperiencesMutation.mock.calls[0][0];

    onUpdateSuccess({
      entries: {
        newEntries: [
          {
            __typename: "CreateEntrySuccess",
            entry: {},
          },
        ],
      },
    });

    expect(mockPersistFn).toHaveBeenCalled();
  });

  it("connected/server newEntries empty", async () => {
    mockIsConnected.mockResolvedValue(true);

    let state = initState(props);

    state = reducer(state, {
      type: ActionType.submit,
    });

    const { key, ownArgs } = (state.effects.general as GeneralEffect).hasEffects
      .context.effects[0];

    expect(mockDispatch).not.toHaveBeenCalled();

    effectFunctions[key](ownArgs as any, props, effectArgs);

    await waitFor(() => true);

    expect(mockPersistFn).not.toHaveBeenCalled();

    const { onUpdateSuccess } = mockUpdateExperiencesMutation.mock.calls[0][0];

    onUpdateSuccess({
      entries: {
        newEntries: [],
      },
    });

    expect(mockDispatch.mock.calls[0][0].type).toBe(ActionType.on_common_error);
  });

  it("server field errors no data objects errors", async () => {
    let state = initState(props);

    state = reducer(state, {
      type: ActionType.on_upsert_errors,
    } as any);

    expect(
      (state.states.submission as SubmissionErrors).errors.context.errors,
    ).toBe(GENERIC_SERVER_ERROR);
  });

  it("updates completely offline entry", async () => {
    const thisProps = {
      ...props,
      experience: offlineExperience,
      updatingEntry: {
        entry: {
          id: "a",
          clientId: "a",
          dataObjects: [
            {
              id: "a1",
              data: `{"decimal":1}`,
              definitionId: "1",
            },
          ],
        } as EntryFragment,
        errors: {} as CreateEntryErrorFragment,
      },
    };

    let state = initState(thisProps);

    state = reducer(state, {
      type: ActionType.submit,
    });

    const { key, ownArgs } = (state.effects.general as GeneralEffect).hasEffects
      .context.effects[0];

    mockCreateOfflineEntry.mockReturnValue({
      entry: {},
    });

    await effectFunctions[key](ownArgs as any, thisProps, effectArgs);

    expect(mockOnSuccess.mock.calls[0][1]).toBe(StateValue.offline);
  });
});

////////////////////////// HELPER FUNCTIONS ///////////////////////////

const UpsertEntryP = UpsertEntry as ComponentType<Partial<Props>>;

function makeComp({ props = {} }: { props?: Partial<Props> } = {}) {
  const experience = props.experience || defaultExperience;

  return {
    ui: (
      <UpsertEntryP
        {...props}
        experience={experience}
        onSuccess={mockOnSuccess}
        onClose={mockOnClose}
      />
    ),
  };
}

function getNotificationEl() {
  return getById(notificationCloseId);
}

function getFieldError() {
  return getOneByClass(fieldErrorSelector);
}

function getCloseComponentEl() {
  return getById(closeId);
}
