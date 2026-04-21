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

import { useState, useCallback, useEffect, useRef } from 'react';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { SpectralRuleset } from '@wso2/api-designer-core';
import { logger } from '../../../utils/logger';

export interface UseProjectInitializationReturn {
    isProjectInitialized: boolean;
    isInitializing: boolean;
    checkingProject: boolean;
    checkProjectInitialization: () => Promise<void>;
    initializeProject: (config: {
        docsFolder: string;
        testsFolder: string;
        rulesets: SpectralRuleset[];
        enabledRulesets: Set<string>;
        artifactName: string;
        artifactVersion: string;
        artifactContext: string;
        artifactDescription: string;
        mainEndpoint: string;
        sandboxEndpoint: string;
    }) => Promise<void>;
}

/**
 * Hook for managing project initialization
 */
export function useProjectInitialization(
    fileUri: string,
    onInitialized: (config: any) => void
): UseProjectInitializationReturn {
    const { rpcClient } = useVisualizerContext();
    const [isProjectInitialized, setIsProjectInitialized] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const [checkingProject, setCheckingProject] = useState(true);
    
    // Use ref to store callback to prevent unnecessary re-renders
    const onInitializedRef = useRef(onInitialized);
    useEffect(() => {
        onInitializedRef.current = onInitialized;
    }, [onInitialized]);
    
    // Track if a check is in progress to prevent multiple simultaneous checks
    const isCheckingRef = useRef(false);

    const checkProjectInitialization = useCallback(async () => {
        if (!rpcClient || !fileUri) {
            setCheckingProject(false);
            return;
        }
        
        // Prevent multiple simultaneous checks
        if (isCheckingRef.current) {
            return;
        }
        
        try {
            isCheckingRef.current = true;
            setCheckingProject(true);
            
            const response = await rpcClient.getProjectDetails({
                apiSpecPath: fileUri
            });
            
            if (!response.success) {
                logger.error('Failed to get project details:', response.message);
                setIsProjectInitialized(false);
                setCheckingProject(false);
                isCheckingRef.current = false;
                return;
            }
            
            setIsProjectInitialized(response.isInitialized);
            
            if (response.isInitialized && response.projectConfig) {
                onInitializedRef.current(response);
            }
        } catch (err: any) {
            logger.error('Error checking project initialization:', err);
            setIsProjectInitialized(false);
        } finally {
            setCheckingProject(false);
            isCheckingRef.current = false;
        }
    }, [fileUri, rpcClient]);

    useEffect(() => {
        checkProjectInitialization();
    }, [checkProjectInitialization]);

    const initializeProject = useCallback(async (config: {
        docsFolder: string;
        testsFolder: string;
        rulesets: SpectralRuleset[];
        enabledRulesets: Set<string>;
        artifactName: string;
        artifactVersion: string;
        artifactContext: string;
        artifactDescription: string;
        mainEndpoint: string;
        sandboxEndpoint: string;
    }) => {
        if (!rpcClient || !fileUri) return;
        
        try {
            setIsInitializing(true);
            const workspaceUri = fileUri.substring(0, Math.max(fileUri.lastIndexOf('/'), fileUri.lastIndexOf('\\')));
            
            const response = await rpcClient.getApiDesignerVisualizerRpcClient().initApiProject({
                workspaceUri: workspaceUri,
                apiSpecPath: fileUri,
                spectralRulesets: config.rulesets,
                docsFolder: config.docsFolder || 'docs',
                testsFolder: config.testsFolder || 'tests'
            });

            if (response.success) {
                const generateResponse = await rpcClient.getApiDesignerVisualizerRpcClient().generateDeploymentArtifact({
                    filePath: fileUri,
                    artifactName: config.artifactName,
                    artifactVersion: config.artifactVersion,
                    artifactContext: config.artifactContext,
                    artifactDescription: config.artifactDescription,
                    mainEndpoint: config.mainEndpoint,
                    sandboxEndpoint: config.sandboxEndpoint
                });

                if (generateResponse.success) {
                    await checkProjectInitialization();
                }
            }
        } catch (err: any) {
            logger.error('Error initializing project:', err);
        } finally {
            setIsInitializing(false);
        }
    }, [rpcClient, fileUri, checkProjectInitialization]);

    return {
        isProjectInitialized,
        isInitializing,
        checkingProject,
        checkProjectInitialization,
        initializeProject
    };
}

