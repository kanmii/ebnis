import {
  BChannel,
  BroadcastMessage,
  BroadcastMessageSelf,
  EbnisGlobals,
  StateValue,
} from "@eb/cm/src/utils/types";
import { BroadcastChannel } from "broadcast-channel";

export function makeBChannel(globals: EbnisGlobals) {
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
