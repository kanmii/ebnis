import {
  E2EWindowObject,
  BChannel,
  BroadcastMessage,
  BroadcastMessageSelf,
  StateValue,
} from "./types";
import { BroadcastChannel } from "broadcast-channel";

export function makeBChannel(globals: E2EWindowObject) {
  const bc: BChannel = new BroadcastChannel("ebnis-broadcast-channel");
  globals.bc = bc;
  return globals;
}

export function broadcastMessage(
  message: BroadcastMessage,
  flags?: {
    plusSelf?: true;
    selfOnly?: true;
  },
) {
  const { plusSelf, selfOnly } = flags || {};

  if (plusSelf || selfOnly) {
    const ev = new CustomEvent(StateValue.selfBcMessageKey, {
      detail: message,
    } as BroadcastMessageSelf);
    (ev as any).data = message;
    window.dispatchEvent(ev);
  }

  if (!selfOnly) {
    const { bc } = window.____ebnis;
    bc.postMessage(message);
  }
}
