/* eslint-disable @typescript-eslint/no-explicit-any */
import { CreateExperiencesMutationResult } from "@eb/shared/src/apollo/create-experience-online-mutation-fn";
import { GetExperienceQueryResult } from "@eb/shared/src/apollo/experience.gql.types";
import { CreateExperiences_createExperiences_CreateExperienceErrors_errors } from "@eb/shared/src/graphql/apollo-types/CreateExperiences";
import { ExperienceDFragment } from "@eb/shared/src/graphql/apollo-types/ExperienceDFragment";
import {
  CreateExperienceInput,
  DataTypes,
} from "@eb/shared/src/graphql/apollo-types/globalTypes";
import { UpsertExperienceInjections } from "@eb/shared/src/injections";
import { makeOfflineId } from "@eb/shared/src/utils/offlines";
import { Any, EbnisGlobals, StateValue } from "@eb/shared/src/utils/types";
import { cleanup, render, waitFor } from "@testing-library/react";
import { ComponentType } from "react";
import { act } from "react-dom/test-utils";
import { UpsertExperience } from "../components/UpsertExperience/upsert-experience.component";
import {
  addDefinitionSelector,
  commentInputDomId,
  definitionContainerDomSelector,
  definitionNameFormControlSelector,
  definitionTypeFormControlSelector,
  descriptionHideSelector,
  descriptionInputDomId,
  descriptionShowSelector,
  descriptionToggleSelector,
  disposeComponentDomId,
  fieldErrorIndicatorSelector,
  fieldErrorSelector,
  fieldSelector,
  hiddenSelector,
  moveDownDefinitionSelector,
  moveUpDefinitionSelector,
  notificationCloseId,
  notificationElementSelector,
  removeDefinitionSelector,
  resetDomId,
  submitDomId,
  titleInputDomId,
} from "../components/UpsertExperience/upsert-experience.dom";
import {
  ActionType,
  ChangedState,
  EffectArgs,
  effectFunctions,
  EffectState,
  FieldInValid,
  FormInValid,
  initState,
  Props,
  reducer,
  StateMachine,
  SubmissionCommonErrors,
} from "../components/UpsertExperience/upsert-experience.utils";
import { fillField, getById } from "../tests.utils";
import { deleteObjectKey } from "../utils";
import { AppPersistor } from "../utils/react-app-context";
import { errorClassName, warningClassName } from "../utils/utils.dom";

const mockCreateOfflineExperience = jest.fn();
const mockUpdateExperienceOfflineFn = jest.fn();
const mockGetEntriesQuerySuccess = jest.fn();
const mockFetchExperienceDetailView = jest.fn();
const mockManuallyGetDataObjects = jest.fn();
const mockUpdateExperiencesMutation = jest.fn();
const mockIsConnected = jest.fn();
const mockWindowChangeUrl = jest.fn();
const mockScrollIntoView = jest.fn();
const mockOnClose = jest.fn();
const mockOnError = jest.fn();
const mockOnSuccess = jest.fn();
const mockDispatch = jest.fn();
const mockCreateExperiencesOnline = jest.fn();
const mockPersistFn = jest.fn();

const persistor = {
  persist: mockPersistFn as any,
} as AppPersistor;

const upsertExperienceInjections: UpsertExperienceInjections = {
  getExperienceDetailViewInject: mockFetchExperienceDetailView,
  getGetDataObjectsInject: mockManuallyGetDataObjects,
  createOfflineExperienceInject: mockCreateOfflineExperience,
  updateExperienceOfflineFnInject: mockUpdateExperienceOfflineFn,
  getCachedEntriesDetailViewSuccessInject: mockGetEntriesQuerySuccess,
  updateExperiencesMutationInject: mockUpdateExperiencesMutation,
  getIsConnectedInject: mockIsConnected,
  windowChangeUrlInject: mockWindowChangeUrl,
  scrollIntoViewInject: mockScrollIntoView,
  createExperienceOnlineMutationInject: mockCreateExperiencesOnline,
};

const ebnisGlobals = {
  persistor,
  client: {} as any,
} as EbnisGlobals;

beforeAll(() => {
  window.____ebnis = ebnisGlobals;
});

afterAll(() => {
  deleteObjectKey(window, "____ebnis");
});

beforeEach(() => {
  ebnisGlobals.upsertExperienceInjections = upsertExperienceInjections;
});

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

const onlineExperienceId = "1";
const onlineTitle = "aa";
const nameValue = "bb";
const onlineExperience = {
  id: onlineExperienceId,
  title: onlineTitle,
  dataDefinitions: [
    {
      id: "1",
      name: nameValue,
      type: DataTypes.INTEGER,
    },
  ],
} as ExperienceDFragment;

const offlineExperienceId = makeOfflineId(".");
const offlineExperience = {
  ...onlineExperience,
  id: offlineExperienceId,
  clientId: offlineExperienceId,
};

describe("components", () => {
  it("create experience/submit empty form/reset/form errors/success", async () => {
    const { ui } = makeComp();

    // 1

    render(ui);

    // 2

    const descriptionInputEl = getDescriptionInputEl();
    expect(descriptionInputEl.classList).not.toContain(hiddenSelector);

    // 3

    const descriptionToggleEl = getDescriptionToggleEl();

    expect(
      descriptionToggleEl
        .getElementsByClassName(descriptionShowSelector)
        .item(0),
    ).toBeNull();

    // 4

    expect(
      descriptionToggleEl
        .getElementsByClassName(descriptionHideSelector)
        .item(0),
    ).not.toBeNull();

    // 5

    descriptionToggleEl.click();

    // 6

    expect(descriptionInputEl.classList).toContain(hiddenSelector);

    // 7

    expect(
      descriptionToggleEl
        .getElementsByClassName(descriptionHideSelector)
        .item(0),
    ).toBeNull();

    // 8

    expect(
      descriptionToggleEl
        .getElementsByClassName(descriptionShowSelector)
        .item(0),
    ).not.toBeNull();

    // 9

    descriptionToggleEl.click();

    // 10

    expect(
      descriptionToggleEl
        .getElementsByClassName(descriptionShowSelector)
        .item(0),
    ).toBeNull();

    // 11

    expect(
      descriptionToggleEl
        .getElementsByClassName(descriptionShowSelector)
        .item(0),
    ).toBeNull();

    // 12

    const titleInputEl = getTitleInputEl();
    const titleInputParentFieldEl = getParentFieldEl(titleInputEl);

    expect(titleInputParentFieldEl.classList).not.toContain(
      fieldErrorIndicatorSelector,
    );

    expect(getFieldErrorEl(titleInputParentFieldEl)).toBeNull();

    // 13

    let definitionsEls = getDefinitionContainerEls();
    const definition0El = definitionsEls.item(0) as HTMLElement;
    const definition0NameEl = getDefinitionNameControlEl(definition0El);
    const definition0NameFieldEl = getParentFieldEl(definition0NameEl);
    const definition0TypeEl = getDefinitionTypeControlEl(definition0El);
    const definition0TypeFieldEl = getParentFieldEl(definition0TypeEl);
    expect(getFieldErrorEl(definition0NameFieldEl)).toBeNull();
    expect(getFieldErrorEl(definition0TypeFieldEl)).toBeNull();

    expect(definition0NameFieldEl.classList).not.toContain(
      fieldErrorIndicatorSelector,
    );
    expect(definition0TypeFieldEl.classList).not.toContain(
      fieldErrorIndicatorSelector,
    );

    // 14

    expect(getNotificationCloseEl()).toBeNull();

    // 15

    const submitEl = getSubmitEl();
    submitEl.click();

    let notificationCloseEl = getNotificationCloseEl();
    let notificationEl = getNotificationEl(notificationCloseEl);

    // 16

    expect(notificationEl.classList).toContain(warningClassName);

    // 17

    expect(titleInputParentFieldEl.classList).toContain(
      fieldErrorIndicatorSelector,
    );
    expect(getFieldErrorEl(titleInputParentFieldEl)).not.toBeNull();

    // 18

    expect(getFieldErrorEl(definition0NameFieldEl)).not.toBeNull();
    expect(getFieldErrorEl(definition0TypeFieldEl)).not.toBeNull();
    expect(definition0NameFieldEl.classList).toContain(
      fieldErrorIndicatorSelector,
    );
    expect(definition0TypeFieldEl.classList).toContain(
      fieldErrorIndicatorSelector,
    );

    // 19

    fillField(titleInputEl, "tt");

    // 20

    fillField(descriptionInputEl, "dd");

    // 21

    fillField(definition0NameEl, "nn");

    // 22

    fillField(definition0TypeEl, DataTypes.DATE);

    // 23

    expect(titleInputEl.value).toBe("tt");
    expect(descriptionInputEl.value).toEqual("dd");
    expect(definition0NameEl.value).toBe("nn");
    expect(definition0TypeEl.value).toBe(DataTypes.DATE);

    // 24 - hiding description field here is to show that description field is
    // always revealed when form is reset

    descriptionToggleEl.click();

    // 25

    expect(descriptionInputEl.classList).toContain(hiddenSelector);

    // 26

    const resetEl = getResetEl();
    resetEl.click();

    // 27

    expect(titleInputEl.value).toBe("");
    expect(descriptionInputEl.value).toEqual("");
    expect(definition0NameEl.value).toBe("");
    expect(definition0TypeEl.value).toBe("");

    // 28

    expect(titleInputParentFieldEl.classList).not.toContain(
      fieldErrorIndicatorSelector,
    );

    expect(getFieldErrorEl(titleInputParentFieldEl)).toBeNull();
    expect(getFieldErrorEl(definition0NameFieldEl)).toBeNull();
    expect(getFieldErrorEl(definition0TypeFieldEl)).toBeNull();
    expect(definition0NameFieldEl.classList).not.toContain(
      fieldErrorIndicatorSelector,
    );
    expect(definition0TypeFieldEl.classList).not.toContain(
      fieldErrorIndicatorSelector,
    );

    // 29

    expect(descriptionInputEl.classList).not.toContain(hiddenSelector);

    // 30

    expect(getNotificationCloseEl()).toBeNull();

    // 31

    fillField(titleInputEl, "tt");
    fillField(descriptionInputEl, "dd");
    fillField(definition0NameEl, "nn");
    fillField(definition0TypeEl, DataTypes.DATE);

    // 32

    mockIsConnected.mockReturnValue(true);

    // 33

    mockCreateExperiencesOnline.mockResolvedValue({
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
    } as CreateExperiencesMutationResult);

    // 34

    expect(getNotificationCloseEl()).toBeNull();

    // 35

    submitEl.click();

    // 36

    notificationCloseEl = await waitFor(() => {
      const el = getNotificationCloseEl();
      expect(el).not.toBeNull();
      return el;
    });

    notificationEl = getNotificationEl(notificationCloseEl);
    expect(notificationEl.classList).toContain(errorClassName);

    // 37
    expect(titleInputParentFieldEl.classList).toContain(
      fieldErrorIndicatorSelector,
    );
    expect(getFieldErrorEl(titleInputParentFieldEl)).not.toBeNull();
    expect(getFieldErrorEl(definition0NameFieldEl)).not.toBeNull();
    expect(getFieldErrorEl(definition0TypeFieldEl)).not.toBeNull();
    expect(definition0NameFieldEl.classList).toContain(
      fieldErrorIndicatorSelector,
    );
    expect(definition0TypeFieldEl.classList).toContain(
      fieldErrorIndicatorSelector,
    );

    // 38

    expect(mockScrollIntoView).toHaveBeenCalled();
    mockScrollIntoView.mockClear();

    // 39

    notificationCloseEl.click();

    // 40

    expect(getNotificationCloseEl()).toBeNull();

    //  41

    mockCreateExperiencesOnline.mockRejectedValue(new Error("a"));

    // 42

    submitEl.click();

    // 43

    notificationCloseEl = await waitFor(() => {
      const el = getNotificationCloseEl();
      expect(el).not.toBeNull();
      return el;
    });

    notificationEl = getNotificationEl(notificationCloseEl);
    expect(notificationEl.classList).toContain(errorClassName);

    // 44

    mockCreateExperiencesOnline.mockClear();
    mockCreateExperiencesOnline.mockResolvedValue({
      data: {
        createExperiences: [
          {
            __typename: "ExperienceSuccess",
            experience: {},
          },
        ],
      },
    } as CreateExperiencesMutationResult);

    // 45

    expect(mockWindowChangeUrl).not.toHaveBeenCalled();

    // 46

    expect(mockPersistFn).not.toHaveBeenCalled();

    // 47

    submitEl.click();

    // 48

    await waitFor(() => {
      const calls = mockCreateExperiencesOnline.mock.calls;
      expect(calls.length).toBe(1);

      expect(calls[0][0].input[0]).toEqual({
        dataDefinitions: [
          {
            name: "nn",
            type: DataTypes.DATE,
          },
        ],
        title: "tt",
        description: "dd",
      });
    });

    // 49

    expect(mockScrollIntoView).toHaveBeenCalled();
    mockScrollIntoView.mockClear();

    // 50

    expect(mockWindowChangeUrl).toHaveBeenCalled();

    // 51

    expect(mockPersistFn).toHaveBeenCalled();

    // 52

    (
      definition0El
        .getElementsByClassName(addDefinitionSelector)
        .item(0) as HTMLElement
    ).click();

    // 53

    definitionsEls = await waitFor(() => {
      const el = getDefinitionContainerEls();
      return el;
    });

    //

    const definition1El = definitionsEls.item(1) as HTMLElement;
    expect(mockScrollIntoView.mock.calls[0][0]).toEqual(definition1El.id);
    mockScrollIntoView.mockReset();

    //

    (
      definition1El
        .getElementsByClassName(moveUpDefinitionSelector)
        .item(0) as HTMLElement
    ).click();

    //

    definitionsEls = await waitFor(() => {
      const els = getDefinitionContainerEls();
      return els;
    });

    expect(definitionsEls.item(0)).toBe(definition1El);
    expect(definitionsEls.item(1)).toBe(definition0El);

    //

    expect(mockScrollIntoView.mock.calls[0][0]).toEqual(definition1El.id);
    mockScrollIntoView.mockClear();

    //

    (
      definition1El
        .getElementsByClassName(moveDownDefinitionSelector)
        .item(0) as HTMLElement
    ).click();

    //

    definitionsEls = await waitFor(() => {
      const els = getDefinitionContainerEls();
      return els;
    });

    expect(definitionsEls.item(0)).toBe(definition0El);
    expect(definitionsEls.item(1)).toBe(definition1El);

    //

    expect(mockScrollIntoView.mock.calls[0][0]).toEqual(definition1El.id);
    mockScrollIntoView.mockClear();

    //

    (
      definition1El
        .getElementsByClassName(removeDefinitionSelector)
        .item(0) as HTMLElement
    ).click();

    //

    definitionsEls = await waitFor(() => {
      const els = getDefinitionContainerEls();
      return els;
    });

    expect(definitionsEls.length).toBe(1);

    //

    expect(mockScrollIntoView.mock.calls[0][0]).toEqual(definition0El.id);

    //

    expect(mockOnClose).not.toHaveBeenCalled();

    //

    getById(disposeComponentDomId).click();

    //

    expect(mockOnClose).toHaveBeenCalled();
  });

  const getExperienceQueryResult1 = {
    data: {
      getExperience: onlineExperience,
    },
  } as GetExperienceQueryResult;

  const getEntriesQuerySuccess1 = {
    edges: [
      {
        node: {
          dataObjects: [
            {
              id: "xx",
            },
          ],
        },
      },
    ],
  };

  it("updates experience online, submit empty form, reset form, change integer to decimal", async () => {
    mockIsConnected.mockReturnValue(true);

    mockFetchExperienceDetailView.mockResolvedValueOnce(
      getExperienceQueryResult1,
    );

    const { ui } = makeComp({
      props: {
        experience: onlineExperience,
      },
    });

    await act(async () => {
      render(ui);

      const titleInputEl = getTitleInputEl();
      const descriptionInputEl = getDescriptionInputEl();

      let definitionsEls = getDefinitionContainerEls();
      let definition0El = definitionsEls.item(0) as HTMLElement;
      let definition0NameEl = getDefinitionNameControlEl(definition0El);
      let definition0TypeEl = getDefinitionTypeControlEl(definition0El);

      // we initially render an empty form
      expect(titleInputEl.value).toBe("");
      expect(definition0NameEl.value).toBe("");
      expect(definition0TypeEl.value).toBe("");

      // We should not be able to input comment when updating experience
      await waitFor(() => {
        const el = getCommentInputEl();
        expect(el).toBeNull();
      });

      // form is now pre filled with values from experience we wish to update
      expect(titleInputEl.value).toBe(onlineTitle);
      expect(descriptionInputEl.value).toEqual("");

      definitionsEls = getDefinitionContainerEls();
      definition0El = definitionsEls.item(0) as HTMLElement;
      definition0NameEl = getDefinitionNameControlEl(definition0El);
      definition0TypeEl = getDefinitionTypeControlEl(definition0El);

      expect(definition0NameEl.value).toBe(nameValue);
      expect(definition0TypeEl.value).toBe(DataTypes.INTEGER);

      // we submit an unmodified form
      const submitEl = getSubmitEl();
      submitEl.click();

      // get a warning
      let notificationCloseEl = getNotificationCloseEl();
      const notificationEl = getNotificationEl(notificationCloseEl);
      expect(notificationEl.classList).toContain(warningClassName);

      notificationCloseEl.click();
      expect(getNotificationCloseEl()).toBeNull();

      // let's update the form
      fillField(titleInputEl, "tt");
      fillField(descriptionInputEl, "dd");
      fillField(definition0NameEl, "nn");
      fillField(definition0TypeEl, DataTypes.DATE);

      // confirm update
      expect(titleInputEl.value).toBe("tt");
      expect(descriptionInputEl.value).toBe("dd");
      expect(definition0NameEl.value).toBe("nn");
      expect(definition0TypeEl.value).toBe(DataTypes.DATE);

      const resetEl = getResetEl();
      resetEl.click();

      expect(titleInputEl.value).toBe(onlineTitle);
      expect(descriptionInputEl.value).toEqual("");
      expect(definition0NameEl.value).toBe(nameValue);
      expect(definition0TypeEl.value).toBe(DataTypes.INTEGER);

      // update with error (integer can only be changed to decimal) and submit
      fillField(titleInputEl, "tt");
      fillField(descriptionInputEl, "dd");
      fillField(definition0NameEl, "nn");
      fillField(definition0TypeEl, DataTypes.DATE);
      const definition0TypeFieldEl = getParentFieldEl(definition0TypeEl);
      expect(getFieldErrorEl(definition0TypeFieldEl)).toBeNull();
      submitEl.click();

      notificationCloseEl = await waitFor(getNotificationCloseEl);
      expect(getFieldErrorEl(definition0TypeFieldEl)).not.toBeNull();
      notificationCloseEl.click();
      expect(getNotificationCloseEl()).toBeNull();

      // update form correctly and submit
      fillField(definition0TypeEl, DataTypes.DECIMAL);
      submitEl.click();

      const calls = await waitFor(() => {
        const c = mockUpdateExperiencesMutation.mock.calls;
        expect(c.length).not.toBe(0);
        return c;
      });

      const { onUpdateSuccess, onError } = calls[0][0];

      const updatedExperience = { id: "a" };

      mockGetEntriesQuerySuccess.mockReturnValue(getEntriesQuerySuccess1);

      await onUpdateSuccess(
        {
          experience: {
            experienceId: onlineExperienceId,
          },
        },
        updatedExperience,
      );

      expect(mockManuallyGetDataObjects.mock.calls[0][0].ids[0]).toBe("xx");
      expect(mockOnSuccess).toHaveBeenCalledWith(
        updatedExperience,
        StateValue.online,
      );

      onError("a");
    });
  });

  it("creates experience online with comment", async () => {
    // Given that we are connected
    mockIsConnected.mockReturnValue(true);

    const { ui } = makeComp();
    render(ui);

    // When we complete the form
    const commentInputEl = getCommentInputEl();
    fillField(commentInputEl, "comment");

    const descriptionInputEl = getDescriptionInputEl();
    fillField(descriptionInputEl, "dd");

    expect(getNotificationCloseEl()).toBeNull();

    const titleInputEl = getTitleInputEl();
    fillField(titleInputEl, "tt");

    const definitionsEls = getDefinitionContainerEls();
    const definition0El = definitionsEls.item(0) as HTMLElement;

    const definition0NameEl = getDefinitionNameControlEl(definition0El);
    fillField(definition0NameEl, "nn");

    const definition0TypeEl = getDefinitionTypeControlEl(definition0El);
    fillField(definition0TypeEl, DataTypes.DATE);

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

    mockCreateExperiencesOnline.mockResolvedValue(serverResponse3);

    const submitEl = getSubmitEl();
    submitEl.click();
    await waitFor(() => true);

    expect(mockWindowChangeUrl).toHaveBeenCalled();
    expect(mockPersistFn).toHaveBeenCalled();

    expect(mockCreateExperiencesOnline.mock.calls[0][0].input[0]).toEqual({
      dataDefinitions: [
        {
          name: "nn",
          type: DataTypes.DATE,
        },
      ],
      title: "tt",
      description: "dd",
      commentText: "comment",
    } as CreateExperienceInput);
  });
});

describe("reducer", () => {
  const props = {
    onSuccess: mockOnSuccess as any,
  } as Props;

  const effectArgs = {
    dispatch: mockDispatch,
  } as EffectArgs;

  it("creates offline experience successfully", async () => {
    mockIsConnected.mockReturnValue(false);

    let state = initState(props);
    state = formChangedTitle(state, "tt");
    state = formChangedDefinition(state, 0, "00", "name");
    state = formChangedDefinition(state, 0, DataTypes.DATE, "type");

    state = reducer(state, {
      type: ActionType.SUBMISSION,
    });

    const effect = (state.effects.general as EffectState).hasEffects.context
      .effects[0];

    const effectFn = effectFunctions[effect.key];

    mockCreateOfflineExperience.mockReturnValue({
      id: "1",
    });

    expect(mockWindowChangeUrl).not.toHaveBeenCalled();
    expect(mockPersistFn).not.toHaveBeenCalled();
    effectFn(effect.ownArgs as any, props, effectArgs);
    await waitFor(() => true);

    expect(mockWindowChangeUrl).toHaveBeenCalled();
    expect(mockPersistFn).toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();

    expect(mockCreateOfflineExperience.mock.calls[0][0].input[0]).toEqual({
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

    let state = initState(props);
    state = formChangedTitle(state, "tt");
    state = formChangedDefinition(state, 0, "00", "name");
    state = formChangedDefinition(state, 0, DataTypes.DATE, "type");

    state = reducer(state, {
      type: ActionType.SUBMISSION,
    });

    const effectArgs = {
      dispatch: mockDispatch,
    } as EffectArgs;

    const effect = (state.effects.general as EffectState).hasEffects.context
      .effects[0];

    const effectFn = effectFunctions[effect.key];

    mockCreateOfflineExperience.mockReturnValue(undefined);

    expect(mockDispatch).not.toHaveBeenCalled();
    effectFn(effect.ownArgs as any, props, effectArgs);
    await waitFor(() => true);

    expect(mockWindowChangeUrl).not.toHaveBeenCalled();
    expect(mockPersistFn).not.toHaveBeenCalled();
    expect(mockDispatch.mock.calls[0][0].type).toEqual(
      ActionType.ON_COMMON_ERROR,
    );
  });

  it("submits offline: field errors", async () => {
    mockIsConnected.mockReturnValue(false);

    let state = initState(props);
    state = formChangedTitle(state, "tt");
    state = formChangedDefinition(state, 0, "00", "name");
    state = formChangedDefinition(state, 0, DataTypes.DATE, "type");

    state = reducer(state, {
      type: ActionType.SUBMISSION,
    });

    const effectArgs = {
      dispatch: mockDispatch,
    } as EffectArgs;

    const effect = (state.effects.general as EffectState).hasEffects.context
      .effects[0];

    const effectFn = effectFunctions[effect.key];

    mockCreateOfflineExperience.mockReturnValue("a");

    expect(mockDispatch).not.toHaveBeenCalled();
    effectFn(effect.ownArgs as any, props, effectArgs);
    await waitFor(() => true);

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

    let state = initState(props);
    state = formChangedTitle(state, "tt");
    state = formChangedDefinition(state, 0, "00", "name");
    state = formChangedDefinition(state, 0, DataTypes.DATE, "type");

    state = reducer(state, {
      type: ActionType.SUBMISSION,
    });

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
    await waitFor(() => true);

    expect(mockDispatch.mock.calls[0][0].type).toEqual(
      ActionType.ON_COMMON_ERROR,
    );
  });

  it("server only field errors", () => {
    let state = initState(props);
    let commonErrors = (state.states.submission as SubmissionCommonErrors)
      .commonErrors;
    expect(commonErrors).not.toBeDefined();

    state = reducer(state, {
      type: ActionType.ON_SERVER_ERRORS,
      errors: {
        title: "a",
      } as CreateExperiences_createExperiences_CreateExperienceErrors_errors,
    });

    const formValidity = state.states.form.validity as FormInValid;
    expect(formValidity.invalid).not.toBeDefined();

    commonErrors = (state.states.submission as SubmissionCommonErrors)
      .commonErrors;
    expect(commonErrors).toBeDefined();
  });

  it("definition names must be unique", () => {
    let state = initState(props);
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
    let state = initState(props);

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

  it("calls onError callback when fetch experience returns empty result or throws exception", async () => {
    const props = {
      experience: {
        id: onlineExperienceId,
        title: onlineTitle,
      },
      onError: mockOnError as any,
    } as Props;

    const state = initState(props);

    const effect = (state.effects.general as EffectState).hasEffects.context
      .effects[0];

    const effectFn = effectFunctions[effect.key];

    await effectFn(effect.ownArgs as any, props, effectArgs);
    expect(mockOnError.mock.calls).toHaveLength(1);

    mockFetchExperienceDetailView.mockRejectedValue("");
    await effectFn(effect.ownArgs as any, props, effectArgs);
    expect(mockOnError.mock.calls).toHaveLength(2);
  });

  it("updates definition to single text for offline experience", async () => {
    mockIsConnected.mockReturnValue(false);

    const thisProps = {
      ...props,
      experience: offlineExperience,
    };

    let state = initState(thisProps);

    state = reducer(state, {
      type: ActionType.ON_EXPERIENCE_DETAIL_VIEW_FETCHED_SUCCESS,
      experience: offlineExperience,
    });

    state = formChangedDefinition(state, 0, DataTypes.SINGLE_LINE_TEXT, "type");

    state = reducer(state, {
      type: ActionType.SUBMISSION,
    });

    let dataState = (
      state.states.form.fields.dataDefinitions[0].type.states as ChangedState
    ).changed.states;

    expect(dataState.value).toEqual(StateValue.valid);

    state = formChangedDefinition(state, 0, DataTypes.DATE, "type");

    state = reducer(state, {
      type: ActionType.SUBMISSION,
    });

    dataState = (
      state.states.form.fields.dataDefinitions[0].type.states as ChangedState
    ).changed.states;

    expect(dataState.value).toEqual(StateValue.invalid);

    state = formChangedDefinition(state, 0, DataTypes.SINGLE_LINE_TEXT, "type");

    state = reducer(state, {
      type: ActionType.SUBMISSION,
    });

    dataState = (
      state.states.form.fields.dataDefinitions[0].type.states as ChangedState
    ).changed.states;

    expect(dataState.value).toEqual(StateValue.valid);

    const effect = (state.effects.general as EffectState).hasEffects.context
      .effects[0];

    const updateExperienceEffect = effectFunctions[effect.key];
    mockUpdateExperienceOfflineFn.mockReturnValue(offlineExperience);

    await updateExperienceEffect(effect.ownArgs as any, thisProps, effectArgs);

    expect(mockOnSuccess).toHaveBeenCalledWith(
      offlineExperience,
      StateValue.offline,
    );
  });

  it("updates definition to multiline text for online experience", async () => {
    mockIsConnected.mockReturnValue(false);

    const thisProps = {
      ...props,
      experience: onlineExperience,
    };

    let state = initState(thisProps);

    state = reducer(state, {
      type: ActionType.ON_EXPERIENCE_DETAIL_VIEW_FETCHED_SUCCESS,
      experience: offlineExperience,
    });

    state = formChangedDefinition(state, 0, DataTypes.MULTI_LINE_TEXT, "type");

    state = reducer(state, {
      type: ActionType.SUBMISSION,
    });

    const dataState = (
      state.states.form.fields.dataDefinitions[0].type.states as ChangedState
    ).changed.states;

    expect(dataState.value).toEqual(StateValue.valid);

    const effect = (state.effects.general as EffectState).hasEffects.context
      .effects[0];

    const updateExperienceEffect = effectFunctions[effect.key];
    mockUpdateExperienceOfflineFn.mockReturnValue(onlineExperience);

    await updateExperienceEffect(effect.ownArgs as any, thisProps, effectArgs);

    expect(mockOnSuccess).toHaveBeenCalledWith(
      onlineExperience,
      StateValue.partOffline,
    );
  });
});

////////////////////////// HELPER FUNCTIONS ///////////////////////////

const UpsertExperienceP = UpsertExperience as ComponentType<Partial<Props>>;

function makeComp({ props = {} }: { props?: Partial<Any> } = {}) {
  return {
    ui: (
      <UpsertExperienceP
        onClose={mockOnClose}
        onError={mockOnError}
        onSuccess={mockOnSuccess}
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
  return notificationCloseEl.closest(
    `.${notificationElementSelector}`,
  ) as HTMLElement;
}

function getTitleInputEl() {
  return document.getElementById(titleInputDomId) as HTMLInputElement;
}

function getCommentInputEl() {
  return document.getElementById(commentInputDomId) as HTMLInputElement;
}

function getParentFieldEl(childEl: HTMLElement) {
  return childEl.closest(`.${fieldSelector}`) as HTMLElement;
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
    .getElementsByClassName(descriptionToggleSelector)
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
