/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { WebSocket, WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import { timingSafeEqual } from 'crypto';
import type { ProxyEnvelope, TransportMode } from './types';
import type * as vscode from 'vscode';

export type { ProxyEnvelope, TransportMode } from './types';

const DEFAULT_WS_PORT = 8787;
// Bind the backend to the loopback interface only. The webview client always
// connects to `127.0.0.1`, so listening on all interfaces would needlessly
// expose the socket to other hosts on the network.
const DEFAULT_WS_HOST = '127.0.0.1';
const DEFAULT_WS_URL_BASE = 'ws://127.0.0.1';
const INVALID_JSON_PAYLOAD_ERROR = 'Invalid JSON payload.';
const WEBSOCKET_PROXY_ERROR = 'WebSocket proxy error';
const AUTH_TOKEN_QUERY_KEY = 'token';

/**
 * Constant-time comparison of a client-supplied token against the expected
 * value. Returns `false` for length mismatches instead of throwing.
 */
function tokensMatch(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

/**
 * Extracts the `token` query parameter from an upgrade request URL.
 */
function readRequestToken(req: IncomingMessage): string | undefined {
  try {
    const url = new URL(req.url ?? '', 'ws://127.0.0.1');
    return url.searchParams.get(AUTH_TOKEN_QUERY_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

type WebSocketLike = {
  readyState: number;
  send: (payload: string) => void;
  close: () => void;
  on: (event: 'open' | 'close' | 'error' | 'message', listener: (...args: unknown[]) => void) => void;
  once: (event: 'open', listener: () => void) => void;
};

type WebSocketLikeConstructor = new (url: string) => WebSocketLike;

type InProcessProxyBridgeOptions<TRequest, TResponse> = {
  postMessage: (message: ProxyEnvelope) => void;
  handleRequest: (request: TRequest) => TResponse | void | Promise<TResponse | void>;
  deserialize?: (payload: string) => TRequest;
  serialize?: (payload: TResponse) => string;
  onConnect?: () => TResponse | undefined;
};

type WsProxyBridgeOptions = {
  serverUrl: string;
  postMessage: (message: ProxyEnvelope) => void;
  WebSocketImpl?: WebSocketLikeConstructor;
};

type WebSocketBackendOptions<TRequest, TResponse> = {
  port?: number;
  /** Interface to bind. Defaults to loopback (`127.0.0.1`). */
  host?: string;
  /** When set, connections must present a matching `token` query parameter. */
  authToken?: string;
  handleRequest: (request: TRequest) => TResponse | void | Promise<TResponse | void>;
  deserialize?: (payload: string) => TRequest;
  serialize?: (payload: TResponse) => string;
  initialResponse?: () => TResponse | undefined;
};

type ExtensionTransportManagerOptions<TRequest, TResponse> = {
  /** Initial transport mode used by the manager. Defaults to `proxy`. */
  initialMode?: TransportMode;
  /** Port used when starting the internal WebSocket backend. */
  wsPort?: number;
  /** Interface the internal WebSocket backend binds to. Defaults to `127.0.0.1`. */
  wsHost?: string;
  /**
   * When set, the internal WebSocket backend rejects connections that do not
   * present a matching `token` query parameter, and the value is surfaced in
   * `getWebviewBootstrap()` so the webview client can supply it.
   */
  authToken?: string;
  /** Base URL used to derive bootstrap websocket host metadata. */
  wsUrlBase?: string;
  /** Core request handler for inbound messages. */
  handleRequest: (request: TRequest) => TResponse | void | Promise<TResponse | void>;
  /** Inbound payload parser override. */
  deserialize?: (payload: string) => TRequest;
  /** Outbound payload serializer override. */
  serialize?: (payload: TResponse) => string;
  /** Optional initial state provider sent on connect. */
  initialResponse?: () => TResponse | undefined;
};

type TransportBridge = {
  handleEnvelope: (message: ProxyEnvelope) => void;
  dispose: () => void;
};

type DisposableLike = {
  dispose: () => void;
};

type WebviewLike = {
  postMessage: (message: ProxyEnvelope) => unknown;
  onDidReceiveMessage: (listener: (message: ProxyEnvelope) => void) => DisposableLike;
};

type WebviewPanelLike = {
  webview: WebviewLike;
  onDidDispose: (listener: () => void) => DisposableLike;
};

type VsCodeWebviewPanelLike = vscode.WebviewPanel;

type RpcRequestEnvelope = {
  kind: 'rpc.request';
  id: string;
  payload: string;
};

type RpcResponseEnvelope = {
  kind: 'rpc.response';
  id: string;
  payload: string;
};

function tryParseRpcRequest(payload: string): RpcRequestEnvelope | undefined {
  try {
    const parsed = JSON.parse(payload) as Partial<RpcRequestEnvelope>;
    if (parsed.kind === 'rpc.request' && typeof parsed.id === 'string' && typeof parsed.payload === 'string') {
      return parsed as RpcRequestEnvelope;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function serializeRpcResponse(id: string, payload: string): string {
  const response: RpcResponseEnvelope = {
    kind: 'rpc.response',
    id,
    payload
  };

  return JSON.stringify(response);
}

function toPayloadText(raw: unknown): string {
  if (typeof raw === 'string') {
    return raw;
  }

  if (Array.isArray(raw)) {
    return raw.map((chunk) => toPayloadText(chunk)).join('');
  }

  if (raw instanceof ArrayBuffer) {
    return Buffer.from(raw).toString('utf8');
  }

  if (ArrayBuffer.isView(raw)) {
    return Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength).toString('utf8');
  }

  return String(raw ?? '');
}

function createWsProxyBridge(options: WsProxyBridgeOptions) {
  const WebSocketImpl = options.WebSocketImpl ?? (WebSocket as unknown as WebSocketLikeConstructor);
  let socket: WebSocketLike | undefined;
  let closed = false;

  const connect = () => {
    if (socket || closed) {
      return;
    }

    const nextSocket = new WebSocketImpl(options.serverUrl);
    socket = nextSocket;

    nextSocket.on('open', () => {
      options.postMessage({ channel: 'ws-proxy.open' });
    });

    nextSocket.on('close', () => {
      options.postMessage({ channel: 'ws-proxy.close' });
      socket = undefined;
    });

    nextSocket.on('error', (error) => {
      const message = error instanceof Error ? error.message : WEBSOCKET_PROXY_ERROR;
      options.postMessage({ channel: 'ws-proxy.error', message });
    });

    nextSocket.on('message', (data) => {
      options.postMessage({ channel: 'ws-proxy.message', payload: toPayloadText(data) });
    });
  };

  return {
    handleEnvelope(message: ProxyEnvelope) {
      switch (message.channel) {
        case 'ws-proxy.connect': {
          connect();
          break;
        }
        case 'ws-proxy.send': {
          connect();
          if (!socket) {
            options.postMessage({ channel: 'ws-proxy.error', message: 'Socket unavailable.' });
            return;
          }

          const sendNow = () => {
            socket?.send(message.payload);
          };

          if (socket.readyState === WebSocket.OPEN) {
            sendNow();
          } else {
            socket.once('open', sendNow);
          }
          break;
        }
        case 'ws-proxy.disconnect': {
          socket?.close();
          socket = undefined;
          break;
        }
        default:
          break;
      }
    },
    dispose() {
      closed = true;
      socket?.close();
      socket = undefined;
    }
  };
}

function createInProcessProxyBridge<TRequest, TResponse>(
  options: InProcessProxyBridgeOptions<TRequest, TResponse>
) {
  const deserialize = options.deserialize ?? ((payload: string) => JSON.parse(payload) as TRequest);
  const serialize = options.serialize ?? ((payload: TResponse) => JSON.stringify(payload));

  return {
    handleEnvelope(message: ProxyEnvelope) {
      switch (message.channel) {
        case 'ws-proxy.connect': {
          options.postMessage({ channel: 'ws-proxy.open' });
          const initial = options.onConnect?.();
          if (initial !== undefined) {
            options.postMessage({ channel: 'ws-proxy.message', payload: serialize(initial) });
          }
          break;
        }
        case 'ws-proxy.send': {
          const handle = async () => {
            const request = deserialize(message.payload);
            const response = await options.handleRequest(request);
            if (response !== undefined) {
              options.postMessage({ channel: 'ws-proxy.message', payload: serialize(response) });
            }
          };

          void handle().catch(() => {
            options.postMessage({ channel: 'ws-proxy.error', message: INVALID_JSON_PAYLOAD_ERROR });
          });
          break;
        }
        case 'ws-proxy.disconnect': {
          options.postMessage({ channel: 'ws-proxy.close' });
          break;
        }
        default:
          break;
      }
    },
    dispose() { }
  };
}

function createWsBackend<TRequest, TResponse>(options: WebSocketBackendOptions<TRequest, TResponse>) {
  const port = options.port ?? DEFAULT_WS_PORT;
  const host = options.host ?? DEFAULT_WS_HOST;
  const authToken = options.authToken;
  const deserialize = options.deserialize ?? ((payload: string) => JSON.parse(payload) as TRequest);
  const serialize = options.serialize ?? ((payload: TResponse) => JSON.stringify(payload));

  const server = new WebSocketServer({
    port,
    host,
    // Reject the upgrade during the handshake when a token is required and the
    // client did not present a matching one. This gates both requests and any
    // broadcast traffic, and — because a cross-site page cannot know the
    // token — also defends against cross-site WebSocket hijacking.
    verifyClient: authToken
      ? (info: { req: IncomingMessage }) => {
        const provided = readRequestToken(info.req);
        return provided !== undefined && tokensMatch(provided, authToken);
      }
      : undefined
  });
  // Binding to an explicit host puts Node on the `listen(port, host)` path,
  // which resolves the host before binding. The socket is therefore not bound
  // yet and `address()` returns null in this tick, so the assigned port has to
  // be read once the server reports `listening`. Callers await `ready` before
  // relying on `port` (it matters most for `port: 0`, where the OS picks one).
  let resolvedPort = port;

  const readAssignedPort = () => {
    const address = server.address();
    if (address && typeof address !== 'string') {
      resolvedPort = address.port;
    }
  };

  readAssignedPort();

  const ready = new Promise<number>((resolve, reject) => {
    if (server.address()) {
      resolve(resolvedPort);
      return;
    }

    // Settle on every terminal outcome, including `close` — disposing before the
    // bind completes would otherwise leave this promise pending forever and hang
    // anyone awaiting it.
    const settle = (finish: () => void) => {
      server.off('listening', onListening);
      server.off('error', onError);
      server.off('close', onClose);
      finish();
    };

    const onListening = () => settle(() => {
      readAssignedPort();
      resolve(resolvedPort);
    });

    const onError = (error: Error) => settle(() => {
      reject(error instanceof Error ? error : new Error('Failed to allocate the WebSocket port.'));
    });

    const onClose = () => settle(() => {
      reject(new Error('WebSocket server closed before it finished binding.'));
    });

    server.on('listening', onListening);
    server.on('error', onError);
    server.on('close', onClose);
  });

  const send = (socket: WebSocket, payload: TResponse) => {
    socket.send(serialize(payload));
  };

  const broadcast = (payload: TResponse) => {
    const text = serialize(payload);
    for (const client of server.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(text);
      }
    }
  };

  server.on('connection', (socket) => {
    const initial = options.initialResponse?.();
    if (initial !== undefined) {
      send(socket, initial);
    }

    socket.on('message', (raw) => {
      const handle = async () => {
        const text = toPayloadText(raw);
        const rpcRequest = tryParseRpcRequest(text);
        if (rpcRequest) {
          // Always reply with a correlated response so the webview's `request()`
          // never hangs — even when the handler returns undefined or throws.
          let payload: string;
          try {
            const request = deserialize(rpcRequest.payload);
            const response = await options.handleRequest(request);
            payload = serialize((response === undefined ? null : response) as TResponse);
          } catch {
            payload = serialize(null as unknown as TResponse);
          }
          socket.send(serializeRpcResponse(rpcRequest.id, payload));
          return;
        }

        const request = deserialize(text);
        const response = await options.handleRequest(request);
        if (response !== undefined) {
          broadcast(response);
        }
      };

      void handle().catch(() => {
        socket.send(JSON.stringify({ type: 'error', message: INVALID_JSON_PAYLOAD_ERROR }));
      });
    });
  });

  return {
    /** Assigned port. Accurate once `ready` has resolved. */
    get port() {
      return resolvedPort;
    },
    ready,
    broadcastResponse(payload: TResponse) {
      broadcast(payload);
    },
    dispose() {
      server.close();
    }
  };
}

/**
 * Creates the extension-side transport manager.
 *
 * The manager centralizes panel registration, request handling, publish flows,
 * and optional internal WebSocket backend lifecycle.
 */
export function createExtensionTransportManager<TRequest, TResponse>(
  options: ExtensionTransportManagerOptions<TRequest, TResponse>
) {
  const wsUrlBase = options.wsUrlBase ?? DEFAULT_WS_URL_BASE;
  const wsPort = options.wsPort ?? DEFAULT_WS_PORT;
  const wsHost = options.wsHost ?? DEFAULT_WS_HOST;
  const authToken = options.authToken;
  const deserialize = options.deserialize ?? ((payload: string) => JSON.parse(payload) as TRequest);
  const serialize = options.serialize ?? ((payload: TResponse) => JSON.stringify(payload));
  let mode: TransportMode = options.initialMode ?? 'proxy';
  const proxyClients = new Set<(message: ProxyEnvelope) => void>();
  let backend:
    | {
      readonly port: number;
      ready: Promise<number>;
      broadcastResponse: (payload: TResponse) => void;
      dispose: () => void;
    }
    | undefined;

  const publishToProxy = (response: TResponse) => {
    const payload = serialize(response);
    for (const postMessage of proxyClients) {
      postMessage({ channel: 'ws-proxy.message', payload });
    }
  };

  const resolveRequest = (request: TRequest) => Promise.resolve(options.handleRequest(request));

  const applyRequest = async (request: TRequest, source: 'proxy' | 'websocket') => {
    const response = await resolveRequest(request);
    if (response === undefined) {
      return undefined;
    }

    publishToProxy(response);

    if (source !== 'websocket' && backend) {
      backend.broadcastResponse(response);
    }

    return response;
  };

  const publish = (response: TResponse) => {
    publishToProxy(response);
    if (backend) {
      backend.broadcastResponse(response);
    }
  };

  /**
   * Starts the internal WebSocket backend and resolves with the bound port.
   *
   * The port is only known after the server reports `listening`, so callers
   * must await this before reading `getWebviewBootstrap()` when `wsPort` is 0.
   */
  const startWebSocketServer = (): Promise<number> => {
    if (backend) {
      return backend.ready;
    }

    const nextBackend = createWsBackend<TRequest, TResponse>({
      port: wsPort,
      host: wsHost,
      authToken,
      handleRequest: (request) => applyRequest(request, 'websocket'),
      deserialize,
      serialize,
      initialResponse: options.initialResponse
    });
    backend = nextBackend;

    // A backend that failed to bind must not be left in place: it would make
    // `isWebSocketServerRunning()` lie and pin every later call to the same
    // rejected promise, so the server could never be retried. Attaching this
    // handler also keeps the rejection observed when a caller ignores the
    // returned promise.
    nextBackend.ready.catch(() => {
      if (backend === nextBackend) {
        backend = undefined;
      }
      nextBackend.dispose();
    });

    return nextBackend.ready;
  };

  const registerWebviewInternal = (panel: WebviewPanelLike) => {
    const postMessage = (message: ProxyEnvelope) => {
      void panel.webview.postMessage(message);
    };

    proxyClients.add(postMessage);

    // The bootstrap (`ws-proxy.open` + initial state) is sent in response to the
    // webview's `ws-proxy.connect`, which the webview adapter always emits on
    // startup. Sending it here too would deliver the initial state twice.

    const receiveDisposable = panel.webview.onDidReceiveMessage((message: ProxyEnvelope) => {
      if (mode !== 'proxy') {
        return;
      }

      switch (message.channel) {
        case 'ws-proxy.connect': {
          postMessage({ channel: 'ws-proxy.open' });
          const initial = options.initialResponse?.();
          if (initial !== undefined) {
            postMessage({ channel: 'ws-proxy.message', payload: serialize(initial) });
          }
          break;
        }
        case 'ws-proxy.send': {
          const handle = async () => {
            const rpcRequest = tryParseRpcRequest(message.payload);
            if (rpcRequest) {
              // Always reply with a correlated response so the webview's
              // `request()` never hangs on undefined results or handler errors.
              let payload: string;
              try {
                const request = deserialize(rpcRequest.payload);
                const response = await resolveRequest(request);
                payload = serialize((response === undefined ? null : response) as TResponse);
              } catch {
                payload = serialize(null as unknown as TResponse);
              }
              postMessage({
                channel: 'ws-proxy.message',
                payload: serializeRpcResponse(rpcRequest.id, payload)
              });
              return;
            }

            const request = deserialize(message.payload);
            await applyRequest(request, 'proxy');
          };

          void handle().catch(() => {
            postMessage({ channel: 'ws-proxy.error', message: INVALID_JSON_PAYLOAD_ERROR });
          });
          break;
        }
        case 'ws-proxy.disconnect': {
          postMessage({ channel: 'ws-proxy.close' });
          break;
        }
        default:
          break;
      }
    });

    const panelDisposeDisposable = panel.onDidDispose(() => {
      proxyClients.delete(postMessage);
      receiveDisposable.dispose();
    });

    return {
      dispose() {
        proxyClients.delete(postMessage);
        panelDisposeDisposable.dispose();
        receiveDisposable.dispose();
      }
    };
  };

  return {
    /** Returns current runtime transport mode. */
    getMode() {
      return mode;
    },
    /**
     * Switches runtime transport mode. When switching to `websocket` the
     * returned promise resolves with the bound port; awaiting it is required
     * before `getWebviewBootstrap()` reports an OS-allocated port.
     */
    switchMode(nextMode: TransportMode): Promise<number> | undefined {
      const previousMode = mode;
      mode = nextMode;
      if (mode !== 'websocket') {
        return undefined;
      }

      return startWebSocketServer().catch((error: unknown) => {
        // The websocket transport never came up, and websocket mode silences the
        // proxy path, so staying here would leave the webview with no working
        // transport at all. Fall back to the mode we switched from.
        if (mode === 'websocket') {
          mode = previousMode;
        }

        throw error;
      });
    },
    /** Returns `true` when internal WebSocket backend is running. */
    isWebSocketServerRunning() {
      return Boolean(backend);
    },
    startWebSocketServer,
    /** Stops the internal WebSocket backend if active. */
    stopWebSocketServer() {
      backend?.dispose();
      backend = undefined;
    },
    publish,
    /**
     * Returns bootstrap metadata consumed by webview startup.
     *
     * Stays synchronous so it can be called while building webview HTML. It
     * reports the port the backend is actually bound to, so in `websocket` mode
     * `startWebSocketServer()` (or the promise from `switchMode('websocket')`)
     * must be awaited first; otherwise the configured `wsPort` is reported,
     * which is 0 when the OS is asked to allocate one.
     */
    getWebviewBootstrap() {
      const currentMode = mode;
      const port = backend?.port ?? wsPort;
      const server = wsUrlBase.replace(/^wss?:\/\//, '');
      return {
        mode: currentMode,
        wsServer: server,
        wsPort: port,
        wsToken: authToken
      };
    },
    createBridge(postMessage: (message: ProxyEnvelope) => void): TransportBridge {
      if (mode === 'websocket') {
        return {
          handleEnvelope() { },
          dispose() { }
        };
      }

      return createInProcessProxyBridge<TRequest, TResponse>({
        postMessage,
        handleRequest: options.handleRequest,
        deserialize: options.deserialize,
        serialize: options.serialize,
        onConnect: options.initialResponse
      });
    },
    registerWebviewPanel(panel: VsCodeWebviewPanelLike) {
      return registerWebviewInternal(panel);
    },
    /** Disposes manager resources and active backend. */
    dispose() {
      backend?.dispose();
      backend = undefined;
    }
  };
}
