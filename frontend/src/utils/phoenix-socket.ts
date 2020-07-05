/* istanbul ignore file */
import { Socket as PhoenixSocket } from "phoenix";
import { getBackendUrls } from "./get-backend-urls";
import { storeConnectionStatus } from "./connections";

export interface AppSocket extends PhoenixSocket {
  ebnisConnect: (token?: string | null) => AppSocket;
}

let socket: AppSocket;

export const defineSocket = ({ uri, token: connToken }: DefineParams) => {
  // if we are disconnected, phoenix will keep trying to connect using
  // exponential back off which means
  // we will keep dispatching disconnect.  So we track if we already dispatched
  // disconnect (isDisconnected = true) and if so we do not send another
  // message.  We only dispatch the message if isDisconnected = false.
  let isDisconnected = false;

  function ebnisConnect(token?: string | null) {
    const params = makeParams(token);
    socket = new PhoenixSocket(
      getBackendUrls(uri).websocketUrl,
      params
    ) as AppSocket;

    socket.ebnisConnect = ebnisConnect;
    socket.connect();

    socket.onOpen(() => {
      dispatchConnected();
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
    if (isDisconnected === false) {
      storeConnectionStatus(false);
      isDisconnected = true;
    }
  }

  function dispatchConnected() {
    storeConnectionStatus(socket.isConnected());

    isDisconnected = !socket.isConnected();
  }

  function makeParams(token?: string | null) {
    const params = {} as { token?: string };

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
