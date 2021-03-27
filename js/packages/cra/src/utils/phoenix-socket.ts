/* istanbul ignore file */
import { AppSocket, EbnisGlobals } from "@eb/cm/src/utils/types";
import { Socket as PhoenixSocket } from "phoenix";
import { getIsConnected, storeConnectionStatus } from "./connections";
import { getBackendUrls } from "./get-backend-urls";
import { getSessionId } from "./session-manager";

export const defineSocket = ({ uri, token: connToken }: DefineParams) => {
  let socket: AppSocket;

  function ebnisConnect(token?: string | null) {
    const params = makeParams(token);
    socket = new PhoenixSocket(
      getBackendUrls(uri).websocketUrl,
      params,
    ) as AppSocket;

    socket.ebnisConnect = ebnisConnect;
    socket.connect();

    socket.onOpen(() => {
      const isConnected = socket.isConnected();
      storeConnectionStatus(isConnected);
    });

    socket.onError(() => {
      dispatchDisconnected();
    });

    socket.onClose(() => {
      dispatchDisconnected();
    });

    return socket;
  }

  function dispatchDisconnected() {
    const isConnected = getIsConnected();

    if (isConnected !== false) {
      storeConnectionStatus(false);
    }
  }

  function makeParams(token?: string | null) {
    const params = {
      session_id: getSessionId(),
    } as {
      token?: string;
      session_id: string;
    };

    if (token) {
      params.token = token;
    }

    return { params };
  }

  return ebnisConnect(connToken);
};

export function getSocket({
  forceReconnect,
  ebnisGlobals,
  ...params
}: DefineParams = {}) {
  let socket: AppSocket;

  if (forceReconnect) {
    socket = defineSocket(params);
  } else if (ebnisGlobals) {
    const { appSocket } = ebnisGlobals;

    socket = appSocket ? appSocket : defineSocket(params);
  } else {
    socket = defineSocket(params);
  }

  if (ebnisGlobals) {
    ebnisGlobals.appSocket = socket;
  }

  return socket;
}

interface DefineParams {
  uri?: string;
  token?: string | null;
  forceReconnect?: boolean;
  ebnisGlobals?: EbnisGlobals;
}
