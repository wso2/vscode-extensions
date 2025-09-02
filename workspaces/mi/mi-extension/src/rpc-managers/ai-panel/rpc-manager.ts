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

import {
    GetBackendRootUrlResponse,
    MIAIPanelAPI
} from '@wso2/mi-core';
import {RUNTIME_VERSION_440} from "../../constants";
import {compareVersions, getMIVersionFromPom} from "../../util/onboardingUtils";

export class MIAIPanelRpcManager implements MIAIPanelAPI {
    constructor(private projectUri: string) { }

    async getBackendRootUrl(): Promise<GetBackendRootUrlResponse> {
        const MI_COPILOT_BACKEND_V2 = process.env.MI_COPILOT_BACKEND_V2 as string;
        const MI_COPILOT_BACKEND_V3 = process.env.MI_COPILOT_BACKEND_V3 as string;
        const RUNTIME_THRESHOLD_VERSION = RUNTIME_VERSION_440;
        const runtimeVersion = await getMIVersionFromPom(this.projectUri);

        const isVersionThresholdReached = runtimeVersion ? compareVersions(runtimeVersion, RUNTIME_THRESHOLD_VERSION) : -1;

        return isVersionThresholdReached < 0 ? { url: MI_COPILOT_BACKEND_V2 } : { url: MI_COPILOT_BACKEND_V3 };
    }
}
