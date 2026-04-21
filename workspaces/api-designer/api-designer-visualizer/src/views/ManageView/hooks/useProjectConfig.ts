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

import { useState, useCallback } from 'react';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { ApiPlatformConfig } from '@wso2/api-designer-core';
import { logger } from '../../../utils/logger';

export interface UseProjectConfigReturn {
    projectConfig: ApiPlatformConfig | null;
    apiOpenApiPath: string;
    documentationFolder: string;
    testsFolder: string;
    isSaving: boolean;
    setProjectConfig: (config: ApiPlatformConfig | null) => void;
    setApiOpenApiPath: (path: string) => void;
    setDocumentationFolder: (folder: string) => void;
    setTestsFolder: (folder: string) => void;
    saveConfig: (options: {
        existingArtifactPath: string | null;
        artifactName: string;
        artifactVersion: string;
        artifactContext: string;
        artifactDescription: string;
        mainEndpoint: string;
        sandboxEndpoint: string;
        onSuccess?: (artifactPath: string | null) => void;
    }) => Promise<void>;
}

/**
 * Hook for managing project configuration
 */
export function useProjectConfig(fileUri: string): UseProjectConfigReturn {
    const { rpcClient } = useVisualizerContext();
    const [projectConfig, setProjectConfig] = useState<ApiPlatformConfig | null>(null);
    const [apiOpenApiPath, setApiOpenApiPath] = useState('');
    const [documentationFolder, setDocumentationFolder] = useState('');
    const [testsFolder, setTestsFolder] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const saveConfig = useCallback(async (options: {
        existingArtifactPath: string | null;
        artifactName: string;
        artifactVersion: string;
        artifactContext: string;
        artifactDescription: string;
        mainEndpoint: string;
        sandboxEndpoint: string;
        onSuccess?: (artifactPath: string | null) => void;
    }) => {
        if (!rpcClient || !fileUri) return;

        try {
            setIsSaving(true);
            const workspaceUri = fileUri.substring(0, fileUri.lastIndexOf('/'));
            
            const response = await rpcClient.saveProjectConfig({
                workspaceUri: workspaceUri,
                apiSpecPath: fileUri,
                docsFolder: documentationFolder,
                testsFolder: testsFolder,
                spectralRulesets: projectConfig?.spectralRulesets,
                artifactPath: options.existingArtifactPath || undefined,
                artifact: {
                    name: options.artifactName,
                    version: options.artifactVersion,
                    context: options.artifactContext,
                    description: options.artifactDescription,
                    mainEndpoint: options.mainEndpoint,
                    sandboxEndpoint: options.sandboxEndpoint
                }
            });

            if (response.success) {
                logger.info('Project config saved successfully');
                if (options.onSuccess) {
                    options.onSuccess(response.artifactPath || null);
                }
            } else {
                logger.error('Failed to save configuration:', response.message);
            }
        } catch (err: any) {
            logger.error('Error saving changes:', err);
        } finally {
            setIsSaving(false);
        }
    }, [rpcClient, fileUri, documentationFolder, testsFolder, projectConfig]);

    return {
        projectConfig,
        apiOpenApiPath,
        documentationFolder,
        testsFolder,
        isSaving,
        setProjectConfig,
        setApiOpenApiPath,
        setDocumentationFolder,
        setTestsFolder,
        saveConfig
    };
}

