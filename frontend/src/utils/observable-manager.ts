import { Observable } from "zen-observable-ts";
import { E2EWindowObject, EmitPayload, BChannel } from "./types";
import { BroadcastChannel } from "broadcast-channel";

export enum EmitActionType {
  connectionChanged = "@emit-action/connection-changed",
  random = "@emit-action/nothing",
}

let timeoutId: null | number = null;

export function makeObservable(globals: E2EWindowObject) {
  globals.observable = new Observable<EmitPayload>((emitter) => {
    globals.emitter = emitter;
  });

  globals.emitData = function emitData(params: EmitPayload) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const { emitter } = globals;

    if (emitter) {
      emitter.next(params);
      return;
    }

    let count = 1;

    retry();

    // try 3 more times to emit the message (hopefully emitter will be available by then)

    function retry() {
      if (count > 3) {
        return;
      }

      ++count;

      timeoutId = setTimeout(() => {
        const { emitter } = globals;

        if (emitter) {
          emitter.next(params);
          return;
        }

        retry();
      });
    }
  };

  return globals;
}

export enum BroadcastMessageType {
  experienceDeleted = "@broadcast/experience-deleted",
}

export function makeBChannel(globals: E2EWindowObject) {
  const bc: BChannel = new BroadcastChannel("ebnis-broadcast-channel");
  globals.bc = bc;
  return globals;
}
