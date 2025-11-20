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

import { BallerinaExtension } from '../../../core';
import {
    sendTelemetryEvent,
    sendTelemetryException,
    TM_EVENT_AI_CODE_GENERATION_REQUEST,
    TM_EVENT_AI_CODE_GENERATION_STATUS,
    TM_EVENT_AI_ADD_TO_INTEGRATION,
    CMP_AI_PANEL
} from '../../telemetry';

export const AI_TELEMETRY_EVENTS = {
    GENERATION_REQUEST: TM_EVENT_AI_CODE_GENERATION_REQUEST,
    GENERATION_STATUS: TM_EVENT_AI_CODE_GENERATION_STATUS,
    ADD_TO_INTEGRATION: TM_EVENT_AI_ADD_TO_INTEGRATION,
} as const;

export class AITelemetryService {

    public static generationRequest(
        extension: BallerinaExtension,
        requestId: string,
        command: string,
    ): void {
        const customDimensions = {
            requestId,
            command
        };

        sendTelemetryEvent(
            extension,
            AI_TELEMETRY_EVENTS.GENERATION_REQUEST,
            CMP_AI_PANEL,
            customDimensions
        );
    }

    public static generationSucess(
        extension: BallerinaExtension,
        requestId: string,
        command: string
    ): void {
        const customDimensions = {
            requestId,
            command,
            status: 'success'
        };

        sendTelemetryEvent(
            extension,
            AI_TELEMETRY_EVENTS.GENERATION_STATUS,
            CMP_AI_PANEL,
            customDimensions
        );
    }

    public static generationError(
        extension: BallerinaExtension,
        requestId: string,
        command: string,
        errorMessage: string
    ): void {
        const customDimensions = {
            requestId,
            command,
            status: 'failed'
        };

        const error = new Error(errorMessage);
        sendTelemetryException(
            extension,
            error,
            CMP_AI_PANEL,
            customDimensions
        );
    }

    public static addToIntegration(
        extension: BallerinaExtension,
        requestId: string,
        fileCount: number
    ): void {
        const customDimensions = {
            requestId,
            fileCount: fileCount.toString()
        };

        sendTelemetryEvent(
            extension,
            AI_TELEMETRY_EVENTS.ADD_TO_INTEGRATION,
            CMP_AI_PANEL,
            customDimensions
        );
    }
}
