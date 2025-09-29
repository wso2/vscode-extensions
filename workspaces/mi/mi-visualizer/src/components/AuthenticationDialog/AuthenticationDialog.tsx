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

import React, { useState, useEffect } from 'react';
import { Button, Dialog, ProgressIndicator, Typography } from "@wso2/ui-toolkit";
import { AI_EVENT_TYPE } from "@wso2/mi-core";
import { useVisualizerContext } from "@wso2/mi-rpc-client";

export interface AuthenticationDialogProps {
    isOpen: boolean;
    operationType: 'createUnitTests' | 'generateTestCase' | 'dataMapperMigration';
    sessionStorageKey: string;
    formValues?: any;
    signInMessage?: string;
    waitingMessage?: string;
    dependencies?: any[];
    onSignInConfirm?: (pendingOperation: any) => void; // Make optional
    onCancel: () => void;
    onAuthenticationSuccess: (formValues: any) => Promise<void>;
}

export interface PendingOperation {
    formValues: any;
    viewType: string;
    timestamp: number;
}

export function AuthenticationDialog(props: AuthenticationDialogProps) {
    const {
        isOpen,
        operationType,
        sessionStorageKey,
        formValues,
        signInMessage = 'You need to sign in to MI Copilot to use AI features. Would you like to sign in?',
        waitingMessage = 'Please complete the sign-in process. Your operation will continue automatically after successful authentication.',
        dependencies = [],
        onSignInConfirm,
        onCancel,
        onAuthenticationSuccess
    } = props;

    const { rpcClient } = useVisualizerContext();
    const [pendingOperation, setPendingOperation] = useState<PendingOperation | null>(null);

    // Monitor for successful sign-in and retry pending operations
    useEffect(() => {
        const checkAndRetryPendingOperation = async () => {
            if (pendingOperation) {
                try {
                    const token = await rpcClient.getMiDiagramRpcClient().getUserAccessToken();
                    if (token && pendingOperation.viewType === operationType) {
                        const formValues = pendingOperation.formValues;
                        
                        // Clear the pending operation first
                        setPendingOperation(null);
                        
                        // Call the success handler and close the dialog
                        await onAuthenticationSuccess(formValues);
                        
                        // Ensure dialog is closed
                        onCancel();
                    }
                } catch (error) {
                    console.error('Error checking authentication status:', error);
                }
            }
        };

        let interval: NodeJS.Timeout | null = null;
        
        // Only start checking if we have a pending operation
        if (pendingOperation) {
            interval = setInterval(checkAndRetryPendingOperation, 2000);
        }
        
        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [pendingOperation, operationType, onAuthenticationSuccess, onCancel, rpcClient, ...dependencies]);

    const handleSignInConfirm = async () => {
        // Store the form values for retry after successful sign-in
        let operationData: PendingOperation;
        
        if (formValues) {
            operationData = {
                formValues,
                viewType: operationType,
                timestamp: Date.now()
            };
            sessionStorage.setItem(sessionStorageKey, JSON.stringify(operationData));
            setPendingOperation(operationData);
        } else {
            // Check if there's already stored operation data
            const storedOperation = sessionStorage.getItem(sessionStorageKey);
            if (storedOperation) {
                operationData = JSON.parse(storedOperation);
                setPendingOperation(operationData);
                sessionStorage.removeItem(sessionStorageKey);
            } else {
                // Create a default pending operation
                operationData = {
                    formValues: formValues || {},
                    viewType: operationType,
                    timestamp: Date.now()
                };
                setPendingOperation(operationData);
            }
        }
        
        try {
            await rpcClient.sendAIStateEvent(AI_EVENT_TYPE.LOGIN);
            // Call the parent's sign-in confirm handler if provided
            onSignInConfirm?.(operationData);
        } catch (error) {
            console.error('Failed to initiate authentication:', error);
            setPendingOperation(null);
            onCancel();
        }
    };

    const handleSignInCancel = () => {
        setPendingOperation(null);
        sessionStorage.removeItem(sessionStorageKey);
        
        // Reset the AI state machine back to logged out state
        try {
            rpcClient.sendAIStateEvent(AI_EVENT_TYPE.CANCEL);
        } catch (error) {
            console.error('Failed to cancel AI authentication state:', error);
        }
        
        onCancel();
    };

    return (
        <Dialog 
            isOpen={isOpen} 
            onClose={pendingOperation ? undefined : handleSignInCancel}
        >
            <Typography variant="h4" sx={{ marginBottom: '16px' }}>
                {pendingOperation ? 'Waiting for Sign In' : 'Sign In Required'}
            </Typography>
            
            <Typography variant="body1" sx={{ marginBottom: '20px' }}>
                {pendingOperation ? waitingMessage : signInMessage}
            </Typography>
            
            {!pendingOperation && (
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <Button appearance="primary" onClick={handleSignInConfirm}>
                        Sign In
                    </Button>
                    <Button appearance="secondary" onClick={handleSignInCancel}>
                        Cancel
                    </Button>
                </div>
            )}
            
            {pendingOperation && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <ProgressIndicator />
                    <Typography variant="body2" sx={{ textAlign: 'center', color: 'var(--vscode-descriptionForeground)' }}>
                        Waiting for authentication completion...
                    </Typography>
                    <Button appearance="secondary" onClick={handleSignInCancel}>
                        Cancel
                    </Button>
                </div>
            )}
        </Dialog>
    );
}
