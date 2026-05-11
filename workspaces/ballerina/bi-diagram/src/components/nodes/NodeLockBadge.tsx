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

import React from "react";
import styled from "@emotion/styled";
import { ThemeColors, Tooltip } from "@wso2/ui-toolkit";
import { NodeLock } from "@wso2/ballerina-core";

const LockBadgeWrapper = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    transform: translateY(-50%);
    z-index: 10;
`;

const LockIndicator = styled.div`
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background-color: ${ThemeColors.SECONDARY_CONTAINER};
    border: 2px solid ${ThemeColors.SECONDARY};
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: help;
`;

const LockIcon = styled.div`
    color: ${ThemeColors.ON_SECONDARY};
    font-size: 10px;
`;

interface NodeLockBadgeProps {
    lock?: NodeLock;
    currentUserId?: string;
}

export function NodeLockBadge({ lock, currentUserId }: NodeLockBadgeProps) {
    if (!lock || lock.userId === currentUserId) {
        return null;
    }
    return (
        <LockBadgeWrapper>
            <Tooltip content={`Locked by ${lock.userName}`}>
                <LockIndicator>
                    <LockIcon>🔒</LockIcon>
                </LockIndicator>
            </Tooltip>
        </LockBadgeWrapper>
    );
}
