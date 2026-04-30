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

import { useState, useEffect } from 'react';

const PLACEHOLDER_URI = 'file:///placeholder';
const SHOW_WAITING_DELAY = 500;

/**
 * Hook for managing loading states with delayed "waiting" message
 * Prevents showing "Waiting for file path..." immediately, giving messages time to arrive
 * 
 * @param fileUri - Current fileUri value
 * @param isLoading - Whether data is currently loading
 * @returns Object with loading state flags
 */
export function useLoadingState(fileUri: string, isLoading: boolean = false) {
    const [showWaiting, setShowWaiting] = useState(false);

    useEffect(() => {
        if (!fileUri || fileUri === PLACEHOLDER_URI) {
            const timer = setTimeout(() => {
                setShowWaiting(true);
            }, SHOW_WAITING_DELAY);
            return () => clearTimeout(timer);
        } else {
            setShowWaiting(false);
        }
    }, [fileUri]);

    const shouldShowLoading = isLoading && fileUri && fileUri !== PLACEHOLDER_URI;
    const shouldShowWaiting = (!fileUri || fileUri === PLACEHOLDER_URI) && showWaiting;
    const shouldShowInitializing = (!fileUri || fileUri === PLACEHOLDER_URI) && !showWaiting;

    return {
        shouldShowLoading,
        shouldShowWaiting,
        shouldShowInitializing,
        isReady: fileUri && fileUri !== PLACEHOLDER_URI
    };
}

