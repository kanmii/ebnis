import { Observable } from "zen-observable-ts";
import { E2EWindowObject, EmitPayload } from "./types";

export enum EmitActionType {
  connectionChanged = "@emit-action/connection-changed",
  random = "@emit-action/nothing",
}

export function makeObservable(globals: E2EWindowObject) {
  globals.observable = new Observable<EmitPayload>((emitter) => {
    globals.emitter = emitter;
  });

  globals.emitData = function emitData(params: EmitPayload) {
    const { emitter } = globals;

    if (emitter) {
      emitter.next(params);
    }
  };

  return globals;
}
