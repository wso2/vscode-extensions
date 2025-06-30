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
 */

export interface ValidateBreakpointsRequest {
    filePath: string;
    breakpoints: BreakpointPosition[];
}

export interface BreakpointPosition {
    line: number;
    column?: number;
}

export interface BreakpointValidity {
    line: number;
    valid: boolean;
    reason?: string;
    column?: number;
}

export interface ValidateBreakpointsResponse {
    breakpointValidity: BreakpointValidity[];
}

export interface GetBreakpointInfoRequest {
    filePath: string;
    breakpoints: BreakpointPosition[];
}

export interface GetBreakpointInfoResponse {
    breakpointInfo: BreakpointInfo[];
}

export interface AddBreakpointToSourceRequest {
    filePath: string;
    breakpoint: BreakpointPosition;
}

export interface AddBreakpointToSourceResponse {
    isBreakpointValid: boolean;
}

export interface GetBreakpointsRequest {
    filePath: string;
}

export interface GetBreakpointsResponse {
    breakpoints: BreakpointPosition[];
    activeBreakpoint: BreakpointPosition;
}

export interface StepOverBreakpointRequest {
    filePath: string;
    breakpoint: BreakpointPosition;
}

export interface StepOverBreakpointResponse {
    stepOverBreakpoints: BreakpointPosition[];
}

export interface RemoveBreakpointFromSourceRequest {
    filePath: string;
    breakpoint: BreakpointPosition;
}

export interface BreakpointInfo {
    sequence?: SequenceBreakpoint;
    template?: TemplateBreakpoint;
    command?: string;
    "command-argument"?: string;
    "mediation-component": string;
}

export interface SequenceBreakpoint {
    api?: ApiBreakpoint;
    proxy?: ProxyBreakpoint;
    inbound?: InboundEndpointBreakpoint;
    "sequence-type": string;
    "sequence-key": string;
    "mediator-position": string;
}

export interface ApiBreakpoint {
    "api-key": string;
    "resource": {
        "method": string;
        "uri-template": string;
        "url-mapping": string;
    };
    "sequence-type": string;
    "mediator-position": string;
}

export interface ProxyBreakpoint {
    "proxy-key": string;
    "sequence-type": string;
    "mediator-position": string;
}

export interface InboundEndpointBreakpoint {
    "inbound-key": string;
    "sequence-type": string;
    "mediator-position": string;
}

export interface TemplateBreakpoint {
    "template-key": string;
    "mediator-position": string;
}
