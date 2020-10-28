/* istanbul ignore file */
import { broadcastMessage } from "./broadcast-channel-manager";
import {
  ConnectionStatus,
  BroadcastMessageType,
  BroadcastMessageConnectionChanged,
} from "./types";
import { setTimeout } from "timers";

export function makeConnectionObject() {
  let connectionStatus = window.____ebnis.connectionStatus;

  if (!connectionStatus) {
    connectionStatus = {
      isConnected: null,
    } as ConnectionStatus;

    window.____ebnis.connectionStatus = connectionStatus;
  }

  return connectionStatus;
}

export function resetConnectionObject() {
  delete window.____ebnis.connectionStatus;
  return makeConnectionObject();
}

export function storeConnectionStatus(
  isConnected: boolean,
  mode: "auto" | "manual" = "auto",
) {
  const prevConnectionStatus = getConnectionStatus();

  // "auto" means the status was adopted from inside phoenix socket and manual
  // means we set it ourselves. The manual mode is necessary so we can
  // simulate offline mode while in end to end test. As we can not determine
  // when phoenix socket will attempt to set the connection status, we ensure
  // that if we have set it manually, then 'auto' setting should not work.
  if (
    prevConnectionStatus &&
    prevConnectionStatus.mode === "manual" &&
    mode === "auto"
  ) {
    return;
  }

  const { connectionStatus } = window.____ebnis;
  const previousIsConnected = connectionStatus.isConnected;

  connectionStatus.mode = mode;
  connectionStatus.isConnected = isConnected;

  const message = {
    type: BroadcastMessageType.connectionChanged,
    payload: {
      connected: isConnected,
    },
  } as BroadcastMessageConnectionChanged;

  // previousIsConnected === null means app just booted up and message
  // recipient might not be ready. So we wait one tick of the clock, so
  // that **hopefully** app will be ready to receive and deal with message
  if (previousIsConnected === null) {
    setTimeout(() => {
      broadcastMessage(message, {
        selfOnly: true,
      });
    }, 0);
  } else {
    broadcastMessage(message, {
      selfOnly: true,
    });
  }

  return connectionStatus;
}

export function getIsConnected() {
  const connectionStatus = getConnectionStatus();

  return connectionStatus ? connectionStatus.isConnected : null;
}

function getConnectionStatus() {
  return window.____ebnis.connectionStatus;
}
