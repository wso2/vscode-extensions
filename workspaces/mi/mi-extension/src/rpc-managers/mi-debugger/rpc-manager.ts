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
    AddBreakpointToSourceResponse,
    GetBreakpointInfoRequest,
    GetBreakpointInfoResponse,
    GetBreakpointsRequest,
    GetBreakpointsResponse,
    MiDebuggerAPI,
    RemoveBreakpointFromSourceRequest,
    StepOverBreakpointRequest,
    StepOverBreakpointResponse,
    ValidateBreakpointsRequest,
    ValidateBreakpointsResponse
} from "@wso2/mi-core";
import * as vscode from "vscode";
import { getStateMachine, refreshUI } from "../../stateMachine";

export class MiDebuggerRpcManager implements MiDebuggerAPI {
    constructor(private projectUri: string) { }

    async validateBreakpoints(params: ValidateBreakpointsRequest): Promise<ValidateBreakpointsResponse> {
        return new Promise(async (resolve) => {
            const langClient = getStateMachine(this.projectUri).context().langClient!;
            const definition = await langClient.validateBreakpoints(params);

            resolve(definition);
        });
    }

    async getBreakpointInfo(params: GetBreakpointInfoRequest): Promise<GetBreakpointInfoResponse> {
        return new Promise(async (resolve) => {
            const langClient = getStateMachine(this.projectUri).context().langClient!;
            const breakpointInfo = await langClient.getBreakpointInfo(params);

            resolve(breakpointInfo);
        });
    }

    async addBreakpointToSource(params: AddBreakpointToSourceRequest): Promise<AddBreakpointToSourceResponse> {
        return new Promise(async (resolve) => {
            const projectUri = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(params.filePath))?.uri.fsPath;
            if (!projectUri) {
                resolve({ isBreakpointValid: false });
                return;
            }
            const breakpoint = new vscode.SourceBreakpoint(
                new vscode.Location(vscode.Uri.file(params.filePath), new vscode.Position(params.breakpoint.line, params.breakpoint?.column || 0)));
            vscode.debug.addBreakpoints([breakpoint]);
            refreshUI(projectUri);

            resolve({ isBreakpointValid: true });
        });
    }

    async getBreakpoints(params: GetBreakpointsRequest): Promise<GetBreakpointsResponse> {
        return new Promise(async (resolve) => {
            const breakpointsForFile: vscode.SourceBreakpoint[] = vscode.debug.breakpoints.filter((breakpoint) => {
                const sourceBreakpoint = breakpoint as vscode.SourceBreakpoint;
                return sourceBreakpoint.location.uri.fsPath === params.filePath;
            }) as vscode.SourceBreakpoint[];

            const breakpoints = breakpointsForFile.map((breakpoint) => {
                return {
                    line: breakpoint.location.range.start.line,
                    column: breakpoint.location.range.start?.character
                };
            });


            // get the  current stackTrace to find the triggered breakpoint
            const debugSession = vscode.debug.activeDebugSession;
            let currentLine = 0;
            let currentColumn = 0;
            if (debugSession) {
                // Request the stack trace for the current thread
                const response = await debugSession.customRequest('stackTrace', {
                    threadId: 1,
                });

                if (response && response.stackFrames) {
                    // Check the first stack frame, as it represents the current execution point
                    const firstFrame = response.stackFrames[0];
                    const currentFile = firstFrame.source.path;
                    if (currentFile === params.filePath) {
                        // convert to debugger line since its zero based
                        currentLine = Math.max(0, firstFrame.line - 1);
                        currentColumn = Math.max(0, firstFrame?.column - 1);
                    }
                }
            }
            resolve({ breakpoints, activeBreakpoint: { line: currentLine, column: currentColumn } });
        });
    }

    async getStepOverBreakpoint(params: StepOverBreakpointRequest): Promise<StepOverBreakpointResponse> {
        return new Promise(async (resolve) => {
            const langClient = getStateMachine(this.projectUri).context().langClient!;
            const breakpointInfo = await langClient.getStepOverBreakpoint(params);

            resolve(breakpointInfo);
        });
    }

    removeBreakpointFromSource(params: RemoveBreakpointFromSourceRequest): void {
        const projectUri = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(params.filePath))?.uri.fsPath;
        if (!projectUri) {
            return;
        }

        const breakpointsForFile: vscode.SourceBreakpoint[] = vscode.debug.breakpoints.filter((breakpoint) => {
            const sourceBreakpoint = breakpoint as vscode.SourceBreakpoint;
            return sourceBreakpoint.location.uri.fsPath === params.filePath;
        }) as vscode.SourceBreakpoint[];

        const breakpoints = breakpointsForFile.filter((breakpoint) => {
            return breakpoint.location.range.start.line === params.breakpoint.line && breakpoint.location.range.start?.character === params.breakpoint?.column;
        });

        // If there are no breakpoints found, then it could be due the breakpoint has been added from the sourceCode, where the column is not provided
        // so we need to check for breakpoint with the same line and remove
        if (breakpoints.length === 0) {
            vscode.debug.removeBreakpoints(breakpointsForFile.filter((breakpoint) => {
                return breakpoint.location.range.start.line === params.breakpoint.line;
            }));
        } else {
            breakpoints.forEach((breakpoint) => {
                vscode.debug.removeBreakpoints([breakpoint]);
            });
        }

        refreshUI(projectUri);
    }
}
