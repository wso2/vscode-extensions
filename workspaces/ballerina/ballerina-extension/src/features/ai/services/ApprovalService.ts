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

import { ChatStateStorage } from '../../../views/ai-panel/chatStateStorage';
import { CopilotEventHandler } from '../utils/events';
import {
    Task,
    PlanApprovalResponse,
    TaskApprovalResponse,
    ConnectorSpecResponse,
} from '@wso2/ballerina-core/lib/state-machine-types';

/**
 * Stateless approval service
 * All state management delegated to ChatStateStorage
 *
 * This service provides a clean interface for requesting and resolving approvals
 * without maintaining any internal state. All approval state is stored in
 * ChatStateStorage as part of the generation lifecycle.
 */
export class ApprovalService {
    constructor(private storage: ChatStateStorage) {}

    // ============================================
    // Plan Approval
    // ============================================

    /**
     * Request plan approval from user
     * Emits task_approval_request event and waits for user response
     *
     * @param workspaceId Workspace identifier
     * @param threadId Thread identifier
     * @param generationId Generation identifier
     * @param tasks Array of tasks in the plan
     * @param eventHandler Event handler to emit approval request
     * @returns Promise that resolves when user approves/declines
     */
    requestPlanApproval(
        workspaceId: string,
        threadId: string,
        generationId: string,
        tasks: Task[],
        eventHandler: CopilotEventHandler
    ): Promise<PlanApprovalResponse> {
        console.log(`[ApprovalService] Requesting plan approval for generation: ${generationId}`);

        // Create approval promise via storage
        const { promise, requestId } = this.storage.requestApproval<PlanApprovalResponse>(
            workspaceId,
            threadId,
            generationId,
            'plan',
            { tasks }
        );

        // Emit event to frontend
        eventHandler({
            type: "task_approval_request",
            requestId: requestId,
            approvalType: "plan",
            tasks: tasks,
            message: "Please review the implementation plan"
        });

        return promise;
    }

    /**
     * Resolve plan approval (called by RPC method when user responds)
     *
     * @param requestId Unique identifier for this approval request
     * @param approved Whether the plan was approved
     * @param comment Optional comment from user
     */
    resolvePlanApproval(requestId: string, approved: boolean, comment?: string): void {
        console.log(`[ApprovalService] Resolving plan approval: ${requestId}, approved: ${approved}`);
        this.storage.resolveApproval(requestId, { approved, comment });
    }

    // ============================================
    // Task Approval
    // ============================================

    /**
     * Request task completion approval from user
     * Emits task_approval_request event and waits for user response
     *
     * @param workspaceId Workspace identifier
     * @param threadId Thread identifier
     * @param generationId Generation identifier
     * @param taskDescription Description of the completed task
     * @param tasks Array of all tasks (for UI display)
     * @param eventHandler Event handler to emit approval request
     * @returns Promise that resolves when user approves/declines
     */
    requestTaskApproval(
        workspaceId: string,
        threadId: string,
        generationId: string,
        taskDescription: string,
        tasks: Task[],
        eventHandler: CopilotEventHandler
    ): Promise<TaskApprovalResponse> {
        console.log(`[ApprovalService] Requesting task approval for generation: ${generationId}`);

        // Create approval promise via storage
        const { promise, requestId } = this.storage.requestApproval<TaskApprovalResponse>(
            workspaceId,
            threadId,
            generationId,
            'task',
            { taskDescription, tasks }
        );

        // Emit event to frontend
        eventHandler({
            type: "task_approval_request",
            requestId: requestId,
            approvalType: "completion",
            tasks: tasks,
            taskDescription: taskDescription,
            message: `Please verify the completed work for: ${taskDescription}`
        });

        return promise;
    }

    /**
     * Resolve task approval (called by RPC method when user responds)
     *
     * @param requestId Unique identifier for this approval request
     * @param approved Whether the task was approved
     * @param comment Optional comment from user
     * @param approvedTaskDescription Description of approved task
     */
    resolveTaskApproval(
        requestId: string,
        approved: boolean,
        comment?: string,
        approvedTaskDescription?: string
    ): void {
        console.log(`[ApprovalService] Resolving task approval: ${requestId}, approved: ${approved}`);
        this.storage.resolveApproval(requestId, { approved, comment, approvedTaskDescription });
    }

    // ============================================
    // Connector Spec Request
    // ============================================

    /**
     * Request connector spec from user
     * Emits connector_generation_notification event and waits for user response
     *
     * @param workspaceId Workspace identifier
     * @param threadId Thread identifier
     * @param generationId Generation identifier
     * @param eventHandler Event handler to emit spec request
     * @returns Promise that resolves when user provides/cancels spec
     */
    requestConnectorSpec(
        workspaceId: string,
        threadId: string,
        generationId: string,
        eventHandler: CopilotEventHandler
    ): Promise<ConnectorSpecResponse> {
        console.log(`[ApprovalService] Requesting connector spec for generation: ${generationId}`);

        // Create approval promise via storage
        const { promise, requestId } = this.storage.requestApproval<ConnectorSpecResponse>(
            workspaceId,
            threadId,
            generationId,
            'connector_spec',
            {}
        );

        // Emit event to frontend
        eventHandler({
            type: "connector_generation_notification",
            requestId: requestId,
            stage: "requesting_input",
            message: "Please provide the OpenAPI specification"
        });

        return promise;
    }

    /**
     * Resolve connector spec request (called by RPC method when user responds)
     *
     * @param requestId Unique identifier for this approval request
     * @param provided Whether the spec was provided
     * @param spec The OpenAPI spec (if provided)
     * @param comment Optional comment from user
     */
    resolveConnectorSpec(
        requestId: string,
        provided: boolean,
        spec?: any,
        comment?: string
    ): void {
        console.log(`[ApprovalService] Resolving connector spec: ${requestId}, provided: ${provided}`);
        this.storage.resolveApproval(requestId, { provided, spec, comment });
    }

    // ============================================
    // Cleanup
    // ============================================

    /**
     * Cancel all pending approvals for a thread (useful for abort scenarios)
     *
     * @param workspaceId Workspace identifier
     * @param threadId Thread identifier
     */
    cancelThreadApprovals(workspaceId: string, threadId: string): void {
        console.log(`[ApprovalService] Cancelling all pending approvals for thread: ${threadId}`);
        this.storage.cancelThreadApprovals(workspaceId, threadId);
    }

    /**
     * Get count of pending approvals (useful for debugging)
     */
    getPendingCount(): { plans: number; tasks: number; connectorSpecs: number } {
        return this.storage.getPendingApprovalCount();
    }
}

// Export singleton instance for convenience
export const approvalService = new ApprovalService(require('../../../views/ai-panel/chatStateStorage').chatStateStorage);
