import {
  CreateEntryErrorFragment,
  CreateEntryErrorFragment_dataObjects,
} from "@eb/shared/src/graphql/apollo-types/CreateEntryErrorFragment";
import { DataDefinitionFragment } from "@eb/shared/src/graphql/apollo-types/DataDefinitionFragment";
import { DataObjectFragment } from "@eb/shared/src/graphql/apollo-types/DataObjectFragment";
import { EntryFragment } from "@eb/shared/src/graphql/apollo-types/EntryFragment";
import { ExperienceDFragment } from "@eb/shared/src/graphql/apollo-types/ExperienceDFragment";
import {
  CreateDataObject,
  CreateEntryInput,
  DataTypes,
} from "@eb/shared/src/graphql/apollo-types/globalTypes";
import { wrapReducer } from "@eb/shared/src/logger";
import {
  DataDefinitionFormObjVal,
  parseDataObjectData,
  stringifyDataObjectData,
} from "@eb/shared/src/utils";
import { isOfflineId } from "@eb/shared/src/utils/offlines";
import {
  ActiveVal,
  Any,
  ErrorsVal,
  HasEffectsVal,
  InActiveVal,
  OnlineStatus,
  StateValue,
} from "@eb/shared/src/utils/types";
import immer, { Draft } from "immer";
import { Dispatch, Reducer } from "react";
import { deleteObjectKey } from "../../utils";
import {
  FORM_CONTAINS_ERRORS_MESSAGE,
  GENERIC_SERVER_ERROR,
  parseStringError,
  StringyErrorPayload,
} from "../../utils/common-errors";
import {
  GenericEffectDefinition,
  GenericGeneralEffect,
  getGeneralEffects,
} from "../../utils/effects";
import { scrollIntoViewNonFieldErrorDomId } from "./upsert-entry.dom";

export enum ActionType {
  on_form_field_changed = "@upsert-entry/on-form-field-changed",
  on_upsert_errors = "@upsert-entry/set-upsert-errors",
  dismiss_notification = "@upsert-entry/dismiss-notification",
  submit = "@upsert-entry/submit",
  on_common_error = "@upsert-entry/on-common-error",
}

export const reducer: Reducer<StateMachine, Action> = (state, action) =>
  wrapReducer<StateMachine, Action>(
    state,
    action,
    (prevState, { type, ...payload }) => {
      return immer(prevState, (proxy) => {
        proxy.effects.general.value = StateValue.noEffect;
        deleteObjectKey(proxy.effects.general, StateValue.hasEffects);

        switch (type) {
          case ActionType.on_form_field_changed:
            handleFormFieldChangedAction(proxy, payload as FieldChangedPayload);
            break;

          case ActionType.submit:
            handleSubmissionAction(proxy);
            break;

          case ActionType.on_upsert_errors:
            handleOnUpsertErrors(proxy, payload as CreateEntryErrorFragment);
            break;

          case ActionType.dismiss_notification:
            proxy.states.submission.value = StateValue.inactive;
            break;

          case ActionType.on_common_error:
            handleOnCommonErrorAction(proxy, payload as StringyErrorPayload);
            break;
        }
      });
    },
  );

////////////////////////// EFFECTS SECTION ////////////////////////////

const upsertEffect: DefUpsertEffect["func"] = (
  { input, createEntryClientId },
  props,
  effectArgs,
) => {
  const { getIsConnectedInject } = window.____ebnis.upsertEntryInjections;

  if (createEntryClientId) {
    input = {
      ...input,
      clientId: createEntryClientId,
    };
  }

  const { experience } = props;
  const experienceId = experience.id;
  const isOffline = isOfflineId(experienceId);

  if (getIsConnectedInject()) {
    upsertOnlineEntryEffectHelper(input, props, effectArgs);
  } else {
    upsertOfflineEntryEffectHelper(input, props, effectArgs, isOffline);
  }
};

async function upsertOnlineEntryEffectHelper(
  input: CreateEntryInput,
  props: Props,
  effectArgs: EffectArgs,
) {
  const { updateExperiencesMutationInject } =
    window.____ebnis.upsertEntryInjections;

  const {
    experience: { id: experienceId },
    updatingEntry,
    onSuccess,
  } = props;

  const { dispatch } = effectArgs;

  if (updatingEntry) {
    const { entry } = updatingEntry;
    const datenGegenständen = entry.dataObjects.map((d, index) => {
      const { clientId, updatedAt, insertedAt } = d as DataObjectFragment;

      return {
        ...input.dataObjects[index],
        clientId,
        updatedAt,
        insertedAt,
      };
    });

    input = {
      ...input,
      dataObjects: datenGegenständen,
    };
  }

  const inputs = [
    {
      experienceId,
      addEntries: [input],
    },
  ];

  updateExperiencesMutationInject({
    input: inputs,
    onUpdateSuccess: async ({ entries }) => {
      const newEntries = entries && entries.newEntries;

      if (newEntries && newEntries.length) {
        const entry0 = newEntries[0];

        if (entry0.__typename === "CreateEntryErrors") {
          const { errors } = entry0;
          dispatch({
            type: ActionType.on_upsert_errors,
            ...errors,
          });

          return;
        }

        await window.____ebnis.persistor.persist();
        onSuccess(entry0.entry, StateValue.online);

        return;
      }

      dispatch({
        type: ActionType.on_common_error,
        error: GENERIC_SERVER_ERROR,
      });
    },
    onError: (error) => {
      dispatch({
        type: ActionType.on_common_error,
        error: error || GENERIC_SERVER_ERROR,
      });
    },
  });
}

async function upsertOfflineEntryEffectHelper(
  input: CreateEntryInput,
  props: Props,
  effectArgs: EffectArgs,
  isOffline: boolean,
) {
  const { createOfflineEntryMutationInject } =
    window.____ebnis.upsertEntryInjections;

  const {
    experience: { id: experienceId },
    onSuccess,
  } = props;

  const { dispatch } = effectArgs;

  const validResponse = await createOfflineEntryMutationInject({
    experienceId,
    dataObjects: input.dataObjects as CreateDataObject[],
  });

  if (!validResponse) {
    dispatch({
      type: ActionType.on_common_error,
      error: GENERIC_SERVER_ERROR,
    });

    return;
  }

  onSuccess(
    validResponse.entry,
    isOffline ? StateValue.offline : StateValue.partOffline,
  );

  await window.____ebnis.persistor.persist();
}

interface CreateEntryEffectArgs {
  input: CreateEntryInput;
  createEntryClientId?: string;
}

type DefUpsertEffect = EffectDefinition<"upsertEffect", CreateEntryEffectArgs>;

const scrollToViewEffect: DefScrollToViewEffect["func"] = ({ id }) => {
  const { scrollIntoViewInject } = window.____ebnis.upsertEntryInjections;

  scrollIntoViewInject(id, {
    behavior: "smooth",
  });
};

type DefScrollToViewEffect = EffectDefinition<
  "scrollToViewEffect",
  {
    id: string;
  }
>;

export const effectFunctions = {
  upsertEffect,
  scrollToViewEffect,
};

////////////////////////// END EFFECTS SECTION ////////////////////////////

////////////////////////// STATE UPDATE SECTION ////////////////////////////

export function initState(props: Props): StateMachine {
  const { experience, updatingEntry } = props;
  const { entry, errors } = updatingEntry || ({} as UpdatingPayload);

  const definitionIdToDataMap = mapDefinitionIdToDataHelper(entry);

  const formFields = (
    experience.dataDefinitions as DataDefinitionFragment[]
  ).reduce((acc, definition, index) => {
    const { id } = definition;
    let value = definitionIdToDataMap[id];

    if (value === undefined) {
      value =
        definition.type === DataTypes.DATE ||
        definition.type === DataTypes.DATETIME
          ? new Date()
          : "";
    }

    acc[index] = {
      context: { definition, value },
    };

    return acc;
  }, {} as FormFields);

  const stateMachine = {
    id: "@upsert-entry",
    states: {
      submission: {
        value: StateValue.inactive,
      },
      form: {
        fields: formFields,
      },
    },

    context: { experience, updatingEntry },

    effects: {
      general: {
        value: StateValue.noEffect,
      },
    },
  };

  if (errors) {
    handleOnUpsertErrors(stateMachine, errors);
  }

  return stateMachine;
}

function mapDefinitionIdToDataHelper(updatingEntry?: EntryFragment) {
  const result = {} as {
    [dataDefinitionId: string]: DataDefinitionFormObjVal;
  };

  if (!updatingEntry) {
    return result;
  }

  updatingEntry.dataObjects.forEach((d) => {
    const { definitionId, data } = d as DataObjectFragment;
    result[definitionId] = parseDataObjectData(data);
  });

  return result;
}

function handleSubmissionAction(proxy: DraftState) {
  const {
    context: { experience, updatingEntry },
    states,
  } = proxy;

  states.submission.value = StateValue.active;
  const { dataDefinitions, id: experienceId } = experience;
  const {
    form: { fields },
  } = states;

  const dataObjects = dataObjectsFromFormValues(
    fields,
    dataDefinitions as DataDefinitionFragment[],
  );

  const effects = getGeneralEffects(proxy);

  let createEntryClientId = "";

  if (updatingEntry) {
    const { id, clientId } = updatingEntry.entry;

    // das bedeutet ein vollständig Offline-Eintrag und ein nue Eintrag muss
    // erstellten werden
    // istanbul ignore else:
    if (id === clientId) {
      createEntryClientId = id;
    }
  }

  effects.push({
    key: "upsertEffect",
    ownArgs: {
      input: {
        experienceId,
        dataObjects,
      },
      createEntryClientId,
    },
  });
}

function handleOnUpsertErrors(
  proxy: DraftState,
  payload: CreateEntryErrorFragment,
) {
  const {
    states: {
      form: { fields },
    },
  } = proxy;
  const { dataObjects } = payload as CreateEntryErrorFragment;

  if (!dataObjects) {
    handleOnCommonErrorAction(proxy, { error: GENERIC_SERVER_ERROR });
    return;
  }

  handleOnCommonErrorAction(proxy, { error: FORM_CONTAINS_ERRORS_MESSAGE });

  dataObjects.forEach((field) => {
    const {
      /* eslint-disable-next-line @typescript-eslint/no-unused-vars*/
      __typename,
      meta: { index },
      ...errors
    } = field as CreateEntryErrorFragment_dataObjects;

    const fieldState = fields[index];
    fieldState.context.errors = Object.entries(errors).filter((x) => !!x[1]);
  });
}

function handleOnCommonErrorAction(
  proxy: DraftState,
  payload: StringyErrorPayload,
) {
  const errors = parseStringError(payload.error);

  const commonErrorsState = {
    value: StateValue.errors,
    errors: {
      context: {
        errors,
      },
    },
  } as Submission;

  proxy.states.submission = {
    ...proxy.states.submission,
    ...commonErrorsState,
  };

  const effects = getGeneralEffects(proxy);
  effects.push({
    key: "scrollToViewEffect",
    ownArgs: {
      id: scrollIntoViewNonFieldErrorDomId,
    },
  });
}

function dataObjectsFromFormValues(
  formFields: StateMachine["states"]["form"]["fields"],
  dataDefinitions: DataDefinitionFragment[],
) {
  return Object.entries(formFields).reduce(
    (acc, [stringIndex, { context }]) => {
      delete context.errors;
      const index = Number(stringIndex);

      const definition = dataDefinitions[index] as DataDefinitionFragment;

      const { type, id: definitionId } = definition;

      const data = stringifyDataObjectData(type, context.value);

      acc.push({
        definitionId,
        data,
      });

      return acc;
    },
    [] as CreateDataObject[],
  );
}

function handleFormFieldChangedAction(
  proxy: DraftState,
  payload: FieldChangedPayload,
) {
  const { fieldIndex, value } = payload;

  proxy.states.form.fields[fieldIndex].context.value = value;
}

////////////////////////// END STATE UPDATE SECTION /////////////////////

////////////////////////// TYPES SECTION ////////////////////////////

export interface CallerProps {
  experience: ExperienceDFragment;
  updatingEntry?: UpdatingPayload;
  onSuccess: (entry: EntryFragment, onlineStatus: OnlineStatus) => void;
  onClose: () => void;
  className?: string;
}

export type Props = CallerProps;

export type UpdatingPayload = {
  entry: EntryFragment;
  errors?: CreateEntryErrorFragment;
};

// the keys are the indices of the field definitions and the values are the
// default values for each field data type e.g number for integer and date
// for date
export interface FormFields {
  [k: string]: FieldState;
}

export interface FieldState {
  context: {
    value: DataDefinitionFormObjVal;
    definition: DataDefinitionFragment;
    errors?: [string, string][];
  };
}

export interface FieldComponentProps {
  formFieldName: string;
  dispatch: DispatchType;
  value: DataDefinitionFormObjVal;
}

export type ToString = (val: DataDefinitionFormObjVal) => string;

interface FieldChangedPayload {
  fieldIndex: string | number;
  value: DataDefinitionFormObjVal;
}

type DraftState = Draft<StateMachine>;

type StateMachine = Readonly<GenericGeneralEffect<EffectType>> &
  Readonly<{
    context: GlobalContext;

    states: Readonly<{
      submission: Submission;
      form: Readonly<{
        fields: FormFields;
      }>;
    }>;
  }>;

type GlobalContext = Readonly<{
  experience: Readonly<ExperienceDFragment>;
  updatingEntry?: UpdatingPayload;
}>;

export type Submission = Readonly<
  | SubmissionErrors
  | {
      value: ActiveVal;
    }
  | {
      value: InActiveVal;
    }
>;

export type SubmissionErrors = Readonly<{
  value: ErrorsVal;
  errors: Readonly<{
    context: {
      errors: string;
    };
  }>;
}>;

type Action =
  | { type: ActionType.submit }
  | { type: ActionType.dismiss_notification }
  | ({
      type: ActionType.on_upsert_errors;
    } & CreateEntryErrorFragment)
  | ({
      type: ActionType.on_form_field_changed;
    } & FieldChangedPayload)
  | ({
      type: ActionType.on_common_error;
    } & StringyErrorPayload);

export type DispatchType = Dispatch<Action>;

type EffectType = DefScrollToViewEffect | DefUpsertEffect;

type EffectsList = EffectType[];

export interface GeneralEffect {
  value: HasEffectsVal;
  hasEffects: {
    context: {
      effects: EffectsList;
    };
  };
}

interface EffectArgs {
  dispatch: DispatchType;
}

type EffectDefinition<
  Key extends keyof typeof effectFunctions,
  OwnArgs = Any,
> = GenericEffectDefinition<EffectArgs, Props, Key, OwnArgs>;
