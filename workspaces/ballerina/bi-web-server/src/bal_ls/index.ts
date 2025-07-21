import { WebSocketServer } from "ws";
import { IncomingMessage, Server } from "node:http";
import { URL } from "node:url";
import { Socket } from "node:net";
import {
  type IWebSocket,
  RequestMessage,
  WebSocketMessageReader,
  WebSocketMessageWriter,
} from "vscode-ws-jsonrpc";
import {
  createConnection,
  createServerProcess,
  forward,
} from "vscode-ws-jsonrpc/lib/server";
import {
  Message,
  InitializeRequest,
  type InitializeResult,
  type InitializeParams,
  RegistrationParams,
  RegistrationRequest,
} from "vscode-languageserver-protocol";
import { LanguageName, LanguageServerRunConfig, SCHEME } from "./models";
import {
  getBallerinaHome,
  resolveAbsolutePath,
  resolveNotification,
  resolveRequestPath,
  resolveResponseMessage,
} from "./utils";
import { URI } from "vscode-uri";
import os from "os";
import { BASE_DIR } from "../file_system/fsRoutes";

export const runBalServer = async (httpServer: Server) => {
  let runCommand = "bal";
  const runCommandArgs: string[] = [];
  if (os.platform() === "win32") {
    runCommand = "cmd.exe";
    runCommandArgs.push(...["/c", "bal.bat"]);
  }
  runCommandArgs.push("start-language-server");

  runLanguageServer(
    {
      serverName: "bal",
      pathName: "/bal",
      serverPort: 9090,
      runCommand: runCommand,
      runCommandArgs: runCommandArgs,
      spawnOptions: {
        shell: true,
      },
      wsServerOptions: {
        noServer: true,
        perMessageDeflate: false,
        clientTracking: true,
      },
      logMessages: true,
    },
    (httpServer = httpServer)
  );
};

export const runLanguageServer = (
  languageServerRunConfig: LanguageServerRunConfig,
  httpServer: Server
) => {
  process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception: ", err.toString());
    if (err.stack !== undefined) {
      console.error(err.stack);
    }
  });

  const wss = new WebSocketServer(languageServerRunConfig.wsServerOptions);
  upgradeWsServer(languageServerRunConfig, {
    server: httpServer,
    wss,
  });
};

export const upgradeWsServer = (
  runconfig: LanguageServerRunConfig,
  config: { server: Server; wss: WebSocketServer }
) => {
  config.server.on(
    "upgrade",
    (request: IncomingMessage, socket: Socket, head: Buffer) => {
      const baseURL = `http://${request.headers.host}/`;
      const pathName =
        request.url !== undefined
          ? new URL(request.url, baseURL).pathname
          : undefined;

      if (pathName === runconfig.pathName) {
        config.wss.handleUpgrade(request, socket, head, (webSocket) => {
          const socket: IWebSocket = {
            send: (content) =>
              webSocket.send(content, (error) => {
                if (error) {
                  throw error;
                }
              }),
            onMessage: (cb) =>
              webSocket.on("message", (data) => {
                cb(data);
              }),
            onError: (cb) => webSocket.on("error", cb),
            onClose: (cb) => webSocket.on("close", cb),
            dispose: () => webSocket.close(),
          };
          // launch the server when the web socket is opened
          if (webSocket.readyState === webSocket.OPEN) {
            launchLanguageServer(runconfig, socket);
          } else {
            webSocket.on("open", () => {
              launchLanguageServer(runconfig, socket);
            });
          }
        });
      }
    }
  );
};

export const launchLanguageServer = (
  runconfig: LanguageServerRunConfig,
  socket: IWebSocket
) => {
  const reader = new WebSocketMessageReader(socket);
  const writer = new WebSocketMessageWriter(socket);
  const socketConnection = createConnection(reader, writer, () =>
    socket.dispose()
  );

  const { serverName, runCommand, runCommandArgs, spawnOptions } = runconfig;
  const serverConnection = createServerProcess(
    serverName,
    runCommand,
    runCommandArgs,
    spawnOptions
  );

  if (serverConnection !== undefined) {
    forward(socketConnection, serverConnection, (message) => {
      console.log("Message received by server: ", message);
      message = resolveAbsolutePath(JSON.stringify(message));
      if (Message.isRequest(message)) {
        let reqMessage = resolveRequestPath(message);
        if (runconfig.logMessages ?? false) {
          console.log(`${serverName} Server received: ${reqMessage.method}`);
          console.log(reqMessage);
        }
        if (runconfig.requestMessageHandler !== undefined) {
          return runconfig.requestMessageHandler(reqMessage);
        }
      } else if (Message.isResponse(message)) {
        let resMessage = resolveResponseMessage(message);
        if (runconfig.logMessages ?? false) {
          console.log("tring to sent response by server");
          console.log(`${serverName} Servering sent:`);
          console.log(resMessage);
        }
        if (runconfig.responseMessageHandler !== undefined) {
          return runconfig.responseMessageHandler(resMessage);
        }
      } else if (Message.isNotification(message)) {
        if (runconfig.logMessages ?? false) {
          console.log(`${serverName} Server sent/received notification:`);
          console.log(message);
          resolveNotification(message);
          console.log("after resolveNotification", message);
        }
        if (runconfig.NotificationMessageHandler !== undefined) {
          return runconfig.NotificationMessageHandler(message);
        }
      }
      return message;
    });
  }
};
