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

import * as fs from 'fs/promises';
import * as path from 'path';
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator';
import { logDebug, logError, logInfo } from '../copilot/logger';

// Storage location: <project>/.mi-copilot/<session_id>/plan/<plan-slug>.md
// Plans are stored in the project folder so they are visible to the user

/**
 * User decision recorded during planning
 */
export interface UserDecision {
    question: string;
    answer: string;
    timestamp: string;
}

/**
 * Plan content structure (simplified - no todos, they're in-memory via chat context)
 */
export interface PlanContent {
    sessionId: string;
    projectPath: string;
    status: 'planning' | 'approved' | 'executing' | 'completed';
    createdAt: string;
    updatedAt: string;
    summary?: string;
    userDecisions: UserDecision[];
    notes?: string;
}

/**
 * Plan Manager (Simplified)
 *
 * Handles plan mode state and user decisions.
 * NOTE: Todos are NOT persisted here - they are maintained in-memory through
 * chat context (tool calls in chat history), just like Claude Code.
 *
 * Plan files are stored at: <project>/.mi-copilot/<session-id>/plan/<plan-slug>.md
 */
export class PlanManager {
    private projectPath: string;
    private sessionId: string;
    private planFile: string = '';
    private planSlug: string | null = null;  // Generated slug for plan file
    private isPlanModeActive: boolean = false;
    private userDecisions: UserDecision[] = [];
    private summary: string = '';
    private status: PlanContent['status'] = 'planning';
    private createdAt: string = '';
    private updatedAt: string = '';
    private currentPlanPath: string | null = null;  // Track agent-created plan file

    constructor(projectPath: string, sessionId: string) {
        this.projectPath = projectPath;
        this.sessionId = sessionId;
    }

    /**
     * Generate a memorable slug for the plan file
     * Format: adjective-color-animal (e.g., "harmonic-azure-falcon")
     */
    private generateSlug(): string {
        return uniqueNamesGenerator({
            dictionaries: [adjectives, colors, animals],
            separator: '-',
            length: 3,
            style: 'lowerCase'
        });
    }

    /**
     * Get the session plan directory: <project>/.mi-copilot/<session-id>/plan/
     */
    private getSessionPlanDir(): string {
        return path.join(this.projectPath, '.mi-copilot', this.sessionId, 'plan');
    }

    /**
     * Ensure .gitignore exists in .mi-copilot folder to exclude session files from git
     */
    private async ensureGitignore(): Promise<void> {
        const miCopilotDir = path.join(this.projectPath, '.mi-copilot');
        const gitignorePath = path.join(miCopilotDir, '.gitignore');

        try {
            await fs.access(gitignorePath);
            // File exists, no need to create
        } catch {
            // File doesn't exist, create it
            const content = `# MI Copilot session files - auto-generated
# Each session folder contains chat history and plans
*/
`;
            await fs.writeFile(gitignorePath, content, 'utf8');
            logDebug('[PlanManager] Created .mi-copilot/.gitignore');
        }
    }

    /**
     * Get or create the plan file path
     * If no plan exists, generates a new slug
     */
    async getOrCreatePlanPath(): Promise<string> {
        const planDir = this.getSessionPlanDir();

        // Check for existing plan files
        try {
            await fs.mkdir(planDir, { recursive: true });
            const files = await fs.readdir(planDir);
            const planFiles = files.filter(f => f.endsWith('.md'));

            if (planFiles.length > 0) {
                // Use existing plan file
                this.planSlug = planFiles[0].replace('.md', '');
                logInfo(`[PlanManager] Using existing plan: ${this.planSlug}`);
            } else {
                // Generate new slug
                this.planSlug = this.generateSlug();
                logInfo(`[PlanManager] Generated new plan slug: ${this.planSlug}`);
            }
        } catch (error) {
            // Directory doesn't exist, generate new slug
            this.planSlug = this.generateSlug();
            await fs.mkdir(planDir, { recursive: true });
        }

        return path.join(planDir, `${this.planSlug}.md`);
    }

    /**
     * Get the current plan slug
     */
    getPlanSlug(): string | null {
        return this.planSlug;
    }

    /**
     * Initialize the plan manager
     * Creates necessary directories and ensures .gitignore exists
     */
    async initialize(): Promise<void> {
        try {
            // Create session plan directory: <project>/.mi-copilot/<session-id>/plan/
            const planDir = this.getSessionPlanDir();
            await fs.mkdir(planDir, { recursive: true });

            // Ensure .gitignore exists in .mi-copilot folder
            await this.ensureGitignore();

            // Get or create plan path (with slug)
            this.planFile = await this.getOrCreatePlanPath();

            // Check if plan file exists and load it
            try {
                await fs.access(this.planFile);
                // File exists, load it
                const plan = await this.loadPlan();
                if (plan) {
                    this.userDecisions = plan.userDecisions;
                    this.summary = plan.summary || '';
                    this.status = plan.status;
                    this.createdAt = plan.createdAt;
                    this.updatedAt = plan.updatedAt;
                    this.isPlanModeActive = plan.status === 'planning' || plan.status === 'executing';
                    logInfo(`[PlanManager] Loaded existing plan`);
                }
            } catch {
                // File doesn't exist, that's fine
                this.createdAt = new Date().toISOString();
                this.updatedAt = this.createdAt;
                logInfo('[PlanManager] No existing plan found');
            }

            logInfo(`[PlanManager] Initialized for project: ${this.projectPath}`);
            logDebug(`[PlanManager] Plan file: ${this.planFile}`);
        } catch (error) {
            logError('[PlanManager] Failed to initialize', error);
            throw error;
        }
    }

    // ============================================================================
    // Plan Mode Control
    // ============================================================================

    /**
     * Enter plan mode
     */
    async enterPlanMode(): Promise<void> {
        this.isPlanModeActive = true;
        this.status = 'planning';
        this.updatedAt = new Date().toISOString();
        if (!this.createdAt) {
            this.createdAt = this.updatedAt;
        }
        await this.savePlan();
        logInfo(`[PlanManager] Entered plan mode`);
    }

    /**
     * Exit plan mode
     */
    async exitPlanMode(summary?: string): Promise<void> {
        this.isPlanModeActive = false;
        this.status = 'completed';
        if (summary) {
            this.summary = summary;
        }
        this.updatedAt = new Date().toISOString();
        await this.savePlan();
        logInfo(`[PlanManager] Exited plan mode`);
    }

    /**
     * Check if plan mode is active
     */
    isPlanMode(): boolean {
        return this.isPlanModeActive;
    }

    /**
     * Set plan status
     */
    async setStatus(status: PlanContent['status']): Promise<void> {
        this.status = status;
        this.updatedAt = new Date().toISOString();
        await this.savePlan();
    }

    // ============================================================================
    // User Decisions
    // ============================================================================

    /**
     * Add a user decision to the plan
     */
    async addUserDecision(question: string, answer: string): Promise<void> {
        this.userDecisions.push({
            question,
            answer,
            timestamp: new Date().toISOString()
        });
        this.updatedAt = new Date().toISOString();
        await this.savePlan();
        logDebug(`[PlanManager] Added user decision: ${question}`);
    }

    /**
     * Get all user decisions
     */
    getUserDecisions(): UserDecision[] {
        return this.userDecisions;
    }

    // ============================================================================
    // Plan File Operations
    // ============================================================================

    /**
     * Save plan to markdown file
     */
    async savePlan(): Promise<void> {
        try {
            const content = this.generateMarkdown();
            await fs.writeFile(this.planFile, content, 'utf8');
            logDebug(`[PlanManager] Saved plan to ${this.planFile}`);
        } catch (error) {
            logError('[PlanManager] Failed to save plan', error);
            throw error;
        }
    }

    /**
     * Load plan from markdown file
     */
    async loadPlan(): Promise<PlanContent | null> {
        try {
            const content = await fs.readFile(this.planFile, 'utf8');
            return this.parseMarkdown(content);
        } catch (error) {
            logError('[PlanManager] Failed to load plan', error);
            return null;
        }
    }

    /**
     * Generate markdown content from plan state
     * NOTE: Todos are NOT included - they're maintained in-memory via chat context
     */
    private generateMarkdown(): string {
        const lines: string[] = [];

        // Header
        lines.push('# MI Agent Plan');
        lines.push('');
        lines.push(`**Session:** ${this.sessionId}`);
        lines.push(`**Project:** ${this.projectPath}`);
        lines.push(`**Created:** ${this.createdAt}`);
        lines.push(`**Updated:** ${this.updatedAt}`);
        lines.push(`**Status:** ${this.status}`);
        lines.push('');

        // Summary
        if (this.summary) {
            lines.push('## Summary');
            lines.push('');
            lines.push(this.summary);
            lines.push('');
        }

        // User Decisions
        if (this.userDecisions.length > 0) {
            lines.push('## User Decisions');
            lines.push('');
            for (const decision of this.userDecisions) {
                lines.push(`- **Q:** ${decision.question}`);
                lines.push(`  **A:** ${decision.answer}`);
                lines.push('');
            }
        }

        // JSON data block for parsing
        lines.push('<!-- PLAN_DATA');
        lines.push(JSON.stringify({
            sessionId: this.sessionId,
            projectPath: this.projectPath,
            status: this.status,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            summary: this.summary,
            userDecisions: this.userDecisions
        }, null, 2));
        lines.push('-->');

        return lines.join('\n');
    }

    /**
     * Parse markdown content to extract plan data
     */
    private parseMarkdown(content: string): PlanContent | null {
        try {
            // Extract JSON data from comment block
            const match = content.match(/<!-- PLAN_DATA\n([\s\S]*?)\n-->/);
            if (match && match[1]) {
                return JSON.parse(match[1]);
            }

            // Fallback: parse markdown structure (less reliable)
            logDebug('[PlanManager] No JSON data block found, returning null');
            return null;
        } catch (error) {
            logError('[PlanManager] Failed to parse plan markdown', error);
            return null;
        }
    }

    // ============================================================================
    // Utility Methods
    // ============================================================================

    /**
     * Get plan file path
     */
    getPlanFilePath(): string {
        return this.planFile;
    }

    /**
     * Get session ID
     */
    getSessionId(): string {
        return this.sessionId;
    }

    /**
     * Get project path
     */
    getProjectPath(): string {
        return this.projectPath;
    }

    /**
     * Get current summary
     */
    getSummary(): string {
        return this.summary;
    }

    /**
     * Set summary
     */
    async setSummary(summary: string): Promise<void> {
        this.summary = summary;
        this.updatedAt = new Date().toISOString();
        await this.savePlan();
    }

    /**
     * Get the plans directory path for a project (static version)
     */
    private static getPlansDir(projectPath: string): string {
        return path.join(projectPath, '.mi-copilot', 'plans');
    }

    /**
     * List all plans for a project
     */
    static async listPlans(projectPath: string): Promise<string[]> {
        try {
            const plansDir = this.getPlansDir(projectPath);

            const files = await fs.readdir(plansDir);
            const planFiles = files
                .filter(file => file.endsWith('.md'))
                .map(file => file.replace('.md', ''));

            // Sort by file modification time (newest first)
            const sorted = await Promise.all(
                planFiles.map(async sessionId => {
                    const filePath = path.join(plansDir, `${sessionId}.md`);
                    const stats = await fs.stat(filePath);
                    return { sessionId, mtime: stats.mtime.getTime() };
                })
            );

            sorted.sort((a, b) => b.mtime - a.mtime);
            return sorted.map(s => s.sessionId);
        } catch (error) {
            logError('[PlanManager] Failed to list plans', error);
            return [];
        }
    }

    /**
     * Delete a plan file
     */
    static async deletePlan(projectPath: string, sessionId: string): Promise<void> {
        try {
            const plansDir = this.getPlansDir(projectPath);
            const planFile = path.join(plansDir, `${sessionId}.md`);
            await fs.unlink(planFile);
            logInfo(`[PlanManager] Deleted plan: ${sessionId}`);
        } catch (error) {
            logError('[PlanManager] Failed to delete plan', error);
            throw error;
        }
    }

    /**
     * Set the current plan path (when agent creates a plan file using file_write)
     */
    setCurrentPlanPath(planPath: string): void {
        this.currentPlanPath = planPath;
        logDebug(`[PlanManager] Set current plan path: ${planPath}`);
    }

    /**
     * Get the current plan path
     * Returns the agent-created plan path if set, or the slug-based path if available
     */
    getCurrentPlanPath(): string | null {
        if (this.currentPlanPath) {
            return this.currentPlanPath;
        }
        if (this.planSlug) {
            return path.join(this.getSessionPlanDir(), `${this.planSlug}.md`);
        }
        return null;
    }
}
