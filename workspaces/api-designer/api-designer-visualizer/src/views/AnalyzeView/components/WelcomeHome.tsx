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

import React, { useState } from 'react';
import styled from '@emotion/styled';
import { GovernanceDashboard } from './GovernanceDashboard';
import { AIReadinessDashboard } from './AIReadinessDashboard';

const WelcomeRoot = styled.div`
    max-width: 1264px;
    margin: 0 auto;
    padding: 32px 32px 48px;
    width: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 40px;
`;

interface WelcomeHomeProps {
    fileUri: string;
    refreshToken?: number;
    specType?: 'openapi' | 'asyncapi'; // Spec type for context
}

export const WelcomeHome: React.FC<WelcomeHomeProps> = ({ fileUri, refreshToken, specType = 'openapi' }) => {
    const [dashboardRefreshToken, setDashboardRefreshToken] = useState<number>(Date.now());
    
    // Update refresh token when prop changes
    React.useEffect(() => {
        if (refreshToken) {
            setDashboardRefreshToken(refreshToken);
        }
    }, [refreshToken]);

    return (
        <WelcomeRoot>
            {/* AI Readiness Dashboard */}
            <AIReadinessDashboard fileUri={fileUri} refreshToken={dashboardRefreshToken} />

            {/* Governance Dashboard */}
            <GovernanceDashboard
                fileUri={fileUri}
                refreshToken={dashboardRefreshToken}
            />
        </WelcomeRoot>
    );
};

