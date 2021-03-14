import {
  BChannel,
  BroadcastAction,
  EbnisGlobals,
} from "@eb/cm/src/utils/types";
import { BroadcastChannel } from "broadcast-channel";

export function makeBChannel(globals: EbnisGlobals) {
  const broadcaster: BChannel = new BroadcastChannel(
    "ebnis-broadcast-channel-broadcaster",
  );

  globals.bcBroadcaster = broadcaster;

  return globals;
}

export function broadcastMessage(
  message: BroadcastAction,
  { plusSelf }: { plusSelf?: boolean } = {},
) {
  const { bcBroadcaster, emitData } = window.____ebnis;

  if (plusSelf) {
    emitData(message);
  }

  bcBroadcaster.postMessage(message);
}
