/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars*/
import React, { ComponentType } from "react";
import { render, cleanup, waitFor } from "@testing-library/react";
import { UpsertEntry } from "../components/UpsertEntry/upsert-entry.component";
import {
  Props,
  toISODateString,
  toISODatetimeString,
  reducer,
  ActionType,
  initState,
  GeneralEffect,
  effectFunctions,
  SubmissionErrors,
} from "../components/UpsertEntry/upsert-entry.utils";
import { defaultExperience, fillField } from "../tests.utils";
import { DataTypes } from "@ebnis/commons/src/graphql/apollo-types/globalTypes";
import { DataDefinitionFragment } from "@ebnis/commons/src/graphql/apollo-types/DataDefinitionFragment";
import {
  submitBtnDomId,
  notificationCloseId,
  fieldErrorSelector,
} from "../components/UpsertEntry/upsert-entry.dom";
import { getIsConnected } from "../utils/connections";
import { UpdateExperiencesOnlineMutationResult } from "../utils/experience.gql.types";
import { scrollIntoView } from "../utils/scroll-into-view";
import { createOfflineEntryMutation } from "../components/UpsertEntry/upsert-entry.resolvers";
import { AppPersistor } from "../utils/app-context";
import { GENERIC_SERVER_ERROR } from "../utils/common-errors";
import { E2EWindowObject, StateValue } from "../utils/types";
import { makeOfflineId } from "../utils/offlines";
import { ExperienceFragment } from "@ebnis/commons/src/graphql/apollo-types/ExperienceFragment";
import { EntryFragment } from "@ebnis/commons/src/graphql/apollo-types/EntryFragment";
import { CreateEntryErrorFragment } from "@ebnis/commons/src/graphql/apollo-types/CreateEntryErrorFragment";
import { deleteObjectKey } from "../utils";
// import { getExperienceQuery } from "../apollo/get-detailed-experience-query";
import { floatExperienceToTheTopInGetExperiencesMiniQuery } from "../apollo/update-get-experiences-mini-query";

jest.mock("../apollo/get-detailed-experience-query");

jest.mock("../apollo/update-get-experiences-mini-query");
const mockFloatExperienceToTheTopInGetExperiencesMiniQuery = floatExperienceToTheTopInGetExperiencesMiniQuery as jest.Mock;

jest.mock("../components/UpsertEntry/upsert-entry.resolvers");
const mockCreateOfflineEntry = createOfflineEntryMutation as jest.Mock;

jest.mock("../utils/scroll-into-view");
const mockScrollIntoView = scrollIntoView as jest.Mock;

jest.mock("../utils/connections");
const mockIsConnected = getIsConnected as jest.Mock;

jest.mock("../components/UpsertEntry/upsert-entry.injectables");

jest.mock("@ebnis/jsx/src/components/DateField/date-field.component", () => {
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
  "@ebnis/jsx/src/components/DateTimeField/date-time-field.component",
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
const mockUpdateExperiencesOnline = jest.fn();
const mockPersistFn = jest.fn();
const mockOnSuccess = jest.fn();
const mockOnClose = jest.fn();

const persistor = {
  persist: mockPersistFn as any,
} as AppPersistor;

const globals = {
  persistor,
  client: null as any,
} as E2EWindowObject;

beforeAll(() => {
  window.____ebnis = globals;
});

afterAll(() => {
  deleteObjectKey(window, "____ebnis");
});

afterEach(() => {
  cleanup();
  jest.resetAllMocks();
});

describe("component", () => {
  it("connected/renders date field/invalid server response", async () => {
    mockIsConnected.mockReturnValue(true);
    mockUpdateExperiencesOnline.mockResolvedValue({});

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
    render(ui);
    const inputEl = document.getElementById("1") as HTMLInputElement;
    const submitEl = document.getElementById(submitBtnDomId) as HTMLElement;
    const now = new Date();
    fillField(inputEl, now.toJSON());
    expect(getNotificationEl()).toBeNull();
    expect(mockScrollIntoView).not.toHaveBeenCalled();

    submitEl.click();

    await waitFor(() => true);
    const notificationEl = getNotificationEl();
    expect(mockScrollIntoView).toHaveBeenCalled();
    notificationEl.click();
    expect(getNotificationEl()).toBeNull();

    expect(
      mockUpdateExperiencesOnline.mock.calls[0][0].variables.input[0]
        .addEntries[0],
    ).toEqual({
      dataObjects: [
        {
          data: `{"date":"${toISODateString(now)}"}`,
          definitionId: "1",
        },
      ],
      experienceId: "1",
    });
  });

  it("connected/renders datetime field/javascript exception", async () => {
    mockIsConnected.mockReturnValue(true);
    mockUpdateExperiencesOnline.mockRejectedValue("a");

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
    render(ui);
    const inputEl = document.getElementById("1") as HTMLInputElement;
    const submitEl = document.getElementById(submitBtnDomId) as HTMLElement;
    const now = new Date().toJSON();
    fillField(inputEl, now);
    expect(getNotificationEl()).toBeNull();

    submitEl.click();
    await waitFor(getNotificationEl);
    expect(
      mockUpdateExperiencesOnline.mock.calls[0][0].variables.input[0]
        .addEntries[0],
    ).toEqual({
      dataObjects: [
        {
          data: `{"datetime":"${toISODatetimeString(now)}"}`,
          definitionId: "1",
        },
      ],
      experienceId: "1",
    });
  });

  it("connected/renders integer/server field errors/closes component", async () => {
    mockIsConnected.mockReturnValue(true);
    mockUpdateExperiencesOnline.mockResolvedValue({
      data: {
        updateExperiences: {
          __typename: "UpdateExperiencesSomeSuccess",
          experiences: [
            {
              __typename: "UpdateExperienceSomeSuccess",
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
              experience: {},
            },
          ],
        },
      },
    } as UpdateExperiencesOnlineMutationResult);

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
    render(ui);
    const inputEl = document.getElementById("1") as HTMLInputElement;
    const submitEl = document.getElementById(submitBtnDomId) as HTMLElement;
    fillField(inputEl, "1");
    expect(getNotificationEl()).toBeNull();
    expect(getFieldError()).toBeNull();

    submitEl.click();
    await waitFor(getNotificationEl);
    expect(getFieldError()).not.toBeNull();

    getCloseComponentEl().click();
    expect(
      mockUpdateExperiencesOnline.mock.calls[0][0].variables.input[0]
        .addEntries[0],
    ).toEqual({
      dataObjects: [
        {
          data: `{"integer":"1"}`,
          definitionId: "1",
        },
      ],
      experienceId: "1",
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

    mockUpdateExperiencesOnline.mockResolvedValue({
      data: {
        updateExperiences: {
          __typename: "UpdateExperiencesSomeSuccess",
          experiences: [
            {
              __typename: "UpdateExperienceSomeSuccess",
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
              experience: {},
            },
          ],
        },
      },
    } as UpdateExperiencesOnlineMutationResult);

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
        } as ExperienceFragment,
      },
    });

    render(ui);

    const inputEl = document.getElementById("1") as HTMLInputElement;
    expect(inputEl.value).toBe("1");
    const submitEl = document.getElementById(submitBtnDomId) as HTMLElement;
    fillField(inputEl, "2");
    expect(getNotificationEl()).toBeNull();
    expect(getFieldError()).toBeNull();

    submitEl.click();
    await waitFor(getNotificationEl);
    expect(getFieldError()).not.toBeNull();

    getCloseComponentEl().click();
    expect(
      mockUpdateExperiencesOnline.mock.calls[0][0].variables.input[0]
        .addEntries[0],
    ).toEqual({
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

  const props = ({
    updateExperiencesOnline: mockUpdateExperiencesOnline as any,
    experience: onlineExperience,
    onSuccess: mockOnSuccess,
    onClose: mockOnClose,
  } as unknown) as Props;

  it("sets decimal to default zero/connected/success", async () => {
    mockIsConnected.mockResolvedValue(true);

    let state = initState(props);

    state = reducer(state, {
      type: ActionType.ON_FORM_FIELD_CHANGED,
      fieldIndex: 0,
      value: "", // form value is empty
    });

    state = reducer(state, {
      type: ActionType.ON_SUBMIT,
    });

    const { key, ownArgs } = (state.effects
      .general as GeneralEffect).hasEffects.context.effects[0];

    mockUpdateExperiencesOnline.mockResolvedValue({
      data: {
        updateExperiences: {
          __typename: "UpdateExperiencesSomeSuccess",
          experiences: [
            {
              __typename: "UpdateExperienceSomeSuccess",
              entries: {
                newEntries: [
                  {
                    __typename: "CreateEntrySuccess",
                    entry: {},
                  },
                ],
              },
              experience: {},
            },
          ],
        },
      },
    } as UpdateExperiencesOnlineMutationResult);

    expect(mockPersistFn).not.toHaveBeenCalled();

    effectFunctions[key](ownArgs as any, props, effectArgs);
    await waitFor(() => true);
    expect(
      mockFloatExperienceToTheTopInGetExperiencesMiniQuery,
    ).toHaveBeenCalled();
    expect(mockUpdateExperiencesOnline).toHaveBeenCalled();
    expect(mockPersistFn).toHaveBeenCalled();
  });

  it("connected/server newEntries empty", async () => {
    mockIsConnected.mockResolvedValue(true);

    let state = initState(props);

    state = reducer(state, {
      type: ActionType.ON_SUBMIT,
    });

    const { key, ownArgs } = (state.effects
      .general as GeneralEffect).hasEffects.context.effects[0];

    mockUpdateExperiencesOnline.mockResolvedValue({
      data: {
        updateExperiences: {
          __typename: "UpdateExperiencesSomeSuccess",
          experiences: [
            {
              __typename: "UpdateExperienceSomeSuccess",
              entries: {
                newEntries: [] as any,
              },
            },
          ],
        },
      },
    } as UpdateExperiencesOnlineMutationResult);

    expect(mockDispatch).not.toHaveBeenCalled();

    effectFunctions[key](ownArgs as any, props, effectArgs);
    await waitFor(() => true);
    expect(mockPersistFn).not.toHaveBeenCalled();
    expect(mockDispatch.mock.calls[0][0].type).toBe(ActionType.ON_COMMON_ERROR);
  });

  it("server field errors no data objects errors", async () => {
    let state = initState(props);

    state = reducer(state, {
      type: ActionType.ON_CREATE_ENTRY_ERRORS,
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
      type: ActionType.ON_SUBMIT,
    });

    const { key, ownArgs } = (state.effects
      .general as GeneralEffect).hasEffects.context.effects[0];

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
        updateExperiencesOnline={mockUpdateExperiencesOnline}
        experience={experience}
        onSuccess={mockOnSuccess}
        onClose={mockOnClose}
      />
    ),
  };
}

function getNotificationEl() {
  return document.getElementById(notificationCloseId) as HTMLElement;
}

function getFieldError() {
  return document
    .getElementsByClassName(fieldErrorSelector)
    .item(0) as HTMLElement;
}

function getCloseComponentEl() {
  return document
    .getElementsByClassName("upsert-entry__delete")
    .item(0) as HTMLElement;
}
