import { Observable } from "zen-observable-ts";
import { E2EWindowObject, EmitPayload, BChannel } from "./types";
import { BroadcastChannel } from "broadcast-channel";

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

export enum BroadcastMessageType {
  experienceDeleted = "@broadcast/experience-deleted",
}

export function makeBChannel(globals: E2EWindowObject) {
  const bc: BChannel = new BroadcastChannel("ebnis-broadcast-channel");
  globals.bc = bc;
  return globals;
}
