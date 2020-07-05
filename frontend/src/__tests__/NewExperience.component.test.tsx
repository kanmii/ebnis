/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { ComponentType } from "react";
import { render, cleanup, waitForElement, wait } from "@testing-library/react";
import { NewExperience } from "../components/NewExperience/new-experience.component";
import {
  Props,
  reducer,
  initState,
  effectFunctions,
  ActionType,
  EffectArgs,
  StateMachine,
  ChangedState,
  FieldInValid,
  FormInValid,
  SubmissionCommonErrors,
  EffectState,
} from "../components/NewExperience/new-experience.utils";
import {
  submitDomId,
  notificationCloseId,
  titleInputDomId,
  fieldErrorSelector,
  definitionContainerDomSelector,
  definitionNameFormControlSelector,
  definitionTypeFormControlSelector,
  resetDomId,
  descriptionInputDomId,
  addDefinitionSelector,
  moveUpDefinitionSelector,
  moveDownDefinitionSelector,
  removeDefinitionSelector,
  disposeComponentDomId,
} from "../components/NewExperience/new-experience.dom";
import { warningClassName, errorClassName } from "../utils/utils.dom";
import { fillField } from "../tests.utils";
import { DataTypes } from "../graphql/apollo-types/globalTypes";
import { isConnected } from "../utils/connections";
import { CreateExperiencesMutationResult } from "../utils/experience.gql.types";
import { windowChangeUrl } from "../utils/global-window";
import { AppPersistor } from "../utils/app-context";
import { scrollIntoView } from "../utils/scroll-into-view";
import { CreateExperiences_createExperiences_CreateExperienceErrors_errors } from "../graphql/apollo-types/CreateExperiences";
import { CreateExperienceOfflineMutationResult } from "../components/NewExperience/new-experience.resolvers";
import { E2EWindowObject } from "../utils/types";

jest.mock("../components/NewExperience/new-experience.injectables");

jest.mock("../utils/connections");
const mockIsConnected = isConnected as jest.Mock;

jest.mock("../utils/global-window");
const mockWindowChangeUrl = windowChangeUrl as jest.Mock;

jest.mock("../utils/scroll-into-view");
const mockScrollIntoView = scrollIntoView as jest.Mock;

const mockParentDispatch = jest.fn();
const mockDispatch = jest.fn();
const mockCreateOfflineExperience = jest.fn();
const mockCreateExperiencesOnline = jest.fn();
const mockPersistFn = jest.fn();
const persistor = {
  persist: mockPersistFn as any,
} as AppPersistor;

const globals = {
  persistor,
  client: {} as any,
} as E2EWindowObject;

beforeAll(() => {
  window.____ebnis = globals;
});

afterAll(() => {
  delete window.____ebnis;
});

afterEach(() => {
  cleanup();
  jest.resetAllMocks();
});

const formFieldErrorClass = "form__field--errors";
const formControlHiddenClass = "form__control--hidden";
const descriptionToggleClassName = "form__label-description-toggle";
const descriptionHideClass = "form__label-description-hide";
const descriptionShowClass = "form__label-description-show";

describe("components", () => {
  it("submit empty form/reset/form errors/success", async () => {
    const { ui } = makeComp();
    render(ui);

    const descriptionInputEl = getDescriptionInputEl();
    // description control is initially revealed
    expect(descriptionInputEl.classList).not.toContain(formControlHiddenClass);
    const descriptionToggleEl = getDescriptionToggleEl();

    expect(
      descriptionToggleEl.getElementsByClassName(descriptionShowClass).item(0),
    ).toBeNull();

    expect(
      descriptionToggleEl.getElementsByClassName(descriptionHideClass).item(0),
    ).not.toBeNull();

    // hide
    descriptionToggleEl.click();

    expect(descriptionInputEl.classList).toContain(formControlHiddenClass);

    // we are hiding already, hide icon should not be visible
    expect(
      descriptionToggleEl.getElementsByClassName(descriptionHideClass).item(0),
    ).toBeNull();

    // show description icon should be visible
    expect(
      descriptionToggleEl.getElementsByClassName(descriptionShowClass).item(0),
    ).not.toBeNull();

    // show - so we can complete it
    descriptionToggleEl.click();
    // we are already showing, so show icon is not visible
    expect(
      descriptionToggleEl.getElementsByClassName(descriptionShowClass).item(0),
    ).toBeNull();
    // hide icon should be visible so we can hide
    expect(
      descriptionToggleEl.getElementsByClassName(descriptionShowClass).item(0),
    ).toBeNull();

    expect(getNotificationCloseEl()).toBeNull();

    // title should not contain errors
    const titleInputEl = getTitleInputEl();
    const titleInputParentFieldEl = getParentFieldEl(titleInputEl);

    expect(titleInputParentFieldEl.classList).not.toContain(
      formFieldErrorClass,
    );

    expect(getFieldErrorEl(titleInputParentFieldEl)).toBeNull();

    // definition 0 should not contain error
    let definitionsEls = getDefinitionContainerEls();
    const definition0El = definitionsEls.item(0) as HTMLElement;
    const definition0NameEl = getDefinitionNameControlEl(definition0El);
    const definition0NameFieldEl = getParentFieldEl(definition0NameEl);
    const definition0TypeEl = getDefinitionTypeControlEl(definition0El);
    const definition0TypeFieldEl = getParentFieldEl(definition0TypeEl);
    expect(getFieldErrorEl(definition0NameFieldEl)).toBeNull();
    expect(getFieldErrorEl(definition0TypeFieldEl)).toBeNull();

    expect(definition0NameFieldEl.classList).not.toContain(formFieldErrorClass);
    expect(definition0TypeFieldEl.classList).not.toContain(formFieldErrorClass);

    // we submit an empty form
    const submitEl = getSubmitEl();
    submitEl.click();
    let notificationCloseEl = getNotificationCloseEl();
    let notificationEl = getNotificationEl(notificationCloseEl);
    expect(notificationEl.classList).toContain(warningClassName);

    // form field errors
    expect(titleInputParentFieldEl.classList).toContain(formFieldErrorClass);
    expect(getFieldErrorEl(titleInputParentFieldEl)).not.toBeNull();
    expect(getFieldErrorEl(definition0NameFieldEl)).not.toBeNull();
    expect(getFieldErrorEl(definition0TypeFieldEl)).not.toBeNull();
    expect(definition0NameFieldEl.classList).toContain(formFieldErrorClass);
    expect(definition0TypeFieldEl.classList).toContain(formFieldErrorClass);

    // we should be able to fill form even when there are errors
    fillField(titleInputEl, "tt");
    fillField(descriptionInputEl, "dd");
    fillField(definition0NameEl, "nn");
    fillField(definition0TypeEl, DataTypes.DATE);

    expect(titleInputEl.value).toBe("tt");
    expect(descriptionInputEl.value).toEqual("dd");
    expect(definition0NameEl.value).toBe("nn");
    expect(definition0TypeEl.value).toBe(DataTypes.DATE);

    // hide - it should be revealed when reset button is invoked
    descriptionToggleEl.click();
    expect(descriptionInputEl.classList).toContain(formControlHiddenClass);

    const resetEl = getResetEl();
    resetEl.click();

    // hitting reset button should clear all errors and all form field values
    expect(titleInputEl.value).toBe("");
    expect(descriptionInputEl.value).toEqual("");
    expect(definition0NameEl.value).toBe("");
    expect(definition0TypeEl.value).toBe("");

    expect(titleInputParentFieldEl.classList).not.toContain(
      formFieldErrorClass,
    );

    expect(getFieldErrorEl(titleInputParentFieldEl)).toBeNull();
    expect(getFieldErrorEl(definition0NameFieldEl)).toBeNull();
    expect(getFieldErrorEl(definition0TypeFieldEl)).toBeNull();
    expect(definition0NameFieldEl.classList).not.toContain(formFieldErrorClass);
    expect(definition0TypeFieldEl.classList).not.toContain(formFieldErrorClass);
    // description should be revealed
    expect(descriptionInputEl.classList).not.toContain(formControlHiddenClass);
    // and close notification
    expect(getNotificationCloseEl()).toBeNull();

    // let's complete the form and submit
    fillField(titleInputEl, "tt");
    fillField(descriptionInputEl, "dd");
    fillField(definition0NameEl, "nn");
    fillField(definition0TypeEl, DataTypes.DATE);

    // we are connected
    mockIsConnected.mockReturnValue(true);

    const serverResponse1 = {
      data: {
        createExperiences: [
          {
            __typename: "CreateExperienceErrors",
            errors: {
              title: "a",
              dataDefinitions: [
                {
                  index: 0,
                  name: "n",
                  type: "t",
                },
              ],
              error: "a",
              user: "",
            },
          },
        ],
      },
    } as CreateExperiencesMutationResult;

    mockCreateExperiencesOnline.mockResolvedValue(serverResponse1);

    submitEl.click();

    notificationCloseEl = await waitForElement(getNotificationCloseEl);
    notificationEl = getNotificationEl(notificationCloseEl);
    expect(notificationEl.classList).toContain(errorClassName);
    notificationCloseEl.click();
    expect(getNotificationCloseEl()).toBeNull();

    // form field errors
    expect(titleInputParentFieldEl.classList).toContain(formFieldErrorClass);
    expect(getFieldErrorEl(titleInputParentFieldEl)).not.toBeNull();
    expect(getFieldErrorEl(definition0NameFieldEl)).not.toBeNull();
    expect(getFieldErrorEl(definition0TypeFieldEl)).not.toBeNull();
    expect(definition0NameFieldEl.classList).toContain(formFieldErrorClass);
    expect(definition0TypeFieldEl.classList).toContain(formFieldErrorClass);

    //  javascript exceptions during submission
    mockCreateExperiencesOnline.mockRejectedValue(new Error("a"));
    submitEl.click();
    notificationCloseEl = await waitForElement(getNotificationCloseEl);
    notificationEl = getNotificationEl(notificationCloseEl);
    expect(notificationEl.classList).toContain(errorClassName);

    const serverResponse3 = {
      data: {
        createExperiences: [
          {
            __typename: "ExperienceSuccess",
            experience: {},
          },
        ],
      },
    } as CreateExperiencesMutationResult;

    mockCreateExperiencesOnline.mockReset();
    mockCreateExperiencesOnline.mockResolvedValue(serverResponse3);

    // we can not navigate away without success
    expect(mockWindowChangeUrl).not.toHaveBeenCalled();
    expect(mockPersistFn).not.toHaveBeenCalled();

    submitEl.click();
    await wait(() => true);
    expect(mockWindowChangeUrl).toHaveBeenCalled();
    expect(mockPersistFn).toHaveBeenCalled();
    expect(
      mockCreateExperiencesOnline.mock.calls[0][0].variables.input[0],
    ).toEqual({
      dataDefinitions: [
        {
          name: "nn",
          type: DataTypes.DATE,
        },
      ],
      title: "tt",
      description: "dd",
    });

    // add/remove/move definitions

    // add
    mockScrollIntoView.mockReset();
    (definition0El
      .getElementsByClassName(addDefinitionSelector)
      .item(0) as HTMLElement).click();

    await wait(() => true);

    definitionsEls = getDefinitionContainerEls();
    const definition1El = definitionsEls.item(1) as HTMLElement;
    expect(mockScrollIntoView.mock.calls[0][0]).toEqual(definition1El.id);

    // up
    mockScrollIntoView.mockReset();
    (definition1El
      .getElementsByClassName(moveUpDefinitionSelector)
      .item(0) as HTMLElement).click();

    await wait(() => true);
    definitionsEls = getDefinitionContainerEls();
    expect(mockScrollIntoView.mock.calls[0][0]).toEqual(definition1El.id);
    expect(definitionsEls.item(0)).toBe(definition1El);
    expect(definitionsEls.item(1)).toBe(definition0El);

    // down
    mockScrollIntoView.mockReset();
    (definition1El
      .getElementsByClassName(moveDownDefinitionSelector)
      .item(0) as HTMLElement).click();

    await wait(() => true);
    definitionsEls = getDefinitionContainerEls();
    expect(mockScrollIntoView.mock.calls[0][0]).toEqual(definition1El.id);
    expect(definitionsEls.item(0)).toBe(definition0El);
    expect(definitionsEls.item(1)).toBe(definition1El);

    // remove
    mockScrollIntoView.mockReset();
    (definition1El
      .getElementsByClassName(removeDefinitionSelector)
      .item(0) as HTMLElement).click();

    await wait(() => true);
    expect(mockScrollIntoView.mock.calls[0][0]).toEqual(definition0El.id);
    definitionsEls = getDefinitionContainerEls();
    expect(definitionsEls.length).toBe(1);

    expect(mockParentDispatch).not.toHaveBeenCalled();
    getDisposeEl().click();
    expect(mockParentDispatch).toHaveBeenCalled();
  });
});

describe("reducer", () => {
  it("submits offline: success", async () => {
    mockIsConnected.mockReturnValue(false);

    let state = initState();
    state = formChangedTitle(state, "tt");
    state = formChangedDefinition(state, 0, "00", "name");
    state = formChangedDefinition(state, 0, DataTypes.DATE, "type");

    state = reducer(state, {
      type: ActionType.SUBMISSION,
    });

    const props = {
      createExperienceOffline: mockCreateOfflineExperience as any,
    } as Props;

    const effectArgs = {
      dispatch: mockDispatch,
    } as EffectArgs;

    const effect = (state.effects.general as EffectState).hasEffects.context
      .effects[0];

    const effectFn = effectFunctions[effect.key];

    mockCreateOfflineExperience.mockResolvedValue({
      data: {
        createOfflineExperience: {
          experience: {
            id: "1",
          },
        },
      },
    });

    expect(mockWindowChangeUrl).not.toHaveBeenCalled();
    expect(mockPersistFn).not.toHaveBeenCalled();
    effectFn(effect.ownArgs as any, props, effectArgs);
    await wait(() => true);

    expect(mockWindowChangeUrl).toHaveBeenCalled();
    expect(mockPersistFn).toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();

    expect(
      mockCreateOfflineExperience.mock.calls[0][0].variables.input[0],
    ).toEqual({
      title: "tt",
      dataDefinitions: [
        {
          name: "00",
          type: DataTypes.DATE,
        },
      ],
    });
  });

  it("submits offline: invalid response", async () => {
    mockIsConnected.mockReturnValue(false);

    let state = initState();
    state = formChangedTitle(state, "tt");
    state = formChangedDefinition(state, 0, "00", "name");
    state = formChangedDefinition(state, 0, DataTypes.DATE, "type");

    state = reducer(state, {
      type: ActionType.SUBMISSION,
    });

    const props = {
      createExperienceOffline: mockCreateOfflineExperience as any,
    } as Props;

    const effectArgs = {
      dispatch: mockDispatch,
    } as EffectArgs;

    const effect = (state.effects.general as EffectState).hasEffects.context
      .effects[0];

    const effectFn = effectFunctions[effect.key];

    mockCreateOfflineExperience.mockResolvedValue({
      data: {},
    });

    expect(mockDispatch).not.toHaveBeenCalled();
    effectFn(effect.ownArgs as any, props, effectArgs);
    await wait(() => true);

    expect(mockWindowChangeUrl).not.toHaveBeenCalled();
    expect(mockPersistFn).not.toHaveBeenCalled();
    expect(mockDispatch.mock.calls[0][0].type).toEqual(
      ActionType.ON_COMMON_ERROR,
    );
  });

  it("submits offline: field errors", async () => {
    mockIsConnected.mockReturnValue(false);

    let state = initState();
    state = formChangedTitle(state, "tt");
    state = formChangedDefinition(state, 0, "00", "name");
    state = formChangedDefinition(state, 0, DataTypes.DATE, "type");

    state = reducer(state, {
      type: ActionType.SUBMISSION,
    });

    const props = {
      createExperienceOffline: mockCreateOfflineExperience as any,
    } as Props;

    const effectArgs = {
      dispatch: mockDispatch,
    } as EffectArgs;

    const effect = (state.effects.general as EffectState).hasEffects.context
      .effects[0];

    const effectFn = effectFunctions[effect.key];

    mockCreateOfflineExperience.mockResolvedValue({
      data: {
        createOfflineExperience: {
          __typename: "CreateExperienceErrors",
          errors: {
            title: "a",
          },
        },
      },
    } as CreateExperienceOfflineMutationResult);

    expect(mockDispatch).not.toHaveBeenCalled();
    effectFn(effect.ownArgs as any, props, effectArgs);
    await wait(() => true);

    expect(mockWindowChangeUrl).not.toHaveBeenCalled();
    expect(mockPersistFn).not.toHaveBeenCalled();
    expect(mockDispatch.mock.calls[0][0]).toEqual({
      type: ActionType.ON_SERVER_ERRORS,
      errors: {
        title: "a",
      },
    });
  });

  it("submits online: invalid server response", async () => {
    mockIsConnected.mockReturnValue(true);

    let state = initState();
    state = formChangedTitle(state, "tt");
    state = formChangedDefinition(state, 0, "00", "name");
    state = formChangedDefinition(state, 0, DataTypes.DATE, "type");

    state = reducer(state, {
      type: ActionType.SUBMISSION,
    });

    const props = {
      createExperiences: mockCreateExperiencesOnline as any,
    } as Props;

    const effectArgs = {
      dispatch: mockDispatch,
    } as EffectArgs;

    const effect = (state.effects.general as EffectState).hasEffects.context
      .effects[0];

    const effectFn = effectFunctions[effect.key];

    mockCreateExperiencesOnline.mockResolvedValue({
      data: {},
    });

    expect(mockDispatch).not.toHaveBeenCalled();
    effectFn(effect.ownArgs as any, props, effectArgs);
    await wait(() => true);

    expect(mockDispatch.mock.calls[0][0].type).toEqual(
      ActionType.ON_COMMON_ERROR,
    );
  });

  it("server only field errors", () => {
    let state = initState();
    let commonErrors = (state.states.submission as SubmissionCommonErrors)
      .commonErrors;
    expect(commonErrors).not.toBeDefined();

    state = reducer(state, {
      type: ActionType.ON_SERVER_ERRORS,
      errors: {
        title: "a",
      } as CreateExperiences_createExperiences_CreateExperienceErrors_errors,
    });

    let formValidity = state.states.form.validity as FormInValid;
    expect(formValidity.invalid).not.toBeDefined();

    commonErrors = (state.states.submission as SubmissionCommonErrors)
      .commonErrors;
    expect(commonErrors).toBeDefined();
  });

  it("definition names must be unique", () => {
    let state = initState();
    state = formChangedTitle(state, "t"); // must be at least 2 chars
    state = formChangedDefinition(state, 0, "00", "name");
    state = formChangedDefinition(state, 0, DataTypes.DATE, "type");

    let definitionsStates = state.states.form.fields.dataDefinitions;
    let defsList = Object.values(definitionsStates);
    expect(defsList.length).toBe(1);

    state = reducer(state, {
      type: ActionType.ADD_DEFINITION,
      data: defsList[0],
    });

    state = formChangedDefinition(state, 1, "00", "name"); // same name as 0
    state = formChangedDefinition(state, 1, DataTypes.DATETIME, "type");
    definitionsStates = state.states.form.fields.dataDefinitions;
    defsList = Object.values(definitionsStates);
    expect(defsList.length).toBe(2);
    let def1 = defsList[1];
    let def1NameState = def1.name;

    expect(
      ((def1NameState.states as ChangedState).changed.states as FieldInValid)
        .invalid,
    ).toBeUndefined();

    let titleState = state.states.form.fields.title;
    expect(
      ((titleState.states as ChangedState).changed.states as FieldInValid)
        .invalid,
    ).toBeUndefined();

    state = reducer(state, {
      type: ActionType.SUBMISSION,
    });

    definitionsStates = state.states.form.fields.dataDefinitions;
    defsList = Object.values(definitionsStates);
    expect(defsList.length).toBe(2);
    def1 = defsList[1];
    def1NameState = def1.name;

    expect(
      ((def1NameState.states as ChangedState).changed.states as FieldInValid)
        .invalid,
    ).toBeDefined();

    titleState = state.states.form.fields.title;

    expect(
      ((titleState.states as ChangedState).changed.states as FieldInValid)
        .invalid,
    ).toBeDefined();
  });

  it("remove definition from the middle", () => {
    let state = initState();

    let defsList = defsStatesToList(state);
    expect(defsList.length).toBe(1);

    state = reducer(state, {
      type: ActionType.ADD_DEFINITION,
      data: defsList[0],
    });

    defsList = defsStatesToList(state);
    const def10 = defsList[1];

    state = reducer(state, {
      type: ActionType.ADD_DEFINITION,
      data: def10,
    });

    state = reducer(state, {
      type: ActionType.REMOVE_DEFINITION,
      data: def10,
    });

    const { ownArgs } = (state.effects.general as EffectState).hasEffects
      .context.effects[0] as any;

    defsList = defsStatesToList(state);
    const def11 = defsList[1];
    expect(ownArgs.id).toEqual(def11.id);
    expect(ownArgs.id).not.toEqual(def10.id);
  });
});

////////////////////////// HELPER FUNCTIONS ///////////////////////////

const NewExperienceP = NewExperience as ComponentType<Partial<Props>>;

function makeComp({ props = {} }: { props?: Partial<{}> } = {}) {
  return {
    ui: (
      <NewExperienceP
        createExperiences={mockCreateExperiencesOnline}
        createExperienceOffline={mockCreateOfflineExperience}
        myDispatch={mockParentDispatch}
        {...props}
      />
    ),
  };
}

function getSubmitEl() {
  return document.getElementById(submitDomId) as HTMLElement;
}

function getNotificationCloseEl() {
  return document.getElementById(notificationCloseId) as HTMLElement;
}

function getNotificationEl(notificationCloseEl: HTMLElement) {
  return notificationCloseEl.closest(".notification") as HTMLElement;
}

function getTitleInputEl() {
  return document.getElementById(titleInputDomId) as HTMLInputElement;
}

function getParentFieldEl(childEl: HTMLElement) {
  return childEl.closest(".field") as HTMLElement;
}

function getFieldErrorEl(container: HTMLElement) {
  return container
    .getElementsByClassName(fieldErrorSelector)
    .item(0) as HTMLElement;
}

function getDefinitionContainerEls() {
  return document.getElementsByClassName(definitionContainerDomSelector);
}

function getDefinitionNameControlEl(container: HTMLElement) {
  return container
    .getElementsByClassName(definitionNameFormControlSelector)
    .item(0) as HTMLInputElement;
}

function getDefinitionTypeControlEl(container: HTMLElement) {
  return container
    .getElementsByClassName(definitionTypeFormControlSelector)
    .item(0) as HTMLInputElement;
}

function getDescriptionInputEl() {
  return document.getElementById(descriptionInputDomId) as HTMLInputElement;
}

function getDescriptionToggleEl() {
  return document
    .getElementsByClassName(descriptionToggleClassName)
    .item(0) as HTMLElement;
}

function getResetEl() {
  return document.getElementById(resetDomId) as HTMLElement;
}

function formChangedTitle(state: StateMachine, value: string) {
  return reducer(state, {
    type: ActionType.FORM_CHANGED,
    key: "non-def",
    value,
    fieldName: "title",
  });
}

function formChangedDefinition(
  state: StateMachine,
  index: number,
  value: string,
  type: "name" | "type",
) {
  return reducer(state, {
    type: ActionType.FORM_CHANGED,
    key: "def",
    index,
    value,
    fieldName: type,
  });
}

function defsStatesToList(state: StateMachine) {
  return Object.values(state.states.form.fields.dataDefinitions);
}

function getDisposeEl() {
  return document.getElementById(disposeComponentDomId) as HTMLElement;
}
