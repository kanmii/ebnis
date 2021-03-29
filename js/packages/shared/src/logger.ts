/* istanbul ignore file */
/* eslint-disable @typescript-eslint/no-explicit-any*/
import { Any } from "@eb/shared/src/utils/types";
import lodashIsEqual from "lodash/isEqual";
import { Reducer, useEffect } from "react";

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

export function headerWrap(text: string) {
  text =
    "%c" +
    `---------------------------------------------------------
                     ${text}
---------------------------------------------------------
`;

  console.log(text, "color:green;font-weight:bold;font-size:14px;");
}

export function wrapReducer<State, Action>(
  prevState: State,
  action: Action,
  reducer: Reducer<State, Action>,
) {
  let shouldWrap = (window.____ebnis || {}).logReducers;

  if (isDevEnv && shouldWrap === undefined) {
    shouldWrap = true;
  }

  const nextState = reducer(prevState, action);

  if (shouldWrap) {
    const diff = deepObjectDifference(nextState, prevState);

    console.log("\n\n{ LOG STARTS");

    headerWrap("UPDATE WITH");

    console.log(objectForEnv(action), "\n\n");

    headerWrap("DIFFERENCES");

    console.log(objectForEnv(diff), "\n\n");

    headerWrap("NEXT STATE");

    console.log(objectForEnv(nextState));

    console.log("\nLOG ENDS }");
  }

  return nextState;
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
    }, {} as Record<string, any>);
  }

  const diff = {
    "__state__id__@ebnis": baseObject.id,
    ...differences(compareObject, baseObject),
  };

  return diff;
}

function isPlainObject(obj: Any) {
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

export function wrapState<S>(state: S) {
  const shouldWrap = (window.____ebnis || {}).logReducers;
  if (shouldWrap) {
    headerWrap("INITIAL STATE");
    console.log(objectForEnv(state));
  }

  return state;
}
