import { Reducer, Dispatch } from "react";
import {
  ExperienceFragment,
  ExperienceFragment_dataDefinitions,
} from "../../graphql/apollo-types/ExperienceFragment";
import immer, { Draft } from "immer";
import {
  DataTypes,
  CreateEntryInput,
  CreateDataObject,
} from "../../graphql/apollo-types/globalTypes";
import dateFnFormat from "date-fns/format";
import parseISO from "date-fns/parseISO";
import { createOfflineEntryMutation } from "./upsert-entry.resolvers";
import { wrapReducer } from "../../logger";
import { getIsConnected } from "../../utils/connections";
import { scrollIntoView } from "../../utils/scroll-into-view";
import { scrollIntoViewNonFieldErrorDomId } from "./upsert-entry.dom";
import {
  UpdateExperiencesOnlineComponentProps,
  updateExperiencesOnlineEffectHelperFunc,
} from "../../utils/experience.gql.types";
import {
  StringyErrorPayload,
  parseStringError,
  FORM_CONTAINS_ERRORS_MESSAGE,
  GENERIC_SERVER_ERROR,
} from "../../utils/common-errors";
import {
  CreateEntryErrorFragment,
  CreateEntryErrorFragment_dataObjects,
} from "../../graphql/apollo-types/CreateEntryErrorFragment";
import {
  HasEffectsVal,
  ActiveVal,
  InActiveVal,
  ErrorsVal,
  StateValue,
  OnlineStatus,
} from "../../utils/types";
import {
  GenericGeneralEffect,
  GenericEffectDefinition,
  getGeneralEffects,
} from "../../utils/effects";
import { isOfflineId } from "../../utils/offlines";
import { EntryFragment } from "../../graphql/apollo-types/EntryFragment";
import { DataObjectFragment } from "../../graphql/apollo-types/DataObjectFragment";

const NEW_LINE_REGEX = /\n/g;
export const ISO_DATE_FORMAT = "yyyy-MM-dd";
const ISO_DATE_TIME_FORMAT = ISO_DATE_FORMAT + "'T'HH:mm:ssXXX";

export enum ActionType {
  ON_FORM_FIELD_CHANGED = "@upsert-entry/on-form-field-changed",
  ON_CREATE_ENTRY_ERRORS = "@upsert-entry/set-create-entry-errors",
  DISMISS_NOTIFICATION = "@upsert-entry/unset-server-errors",
  ON_SUBMIT = "@upsert-entry/on-submit",
  ON_COMMON_ERROR = "@upsert-entry/on-common-error",
}

export function toISODateString(date: Date) {
  return dateFnFormat(date, ISO_DATE_FORMAT);
}

export function toISODatetimeString(date: Date | string) {
  const parsedDate = typeof date === "string" ? parseISO(date) : date;
  const formattedDate = dateFnFormat(parsedDate, ISO_DATE_TIME_FORMAT);
  return formattedDate;
}

export function formObjToString(type: DataTypes, val: FormObjVal) {
  let toString = val;

  switch (type) {
    case DataTypes.DATE:
      toString = toISODateString(val as Date);
      break;

    case DataTypes.DATETIME:
      toString = toISODatetimeString(val as Date);
      break;

    case DataTypes.DECIMAL:
    case DataTypes.INTEGER:
      toString = (val || "0") + "";
      break;

    case DataTypes.SINGLE_LINE_TEXT:
      toString = "" + val;
      break;

    case DataTypes.MULTI_LINE_TEXT:
      toString = (("" + val) as string).replace(NEW_LINE_REGEX, "\\\\n");
      break;
  }

  return (toString as string).trim().replace(/"/g, '\\"');
}

export const reducer: Reducer<StateMachine, Action> = (state, action) =>
  wrapReducer<StateMachine, Action>(
    state,
    action,
    (prevState, { type, ...payload }) => {
      return immer(prevState, (proxy) => {
        proxy.effects.general.value = StateValue.noEffect;
        delete proxy.effects.general[StateValue.hasEffects];

        switch (type) {
          case ActionType.ON_FORM_FIELD_CHANGED:
            handleFormFieldChangedAction(proxy, payload as FieldChangedPayload);
            break;

          case ActionType.ON_SUBMIT:
            handleSubmissionAction(proxy);
            break;

          case ActionType.ON_CREATE_ENTRY_ERRORS:
            handleOnCreateEntryErrors(
              proxy,
              payload as CreateEntryErrorFragment,
            );
            break;

          case ActionType.DISMISS_NOTIFICATION:
            proxy.states.submission.value = StateValue.inactive;
            break;

          case ActionType.ON_COMMON_ERROR:
            handleOnCommonErrorAction(proxy, payload as StringyErrorPayload);
            break;
        }
      });
    },

    // true,
  );

////////////////////////// EFFECTS SECTION ////////////////////////////

const createEntryEffect: DefCreateEntryEffect["func"] = (
  { input, createEntryClientId },
  props,
  effectArgs,
) => {
  if (createEntryClientId) {
    input = {
      ...input,
      clientId: createEntryClientId,
    };
  }

  const { experience } = props;
  const experienceId = experience.id;
  const isOffline = isOfflineId(experienceId);

  if (getIsConnected()) {
    createOnlineEntryEffect(input, props, effectArgs);
  } else {
    createOfflineEntryEffect(input, props, effectArgs, isOffline);
  }
};

async function createOnlineEntryEffect(
  input: CreateEntryInput,
  props: Props,
  effectArgs: EffectArgs,
) {
  const {
    experience: { id: experienceId },
    updateExperiencesOnline,
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

  updateExperiencesOnlineEffectHelperFunc({
    input: inputs,
    updateExperiencesOnline,
    onUpdateSuccess: async ({ entries }) => {
      const newEntries = entries && entries.newEntries;

      if (newEntries && newEntries.length) {
        const entry0 = newEntries[0];

        if (entry0.__typename === "CreateEntryErrors") {
          const { errors } = entry0;
          dispatch({
            type: ActionType.ON_CREATE_ENTRY_ERRORS,
            ...errors,
          });

          return;
        }

        await window.____ebnis.persistor.persist();
        onSuccess(entry0.entry, StateValue.online);

        return;
      }

      dispatch({
        type: ActionType.ON_COMMON_ERROR,
        error: GENERIC_SERVER_ERROR,
      });
    },
    onError: (error) => {
      dispatch({
        type: ActionType.ON_COMMON_ERROR,
        error: error || GENERIC_SERVER_ERROR,
      });
    },
  });
}

async function createOfflineEntryEffect(
  input: CreateEntryInput,
  props: Props,
  effectArgs: EffectArgs,
  isOffline: boolean,
) {
  const {
    experience: { id: experienceId },
    onSuccess,
  } = props;

  const { dispatch } = effectArgs;

  const validResponse = createOfflineEntryMutation({
    experienceId,
    dataObjects: input.dataObjects as CreateDataObject[],
  });

  if (!validResponse) {
    dispatch({
      type: ActionType.ON_COMMON_ERROR,
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

type DefCreateEntryEffect = EffectDefinition<
  "createEntryEffect",
  CreateEntryEffectArgs
>;

const scrollToViewEffect: DefScrollToViewEffect["func"] = ({ id }) => {
  scrollIntoView(id, {
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
  createEntryEffect,
  scrollToViewEffect,
};

////////////////////////// END EFFECTS SECTION ////////////////////////////

////////////////////////// STATE UPDATE SECTION ////////////////////////////

export function initState(props: Props): StateMachine {
  const { experience, updatingEntry } = props;
  const { entry, errors } = updatingEntry || ({} as UpdatingEntryPayload);

  const definitionIdToDataMap = mapDefinitionIdToDataHelper(experience, entry);

  const formFields = (experience.dataDefinitions as ExperienceFragment_dataDefinitions[]).reduce(
    (acc, definition, index) => {
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
    },
    {} as FormFields,
  );

  const stateMachine = {
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
    handleOnCreateEntryErrors(stateMachine, errors);
  }

  return stateMachine;
}

function mapDefinitionIdToDataHelper(
  experience: ExperienceFragment,
  updatingEntry?: EntryFragment,
) {
  const result = {} as {
    [dataDefinitionId: string]: FormObjVal;
  };

  if (!updatingEntry) {
    return result;
  }

  updatingEntry.dataObjects.forEach((d) => {
    const { definitionId, data } = d as DataObjectFragment;
    const json = JSON.parse(data);
    const [type, stringData] = Object.entries(json)[0];
    const typeUpper = type.toUpperCase();
    const dataString = stringData as string;

    const value =
      typeUpper === DataTypes.DATE || typeUpper === DataTypes.DATETIME
        ? new Date(dataString)
        : dataString;

    result[definitionId] = value;
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
    dataDefinitions as ExperienceFragment_dataDefinitions[],
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
    key: "createEntryEffect",
    ownArgs: {
      input: {
        experienceId,
        dataObjects,
      },
      createEntryClientId,
    },
  });
}

function handleOnCreateEntryErrors(
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
  dataDefinitions: ExperienceFragment_dataDefinitions[],
) {
  return Object.entries(formFields).reduce(
    (acc, [stringIndex, { context }]) => {
      delete context.errors;
      const index = Number(stringIndex);

      const definition = dataDefinitions[
        index
      ] as ExperienceFragment_dataDefinitions;

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

export function stringifyDataObjectData(type: DataTypes, parsedData: any) {
  return `{"${type.toLowerCase()}":"${formObjToString(type, parsedData)}"}`;
}

export function parseDataObjectData(datum: string) {
  const toObject = JSON.parse(datum);
  const [[k, value]] = Object.entries(toObject);
  const key = k.toUpperCase();

  switch (key) {
    case DataTypes.DATE:
    case DataTypes.DATETIME:
      return new Date(value);

    case DataTypes.DECIMAL:
    case DataTypes.INTEGER:
      return Number(value);

    default:
      return value;
  }
}

////////////////////////// END STATE UPDATE SECTION /////////////////////

////////////////////////// TYPES SECTION ////////////////////////////

export interface CallerProps {
  experience: ExperienceFragment;
  updatingEntry?: UpdatingEntryPayload;
  onSuccess: (entry: EntryFragment, onlineStatus: OnlineStatus) => void;
  onClose: () => void;
}

export type Props = CallerProps & UpdateExperiencesOnlineComponentProps;

export type UpdatingEntryPayload = {
  entry: EntryFragment;
  errors?: CreateEntryErrorFragment;
};

export type FormObjVal = Date | string | number;

// the keys are the indices of the field definitions and the values are the
// default values for each field data type e.g number for integer and date
// for date
export interface FormFields {
  [k: string]: FieldState;
}

export interface FieldState {
  context: {
    value: FormObjVal;
    definition: ExperienceFragment_dataDefinitions;
    errors?: [string, string][];
  };
}

export interface FieldComponentProps {
  formFieldName: string;
  dispatch: DispatchType;
  value: FormObjVal;
}

export type ToString = (val: FormObjVal) => string;

interface FieldChangedPayload {
  fieldIndex: string | number;
  value: FormObjVal;
}

interface FieldErrors {
  [k: string]: string;
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
  experience: Readonly<ExperienceFragment>;
  updatingEntry?: UpdatingEntryPayload;
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
  | { type: ActionType.ON_SUBMIT }
  | { type: ActionType.DISMISS_NOTIFICATION }
  | ({
      type: ActionType.ON_CREATE_ENTRY_ERRORS;
    } & CreateEntryErrorFragment)
  | ({
      type: ActionType.ON_FORM_FIELD_CHANGED;
    } & FieldChangedPayload)
  | ({
      type: ActionType.ON_COMMON_ERROR;
    } & StringyErrorPayload);

export type DispatchType = Dispatch<Action>;

interface EffectContext {
  effectsArgsObj: Props;
}

type EffectType = DefScrollToViewEffect | DefCreateEntryEffect;

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
  OwnArgs = {}
> = GenericEffectDefinition<EffectArgs, Props, Key, OwnArgs>;
