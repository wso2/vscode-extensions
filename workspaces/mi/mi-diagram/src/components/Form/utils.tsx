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

export function formatForConfigurable(value: string): string {
    return `$config:${value}`;
}
  
export function removeConfigurableFormat(formattedValue: string): string {
    const prefix = "$config:";
    if (formattedValue.startsWith(prefix)) {
        return formattedValue.slice(prefix.length);
    }
    return formattedValue;
}

export function isConfigurable(value: string): boolean {
    const pattern = /^\$config:/;
    return pattern.test(value);
}

export function isCertificateFileName(value: string): boolean {
    const certificateExtension = ".crt";
    return value.endsWith(certificateExtension);
}

export function isValueExpression(stringValue: string): any {
    return stringValue != null && stringValue.startsWith('${') && stringValue.endsWith('}');
}

export function isTypeAwareEqual(currentVal: any, expectedVal: any) {
    return currentVal === expectedVal || (typeof expectedVal === 'string' && String(currentVal) === expectedVal) ||
                    (typeof expectedVal === 'boolean' && String(currentVal) === String(expectedVal));
}

/**
 * Check whether to use the legacy expression editor or not.
 *
 * @param expressionType - The expression type.
 * @param isLegacyExpressionEnabled - Whether the enable legacy expression editor setting is checked.
 * @param field - The field object.
 * @returns - Whether to use the legacy expression editor or not.
 */
export function isLegacyExpression(
    expressionType: 'xpath/jsonPath' | 'synapse',
    isLegacyExpressionEnabled: boolean,
    field: any
): boolean {
    /* Check if for the expressionType field
     * If the field value is 'xPath/jsonPath' -> enable the legacy expression editor
     */
    if (expressionType === 'xpath/jsonPath') {
        return true;
    }

    /* If the legacy expression editor is enabled, return true */
    if (isLegacyExpressionEnabled) {
        return true;
    }

    /* If the field is wrapped in ${...} */
    const isExpression = field.value?.isExpression;
    const value = typeof field.value === 'object' ? field.value.value : field.value;
    if (isExpression && value?.length > 0 && (!value?.startsWith('${') || !value?.endsWith('}'))) {
        return true;
    }

    /* If non of the conditions are met -> enable the new expression editor */
    return false;
}

/**
 * Creates a request body for helper pane information based on the document URI and context.
 *
 * @param machineView - The machine view containing document URI and other context.
 * @param position - The position in the document.
 * @param artifactPath - Optional artifact path to override the document URI.
 * @returns - The request body object for getHelperPaneInfo RPC call.
 */
export function createHelperPaneRequestBody(
    machineView: { documentUri?: string },
    position: { line: number; character: number },
    artifactPath?: string
) {
    const documentUri = artifactPath ? artifactPath : machineView.documentUri;

    if (machineView.documentUri?.includes('src/test/')) {
        return {
            documentUri: documentUri,
            position: { line: 0, character: 0 },
            needLastMediator: true
        };
    } else {
        return {
            documentUri: documentUri,
            position: position
        };
    }
}
