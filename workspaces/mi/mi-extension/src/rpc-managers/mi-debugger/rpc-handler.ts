/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
 * 
 * THIS FILE INCLUDES AUTO GENERATED CODE
 */
import {
    AddBreakpointToSourceRequest,
    GetBreakpointInfoRequest,
    GetBreakpointsRequest,
    RemoveBreakpointFromSourceRequest,
    StepOverBreakpointRequest,
    ValidateBreakpointsRequest,
    addBreakpointToSource,
    getBreakpointInfo,
    getBreakpoints,
    getStepOverBreakpoint,
    removeBreakpointFromSource,
    validateBreakpoints
} from "@wso2/mi-core";
import { Messenger } from "vscode-messenger";
import { MiDebuggerRpcManager } from "./rpc-manager";

export function registerMiDebuggerRpcHandlers(messenger: Messenger, projectUri: string): void {
    const rpcManger = new MiDebuggerRpcManager(projectUri);
    messenger.onRequest(validateBreakpoints, (args: ValidateBreakpointsRequest) => rpcManger.validateBreakpoints(args));
    messenger.onRequest(getBreakpointInfo, (args: GetBreakpointInfoRequest) => rpcManger.getBreakpointInfo(args));
    messenger.onRequest(addBreakpointToSource, (args: AddBreakpointToSourceRequest) => rpcManger.addBreakpointToSource(args));
    messenger.onRequest(getBreakpoints, (args: GetBreakpointsRequest) => rpcManger.getBreakpoints(args));
    messenger.onRequest(getStepOverBreakpoint, (args: StepOverBreakpointRequest) => rpcManger.getStepOverBreakpoint(args));
    messenger.onNotification(removeBreakpointFromSource, (args: RemoveBreakpointFromSourceRequest) => rpcManger.removeBreakpointFromSource(args));
}
