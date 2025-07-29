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

import { BallerinaExtension, ExtendedLangClient, TelemetryTracker } from "../../core";
import { debug } from "../../utils";
import { window } from "vscode";

const schedule = require('node-schedule');

// Language server telemetry event types
const TM_EVENT_TYPE_ERROR = "ErrorTelemetryEvent";
const TM_EVENT_TYPE_FEATURE_USAGE = "FeatureUsageTelemetryEvent";

export function activate(ballerinaExtInstance: BallerinaExtension) {
    const langClient = <ExtendedLangClient>ballerinaExtInstance.langClient;

    // Start listening telemtry events from language server
    langClient.onNotification('telemetry/event', (event: LSTelemetryEvent) => {
        let props: { [key: string]: string; };
        switch (event.type) {
            case TM_EVENT_TYPE_ERROR:
                const errorEvent: LSErrorTelemetryEvent = <LSErrorTelemetryEvent>event;
                props["ballerina.langserver.error.description"] = errorEvent.message;
                props["ballerina.langserver.error.stacktrace"] = errorEvent.errorStackTrace;
                props["ballerina.langserver.error.message"] = errorEvent.errorMessage;
                break;
            case TM_EVENT_TYPE_FEATURE_USAGE:
                const usageEvent: LSFeatureUsageTelemetryEvent = <LSFeatureUsageTelemetryEvent>event;
                props["ballerina.langserver.feature.name"] = usageEvent.featureName;
                props["ballerina.langserver.feature.class"] = usageEvent.featureClass;
                props["ballerina.langserver.feature.message"] = usageEvent.featureMessage;
                break;
            default:
                // Do nothing
                break;
        }
    });

    if (ballerinaExtInstance?.getCodeServerContext().codeServerEnv) {
        schedule.scheduleJob('* * * * *', function () {
            debug(`Publish LS client telemetry at ${new Date()}`);
            const telemetryTracker: TelemetryTracker = ballerinaExtInstance.getCodeServerContext().telemetryTracker!;
            if (telemetryTracker.hasTextEdits()) {
            }
            if (telemetryTracker.hasDiagramEdits()) {
            }
            telemetryTracker.reset();
        });
    }

    //editor-terminal-kill
    window.onDidCloseTerminal(t => {
    });
}

interface LSTelemetryEvent {
    type: string;
    component: string;
    version: string;
}

interface LSErrorTelemetryEvent extends LSTelemetryEvent {
    message: string;
    errorMessage: string;
    errorStackTrace: string;
}

interface LSFeatureUsageTelemetryEvent extends LSTelemetryEvent {
    featureName: string;
    featureClass: string;
    featureMessage: string;
}
