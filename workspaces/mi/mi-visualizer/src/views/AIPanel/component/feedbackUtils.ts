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

import { ChatMessage, CopilotChatEntry, Role } from '@wso2/mi-core';
import { FeedbackMessage } from '../types';

/**
 * Helper function to convert conversation history for feedback submission
 */
export const getConversationHistoryForFeedback = (messages: ChatMessage[], messageIndex: number): FeedbackMessage[] => {
    // Get all messages up to the specified index
    const messagesToInclude = messages.slice(0, messageIndex + 1);

    // Filter out question and label messages
    const conversationMessages = messagesToInclude.filter(
        message => message.type !== 'question' && message.type !== 'label'
    );

    // Convert to the format expected by the feedback service
    return conversationMessages.map(message => ({
        content: message.content,
        role: message.role === Role.MIUser ? 'user' : 'assistant'
    }));
};

/**
 * Helper function to extract relevant information from copilot chat entries for feedback
 */
export const getCopilotChatForFeedback = (copilotChat: CopilotChatEntry[], messageIndex: number): FeedbackMessage[] => {
    // Get all copilot chat entries up to the message index
    const entriesToInclude = copilotChat.slice(0, messageIndex + 1);

    return entriesToInclude.map(entry => ({
        content: entry.content,
        role: entry.role,
        id: entry.id
    }));
};
