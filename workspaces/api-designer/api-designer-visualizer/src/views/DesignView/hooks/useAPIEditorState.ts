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

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ApiSpecType } from '@wso2/api-designer-core';
import { ValidationData, AIReadinessData } from '../components/api-header/MetricsOverview';
import { postMessage as postVSCodeMessage } from '../../../utils/vscode-api';
import { useDebouncedValidation } from '../../../hooks/useDebouncedValidation';

interface OpenAPISpec {
    openapi?: string;
    info?: any;
    servers?: any;
    tags?: any[];
    paths?: Record<string, any>;
    components?: any;
}

export interface ValidationModalState {
    isOpen: boolean;
    activeTab: 'error' | 'warning';
}

export interface UseAPIEditorStateReturn {
    spec: OpenAPISpec | null;
    specType: ApiSpecType | null;
    parseError: string | null;
    validationData: ValidationData | null;
    aiReadinessScore: AIReadinessData | null;
    validationModal: ValidationModalState;
    isLoading: boolean;
    setSpec: (spec: OpenAPISpec | null) => void;
    setSpecType: (type: ApiSpecType | null) => void;
    setParseError: (error: string | null) => void;
    setValidationData: (data: ValidationData | null) => void;
    setAiReadinessScore: (score: AIReadinessData | null) => void;
    setValidationModal: (modal: ValidationModalState | ((prev: ValidationModalState) => ValidationModalState)) => void;
    setIsLoading: (loading: boolean) => void;
}

/**
 * Hook for managing API Editor state
 * Handles spec, validation, AI readiness, and modal state
 */
export function useAPIEditorState(initialSpec?: OpenAPISpec | null): UseAPIEditorStateReturn {
    const [spec, setSpec] = useState<OpenAPISpec | null>(initialSpec || null);
    const [specType, setSpecType] = useState<ApiSpecType | null>(null);
    const [parseError, setParseError] = useState<string | null>(null);
    const [validationData, setValidationData] = useState<ValidationData | null>(null);
    const [aiReadinessScore, setAiReadinessScore] = useState<AIReadinessData | null>(null);
    // Consolidate validation modal state into single object
    const [validationModal, setValidationModal] = useState<ValidationModalState>({
        isOpen: false,
        activeTab: 'error'
    });
    const isLoadingRef = useRef<boolean>(false);

    // Debounced validation hook
    const { requestValidation: debouncedRequestValidation, requestAIReadiness: debouncedRequestAIReadiness } = useDebouncedValidation({
        delay: 500
    });

    // Update spec if initialSpec prop changes
    useEffect(() => {
        if (initialSpec) {
            setSpec(initialSpec);
            setParseError(null);
        }
    }, [initialSpec]);

    // Detect spec type from spec data - memoized to avoid recalculation
    const detectedSpecType = useMemo(() => {
        if (!spec) return null;
        if (spec.openapi) return ApiSpecType.OPENAPI;
        return null;
    }, [spec]);

    // Update specType when spec changes and no explicit type is set
    useEffect(() => {
        if (detectedSpecType && !specType) {
            setSpecType(detectedSpecType);
        }
    }, [detectedSpecType, specType]);
    
    // Memoize spec type detection logic in message handler to avoid recalculation
    const detectSpecTypeFromData = useCallback((data: any): ApiSpecType | null => {
        if (!data) return null;
        if (data.openapi) return ApiSpecType.OPENAPI;
        return null;
    }, []);

    // Handle messages for validation and AI readiness
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            switch (message.command) {
                case 'updateSpec':
                case 'update':
                    setParseError(null);
                    setSpec(message.data);
                    isLoadingRef.current = false;
                    
                    // Detect spec type from the received data
                    if (message.specType) {
                        setSpecType(message.specType);
                    } else if (message.data) {
                        const detected = detectSpecTypeFromData(message.data);
                        if (detected) {
                            setSpecType(detected);
                        }
                    }
                    break;
                case 'specParseError':
                    setParseError(message.data?.message || 'Failed to parse OpenAPI specification.');
                    setSpec(null);
                    isLoadingRef.current = false;
                    break;
                case 'validationResult':
                    setValidationData(message.data);
                    break;
                case 'aiReadinessScore':
                    setAiReadinessScore(message.data);
                    break;
                case 'updateValidation':
                    setValidationData({
                        errorCount: message.data?.errorCount ?? 0,
                        warningCount: message.data?.warningCount ?? 0,
                        isValid: message.data?.isValid ?? true,
                        errors: message.data?.errors ?? [],
                        warnings: message.data?.warnings ?? [],
                        specContent: typeof message.data?.specContent === 'string' ? message.data.specContent : undefined
                    });
                    break;
                case 'updateAIReadiness':
                    setAiReadinessScore((prev) => ({
                        score: typeof message.data?.score === 'number' ? message.data.score : (prev?.score ?? 0),
                        issues: prev?.issues ?? []
                    }));
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        // Use debounced validation requests
        debouncedRequestValidation();
        debouncedRequestAIReadiness();

        return () => window.removeEventListener('message', handleMessage);
    }, [detectSpecTypeFromData, debouncedRequestValidation, debouncedRequestAIReadiness]);

    const setIsLoading = useCallback((loading: boolean) => {
        isLoadingRef.current = loading;
    }, []);

    return {
        spec,
        specType,
        parseError,
        validationData,
        aiReadinessScore,
        validationModal,
        isLoading: isLoadingRef.current,
        setSpec,
        setSpecType,
        setParseError,
        setValidationData,
        setAiReadinessScore,
        setValidationModal,
        setIsLoading
    };
}

