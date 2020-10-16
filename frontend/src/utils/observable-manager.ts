import { Observable } from "zen-observable-ts";
import {
  E2EWindowObject,
  EmitPayload,
  BChannel,
  BroadcastMessage,
  BroadcastMessageType,
  StateValue,
} from "./types";
import { BroadcastChannel } from "broadcast-channel";
import { getLocation, windowChangeUrl, ChangeUrlType } from "./global-window";
import { MY_URL } from "./urls";

export enum EmitActionType {
  connectionChanged = "@emit-action/connection-changed",
  random = "@emit-action/nothing",
  syncDone = "@emit-action/sync-done",
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

export function makeBChannel(globals: E2EWindowObject) {
  const bc: BChannel = new BroadcastChannel("ebnis-broadcast-channel");
  globals.bc = bc;
  return globals;
}

export function broadcastMessage(
  message: BroadcastMessage,
  flags?: {
    toSelf: true;
  },
) {
  const { bc } = window.____ebnis;
  bc.postMessage(message);

  const { toSelf } = flags || {};

  if (toSelf) {
    const ev = new Event(StateValue.selfBcMessageKey);
    (ev as any).data = message;
    document.dispatchEvent(ev);
  }
}

export function onBcMessage({ type, payload }: BroadcastMessage) {
  switch (type) {
    case BroadcastMessageType.experienceDeleted:
      // istanbul ignore else:
      if (getLocation().pathname.includes(MY_URL)) {
        windowChangeUrl(MY_URL, ChangeUrlType.replace);
      }
      break;
  }
}
