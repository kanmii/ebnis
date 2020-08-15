/* istanbul ignore file */
import { Socket as PhoenixSocket } from "phoenix";
import { getBackendUrls } from "./get-backend-urls";
import { storeConnectionStatus, getIsConnected } from "./connections";
import { getSessionId } from "./session-manager";

export interface AppSocket extends PhoenixSocket {
  ebnisConnect: (token?: string | null) => AppSocket;
}

let socket: AppSocket;

export const defineSocket = ({ uri, token: connToken }: DefineParams) => {
  function ebnisConnect(token?: string | null) {
    const params = makeParams(token);
    socket = new PhoenixSocket(
      getBackendUrls(uri).websocketUrl,
      params,
    ) as AppSocket;

    socket.ebnisConnect = ebnisConnect;
    socket.connect();

    socket.onOpen(() => {
      storeConnectionStatus(socket.isConnected());
    });

    socket.onError(() => {
      dispatchDisconnected();
    });

    socket.onClose(() => {
      dispatchDisconnected();
    });

    return socket;
  }

  ebnisConnect(connToken);

  function dispatchDisconnected() {
    const isConnected = getIsConnected();

    if (isConnected) {
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

  return socket;
};

export function getSocket({ forceReconnect, ...params }: DefineParams = {}) {
  if (forceReconnect) {
    return defineSocket(params);
  }

  return socket ? socket : defineSocket(params);
}

interface DefineParams {
  uri?: string;
  token?: string | null;
  forceReconnect?: boolean;
}
