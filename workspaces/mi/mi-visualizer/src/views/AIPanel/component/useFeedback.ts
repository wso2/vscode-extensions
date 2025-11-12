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

import { useCallback, useState } from 'react';
import { ChatMessage, CopilotChatEntry } from '@wso2/mi-core';
import { RpcClientType } from '../types';
import { getConversationHistoryForFeedback, getCopilotChatForFeedback } from './feedbackUtils';

interface UseFeedbackOptions {
    messages: ChatMessage[];
    copilotChat: CopilotChatEntry[];
    rpcClient: RpcClientType;
}

export const useFeedback = ({ messages, copilotChat, rpcClient }: UseFeedbackOptions) => {
    const [feedbackGiven, setFeedbackGiven] = useState<'positive' | 'negative' | null>(null);

    const handleFeedback = useCallback(async (index: number, isPositive: boolean, detailedFeedback?: string) => {
        // Store feedback in local state
        setFeedbackGiven(isPositive ? 'positive' : 'negative');

        try {
            // Parse all messages up to the current index to extract conversation history
            const conversationHistory = getConversationHistoryForFeedback(messages, index);
            const copilotHistory = getCopilotChatForFeedback(copilotChat, index);

            // Submit feedback via RPC client
            const result = await rpcClient.getMiDiagramRpcClient().submitFeedback({
                positive: isPositive,
                messages: conversationHistory,
                feedbackText: detailedFeedback,
                messageIndex: index,
                timestamp: Date.now()
            });

            return result.success;
        } catch (error) {
            console.error("Failed to send feedback:", error);
            return false;
        }
    }, [messages, copilotChat, rpcClient]);

    return {
        feedbackGiven,
        setFeedbackGiven,
        handleFeedback
    };
};
