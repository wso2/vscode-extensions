// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { tool } from 'ai';
import { z } from 'zod';
import axios, { AxiosError, AxiosResponse, AxiosResponseHeaders, RawAxiosResponseHeaders } from 'axios';
import { CopilotEventHandler } from '../utils/events';

export const HTTP_REQUEST_TOOL_NAME = "Send-HTTP-request";


export const HTTPInputSchema = z.object({
    method: z.string().describe("HTTP method (GET, POST, etc.)"),
    url: z.string().describe("Valid URL to send the request to. query and path parameters should be injected in the url if any"),
    headers: z.record(z.string(), z.string()).describe("Optional HTTP headers").optional(),
    body: z.string().describe("Optional request body").optional(),
    tag: z.string().describe("A suitable tag to identify and group this request with similar requests for better retrieval in future").optional()
});

export type HTTPInput = z.infer<typeof HTTPInputSchema>;

type HTTPResponse = {
    data: unknown;
    status: number;
    statusText: string;
    headers: RawAxiosResponseHeaders | AxiosResponseHeaders;
};
type HTTPErrorResponse = {
    message: string;
    code?: string;
    response?: HTTPResponse
};

function createSuccessResponse(response: AxiosResponse): HTTPResponse {
    return {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
    };
}

function createErrorResponse(error: AxiosError): HTTPErrorResponse {
    return {
        message: error.message,
        code: error.code,
        response: error.response ? createSuccessResponse(error.response) : undefined
    };
}

export function createHttpRequestTool(eventHandler: CopilotEventHandler) {
    return tool({
        description: `A tool to make requests to a given API endpoint. Provide the endpoint URL and request details to get a response. Use this tool for testing and debugging HTTP endpoints.`,
        inputSchema: HTTPInputSchema,
        execute: (input) => executeHttpRequest(input, eventHandler)
    });
}

export const executeHttpRequest =  async (input: HTTPInput, eventHandler: CopilotEventHandler): Promise<HTTPResponse | HTTPErrorResponse | Error> => {
            try {
                console.log(`Executing HTTP request: input:`, input);
                eventHandler({type:"tool_call", toolName: HTTP_REQUEST_TOOL_NAME, toolInput: input});
                const response = await axios.request({
                    method: input.method,
                    url: input.url,
                    headers: input.headers,
                    data: input.body
                });
                console.log("HTTP request successful:", response);
                const successResponse = createSuccessResponse(response);
                return successResponse;
            } catch (error) {
                console.error("HTTP request failed:", error);
                if (axios.isAxiosError(error)) {
                    const errorResponse = createErrorResponse(error);
                    return errorResponse;
                }
                return error as Error;
            }
        };
