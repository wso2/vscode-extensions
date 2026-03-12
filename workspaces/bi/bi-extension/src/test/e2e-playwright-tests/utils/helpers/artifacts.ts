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

import { getWebview } from "./webview";
import { page } from "./setup";

/**
 * Add an artifact to the project
 */
export async function addArtifact(artifactName: string, testId: string) {
    console.log(`Adding artifact: ${artifactName}`);
    const artifactWebView = await getWebview('WSO2 Integrator: BI', page);
    if (!artifactWebView) {
        throw new Error('WSO2 Integrator: BI webview not found');
    }
    // Navigate to the overview page
    await artifactWebView.getByRole('button', { name: ' Add Artifact' }).click();
    // how to get element by id
    const addArtifactBtn = artifactWebView.locator(`#${testId}`);
    await addArtifactBtn.waitFor();
    await addArtifactBtn.click();
}

/**
 * Enable ICP (Integration Control Plane)
 */
export async function enableICP() {
    console.log('Enabling ICP');
    const webview = await getWebview('WSO2 Integrator: BI', page);
    if (!webview) {
        throw new Error('WSO2 Integrator: BI webview not found');
    }
    const icpToggle = webview.getByRole('checkbox', { name: 'Enable WSO2 Integrator: ICP' });
    await icpToggle.waitFor();
    if (!(await icpToggle.isChecked())) {
        await icpToggle.click();
    }
}
