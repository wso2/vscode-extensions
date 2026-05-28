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

import { RPCLayer } from "../RPCLayer";
import { deleteStateMachine } from "../stateMachine";
import { deletePopupStateMachine } from "../stateMachinePopup";
import { webviews as visualizerWebviews } from "../visualizer/webview";
import { AiPanelWebview } from "../ai-features/webview";
import { RuntimeServicesWebview } from "../runtime-services-panel/webview";

// Tear down per-project state machines and the shared messenger when no
// webview on this project remains open. Safe to call from any panel's
// dispose path: self-skips while a sibling webview is still alive, so
// whichever panel closes last is responsible for cleanup.
export function disposeProjectResourcesIfOrphaned(projectUri: string): void {
    const hasSiblingWebview =
        visualizerWebviews.has(projectUri) ||
        AiPanelWebview.isOpenForProject(projectUri) ||
        RuntimeServicesWebview.webviews.has(projectUri);
    if (hasSiblingWebview) {
        return;
    }
    deleteStateMachine(projectUri);
    deletePopupStateMachine(projectUri);
    RPCLayer._messengers.delete(projectUri);
}
