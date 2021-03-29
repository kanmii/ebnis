/* istanbul ignore file */
import { AppSocket } from "@eb/shared/src/utils/types";
import { Socket as PhoenixSocket } from "phoenix";
import { getIsConnected, storeConnectionStatus } from "./utils/connections";
import { getBackendUrls, getOrMakeGlobals } from "./utils/globals";
import { getSessionId } from "./utils/session-manager";

const defineSocket = ({ uri, token: connToken }: DefineParams) => {
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

export function getSocket({ forceReconnect, ...params }: DefineParams) {
  let socket: AppSocket;
  const globals = getOrMakeGlobals();

  if (forceReconnect) {
    socket = defineSocket(params);
  } else if (globals && globals.appSocket) {
    socket = globals.appSocket;
  } else {
    socket = defineSocket(params);
  }

  if (globals) {
    globals.appSocket = socket;
  }

  return socket;
}

interface DefineParams {
  uri: string;
  token?: string | null;
  forceReconnect?: boolean;
}
