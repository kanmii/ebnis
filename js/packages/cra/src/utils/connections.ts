/* istanbul ignore file */
import {
  ConnectionStatus,
  EmitActionType,
  EbnisGlobals,
} from "@eb/cm/src/utils/types";
import { deleteObjectKey } from ".";

export function makeConnectionObject(ebnisGlobals?: EbnisGlobals) {
  ebnisGlobals = ebnisGlobals || window.____ebnis;
  let connectionStatus = ebnisGlobals.connectionStatus;

  if (!connectionStatus) {
    connectionStatus = {
      isConnected: null,
    } as ConnectionStatus;

    ebnisGlobals.connectionStatus = connectionStatus;
  }

  return ebnisGlobals;
}

export function resetConnectionObject(ebnisGlobals?: EbnisGlobals) {
  ebnisGlobals = ebnisGlobals || window.____ebnis;
  deleteObjectKey(ebnisGlobals, "connectionStatus");
  return makeConnectionObject(ebnisGlobals);
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

  const { connectionStatus, emitData } = window.____ebnis;

  connectionStatus.mode = mode;
  connectionStatus.isConnected = isConnected;

  emitData({
    type: EmitActionType.connectionChanged,
    connected: isConnected,
  });

  return connectionStatus;
}

export function getIsConnected() {
  const connectionStatus = getConnectionStatus();

  return connectionStatus ? connectionStatus.isConnected : null;
}

function getConnectionStatus() {
  return window.____ebnis.connectionStatus;
}
