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
import { ValidateBreakpointsRequest, ValidateBreakpointsResponse, GetBreakpointInfoRequest, GetBreakpointInfoResponse, AddBreakpointToSourceRequest, AddBreakpointToSourceResponse, GetBreakpointsRequest, GetBreakpointsResponse, StepOverBreakpointResponse, StepOverBreakpointRequest, RemoveBreakpointFromSourceRequest } from "./types";
import { RequestType, NotificationType } from "vscode-messenger-common";

const _preFix = "mi-debugger";
export const validateBreakpoints: RequestType<ValidateBreakpointsRequest, ValidateBreakpointsResponse> = { method: `${_preFix}/validateBreakpoints` };
export const getBreakpointInfo: RequestType<GetBreakpointInfoRequest, GetBreakpointInfoResponse> = { method: `${_preFix}/getBreakpointInfo` };
export const addBreakpointToSource: RequestType<AddBreakpointToSourceRequest, AddBreakpointToSourceResponse> = { method: `${_preFix}/addBreakpointToSource` };
export const getBreakpoints: RequestType<GetBreakpointsRequest, GetBreakpointsResponse> = { method: `${_preFix}/getBreakpoints` };
export const getStepOverBreakpoint: RequestType<StepOverBreakpointRequest, StepOverBreakpointResponse> = { method: `${_preFix}/getStepOverBreakpoint` };
export const removeBreakpointFromSource: NotificationType<RemoveBreakpointFromSourceRequest> = { method: `${_preFix}/removeBreakpointFromSource` };
