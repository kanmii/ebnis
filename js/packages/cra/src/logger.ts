/* istanbul ignore file */
/* eslint-disable @typescript-eslint/no-explicit-any*/
import { Reducer, useEffect } from "react";
import lodashIsEqual from "lodash/isEqual";

const isDevEnv = process.env.NODE_ENV === "development";
const isTestEnv = process.env.NODE_ENV === "test";
const isProdEnv = process.env.NODE_ENV === "production";
// const isTestEnv = process.env.NODE_ENV === "test";

export const logger = async (prefix: keyof Console, tag: any, ...data: any) => {
  if (isDevEnv) {
    console[prefix](
      "\n\n     =======logging starts======\n",
      tag,
      "\n",
      ...data,
      "\n     =======logging ends======\n",
    );
  }
};

export function wrapReducer<State, Action>(
  prevState: State,
  action: Action,
  reducer: Reducer<State, Action>,
) {
  let shouldWrap = (window.____ebnis || {}).logReducers;

  if (isDevEnv && shouldWrap === undefined) {
    shouldWrap = true;
  }

  if (shouldWrap) {
    console.log(
      "\n\n=====PREVIOUS STATE======= \n\n",
      objectForEnv(prevState),

      "\n\n\n======UPDATE WITH======= \n\n",
      objectForEnv(action),
      "\n\n",
    );

    const nextState = reducer(prevState, action);

    console.log(
      "\n\n=====NEXT STATE====== \n\n",
      objectForEnv(nextState),

      "\n\n\n=====DIFFERENCES===== \n\n",
      objectForEnv(deepObjectDifference(nextState, prevState)),
      "\n\n",
    );

    return nextState;
  }

  return reducer(prevState, action);
}

function deepObjectDifference(
  compareObject: { [k: string]: any },
  baseObject: { [k: string]: any },
) {
  function differences(
    newObject: { [k: string]: any },
    baseObjectDiff: { [k: string]: any },
  ) {
    return Object.entries(newObject).reduce((acc, [key, value]) => {
      const baseValue = baseObjectDiff[key];

      if (!lodashIsEqual(value, baseValue)) {
        acc[key] =
          isPlainObject(baseValue) && isPlainObject(value)
            ? differences(value, baseValue)
            : value;
      }

      return acc;
    }, {} as { [k: string]: any });
  }

  return differences(compareObject, baseObject);
}

function isPlainObject(obj: object) {
  return Object.prototype.toString.call(obj).includes("Object");
}

function objectForEnv(obj: any) {
  return JSON.stringify(obj, null, 2);
}

export function useLogger(data: any, tag = "") {
  useEffect(() => {
    if (!isDevEnv) {
      return;
    }

    logger("log", tag, data);
  });
}

export function doNotLog() {
  // if we explicitly wish to log even in production, then we are duty bound
  // to do so
  if (
    "undefined" !== typeof window &&
    window.____ebnis &&
    window.____ebnis.logApolloQueries
  ) {
    return false;
  }

  // never log in production or test except we make it explicit as in above
  if (isProdEnv || isTestEnv) {
    return true;
  }

  // always log in development
  return false;
}

export function wrapState(state: any) {
  const shouldWrap = (window.____ebnis || {}).logReducers;
  if (shouldWrap) {
    console.log("\n\n=====INITIAL STATE======= \n\n", objectForEnv(state));
  }

  return state;
}
