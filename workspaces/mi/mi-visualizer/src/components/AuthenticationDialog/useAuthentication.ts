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

import { useState } from 'react';
import { useVisualizerContext } from "@wso2/mi-rpc-client";

export interface UseAuthenticationOptions {
    operationType: 'createUnitTests' | 'generateTestCase' | 'dataMapperMigration';
    sessionStorageKey: string;
}

export function useAuthentication(options: UseAuthenticationOptions) {
    const { operationType, sessionStorageKey } = options;
    const { rpcClient } = useVisualizerContext();
    const [showSignInConfirm, setShowSignInConfirm] = useState(false);

    /**
     * Check if user is authenticated with MI Copilot (AI state machine)
     */
    const checkAuthentication = async (): Promise<boolean> => {
        try {
            const aiState = await rpcClient.getAIVisualizerState();
            const state = aiState?.state;

            // Check if user is authenticated or has usage exceeded (both mean signed in)
            return state === 'Authenticated' || state === 'UsageExceeded';
        } catch (error) {
            console.error('Failed to check AI authentication state', error);
            return false;
        }
    };

    /**
     * Open the sign-in dialog with optional form values
     */
    const openSignInView = (formValues?: any) => {
        if (formValues) {
            sessionStorage.setItem(sessionStorageKey, JSON.stringify({
                formValues,
                viewType: operationType,
                timestamp: Date.now()
            }));
        }
        setShowSignInConfirm(true);
    };

    /**
     * Close the sign-in dialog
     */
    const closeSignInView = () => {
        setShowSignInConfirm(false);
    };

    /**
     * Handle sign-in confirmation
     */
    const handleSignInConfirm = (pendingOperation: any) => {
        // Keep the dialog open but in waiting state - the AuthenticationDialog handles this
    };

    /**
     * Handle sign-in cancellation
     */
    const handleSignInCancel = () => {
        setShowSignInConfirm(false);
    };

    return {
        showSignInConfirm,
        checkAuthentication,
        openSignInView,
        closeSignInView,
        handleSignInConfirm,
        handleSignInCancel
    };
}
