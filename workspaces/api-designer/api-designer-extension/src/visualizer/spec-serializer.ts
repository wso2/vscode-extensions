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

import * as vscode from 'vscode';
import * as path from 'path';
import * as yaml from 'js-yaml';
import {
    detectSpecType,
    SpecificationFactory,
    ApiSpecType,
    SpecificationService,
    loadYaml
} from '@wso2/api-designer-core';
import { SpecContentManager } from '../rpc-managers/api-designer-visualizer/managers/spec-content-manager';
import { logDebug, logError, logWarning } from '../utils/logger';

export class SpecSerializer {
    private _specType: ApiSpecType | null = null;
    private _specService: SpecificationService | null = null;
    private _lastSpec: unknown = null;
    private _lastSavedContent: string | null = null;
    private _isSavingFromWebview: boolean = false;
    private _saveDebounceTimer: NodeJS.Timeout | undefined;

    private readonly specContentManager = new SpecContentManager();

    constructor(
        private readonly onAfterSave: () => Promise<void>,
        private readonly onSpecLoaded: (spec: unknown, specType: ApiSpecType | null) => void
    ) {}

    async detectSpecificationType(filePath: string): Promise<void> {
        try {
            const document = await vscode.workspace.openTextDocument(filePath);
            const content = document.getText();

            if (content && content.trim().length > 0) {
                const detection = detectSpecType(content);

                if (detection.type) {
                    this._specType = detection.type;
                    this._specService = SpecificationFactory.getService(detection.type);
                    logDebug(`SpecSerializer: Detected ${detection.type} specification (v${detection.version || 'unknown'}, confidence: ${detection.confidence})`);
                } else {
                    logWarning(`SpecSerializer: Could not detect specification type for ${filePath}`);
                }
            }
        } catch (error) {
            logError(`SpecSerializer: Error detecting spec type: ${error}`);
        }
    }

    async saveSpec(filePath: string, data: any): Promise<void> {
        try {
            const fileUri = vscode.Uri.file(filePath);
            const ext = path.extname(filePath).toLowerCase();
            let content: string;
            if (ext === '.yaml' || ext === '.yml') {
                content = yaml.dump(data, { noRefs: true, lineWidth: 120 });
            } else {
                content = JSON.stringify(data, null, 2);
            }

            if (this._lastSavedContent === content) {
                return;
            }

            this._isSavingFromWebview = true;
            this._lastSavedContent = content;

            if (this._saveDebounceTimer) {
                clearTimeout(this._saveDebounceTimer);
            }

            this._saveDebounceTimer = setTimeout(async () => {
                try {
                    await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf8'));

                    setTimeout(async () => {
                        await this.onAfterSave();
                    }, 500);
                } catch (err) {
                    logError('SpecSerializer: Failed to save spec', err);
                    vscode.window.showErrorMessage('Failed to save API specification.');
                } finally {
                    setTimeout(() => {
                        this._isSavingFromWebview = false;
                    }, 500);
                }
            }, 300);
        } catch (err) {
            logError('SpecSerializer: Failed to save spec', err);
            vscode.window.showErrorMessage('Failed to save API specification.');
            this._isSavingFromWebview = false;
        }
    }

    async loadAndSend(filePath: string): Promise<void> {
        try {
            const response = await this.specContentManager.getAPISpecContent({ filePath });
            if (response.content) {
                let parsed: any;
                if (response.type === 'json') {
                    parsed = JSON.parse(response.content);
                } else {
                    parsed = loadYaml(response.content);
                }

                if (parsed) {
                    if (parsed.openapi) {
                        this._specType = ApiSpecType.OPENAPI;
                        this._specService = SpecificationFactory.getService(ApiSpecType.OPENAPI);
                    }

                    this._lastSpec = parsed;
                    this.onSpecLoaded(parsed, this._specType);
                }
            }
        } catch (error) {
            logError('SpecSerializer: Failed to load and send spec', error);
        }
    }

    updateSpecTypeFromData(data: Record<string, unknown>): void {
        if (!this._specType && 'openapi' in data) {
            this._specType = ApiSpecType.OPENAPI;
            this._specService = SpecificationFactory.getService(ApiSpecType.OPENAPI);
            logDebug('SpecSerializer: Detected OpenAPI from preview data');
        }
    }

    setLastSpec(spec: unknown): void {
        this._lastSpec = spec;
    }

    isSavingFromWebview(): boolean {
        return this._isSavingFromWebview;
    }

    getSpecType(): ApiSpecType | null {
        return this._specType;
    }

    getSpecService(): SpecificationService | null {
        return this._specService;
    }

    getLastSpec(): unknown {
        return this._lastSpec;
    }

    dispose(): void {
        if (this._saveDebounceTimer) {
            clearTimeout(this._saveDebounceTimer);
            this._saveDebounceTimer = undefined;
        }
    }
}
