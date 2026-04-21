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

import { useState, useEffect, useCallback } from 'react';

export interface DeploymentArtifactState {
    artifactName: string;
    artifactVersion: string;
    artifactContext: string;
    artifactDescription: string;
    mainEndpoint: string;
    sandboxEndpoint: string;
    existingArtifactPath: string | null;
    artifactFileExists: boolean;
}

export interface UseDeploymentArtifactReturn extends DeploymentArtifactState {
    setArtifactName: (name: string) => void;
    setArtifactVersion: (version: string) => void;
    setArtifactContext: (context: string) => void;
    setArtifactDescription: (description: string) => void;
    setMainEndpoint: (endpoint: string) => void;
    setSandboxEndpoint: (endpoint: string) => void;
    setExistingArtifactPath: (path: string | null) => void;
    setArtifactFileExists: (exists: boolean) => void;
    populateFromSpec: (specInfo: {
        title?: string;
        description?: string;
        version?: string;
        mainEndpoint?: string;
    }) => void;
}

/**
 * Hook for managing deployment artifact state
 */
export function useDeploymentArtifact(
    specInfo: { title?: string; description?: string; version?: string; mainEndpoint?: string } | null
): UseDeploymentArtifactReturn {
    const [artifactName, setArtifactName] = useState('');
    const [artifactVersion, setArtifactVersion] = useState('1.0.0');
    const [artifactContext, setArtifactContext] = useState('');
    const [artifactDescription, setArtifactDescription] = useState('');
    const [mainEndpoint, setMainEndpoint] = useState('');
    const [sandboxEndpoint, setSandboxEndpoint] = useState('');
    const [existingArtifactPath, setExistingArtifactPath] = useState<string | null>(null);
    const [artifactFileExists, setArtifactFileExists] = useState(false);

    const populateFromSpec = useCallback((specInfo: {
        title?: string;
        description?: string;
        version?: string;
        mainEndpoint?: string;
    }) => {
        if (!artifactFileExists && existingArtifactPath && specInfo) {
            if (!artifactName || artifactName === '') {
                setArtifactName(specInfo.title || '');
            }
            if (!artifactVersion || artifactVersion === '') {
                setArtifactVersion(specInfo.version || '1.0.0');
            }
            if (!artifactContext || artifactContext === '') {
                setArtifactContext(specInfo.title ? `/${specInfo.title.toLowerCase().replace(/\s+/g, '-')}` : '/api');
            }
            if (!artifactDescription || artifactDescription === '') {
                setArtifactDescription(specInfo.description || '');
            }
            if (!mainEndpoint || mainEndpoint === '') {
                setMainEndpoint(specInfo.mainEndpoint || '');
            }
        }
    }, [artifactFileExists, existingArtifactPath, artifactName, artifactVersion, artifactContext, artifactDescription, mainEndpoint]);

    useEffect(() => {
        if (specInfo) {
            populateFromSpec(specInfo);
        }
    }, [specInfo, populateFromSpec]);

    return {
        artifactName,
        artifactVersion,
        artifactContext,
        artifactDescription,
        mainEndpoint,
        sandboxEndpoint,
        existingArtifactPath,
        artifactFileExists,
        setArtifactName,
        setArtifactVersion,
        setArtifactContext,
        setArtifactDescription,
        setMainEndpoint,
        setSandboxEndpoint,
        setExistingArtifactPath,
        setArtifactFileExists,
        populateFromSpec
    };
}

