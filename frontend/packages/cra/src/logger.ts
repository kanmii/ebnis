/* istanbul ignore file */
/* eslint-disable @typescript-eslint/no-explicit-any*/
import { Reducer, useEffect } from "react";
import lodashIsEqual from "lodash/isEqual";
import { noLogReactEnv } from "./utils/env-variables";

const isDevEnv = process.env.NODE_ENV === "development";
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
  shouldWrap?: boolean,
) {
  if (shouldWrap === false && doNotLog()) {
    return reducer(prevState, action);
  }

  if (shouldWrap === true || isDevEnv) {
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
  return (
    !window.____ebnis.logApolloQueries &&
    (process.env.NODE_ENV === "production" || process.env[noLogReactEnv])
  );
}

export function wrapState(state: any, shouldWrap?: boolean) {
  if ((shouldWrap && !doNotLog()) || isDevEnv) {
    console.log("\ninitial state = \n\t", objectForEnv(state));
  }

  return state;
}
