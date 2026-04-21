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

import * as fs from 'fs';
import * as path from 'path';
import { TestResult } from '@wso2/api-designer-core';
import { logInfo, logError } from '../util/logger';

/**
 * Test execution history entry
 */
export interface TestHistoryEntry {
    id: string;
    requestId: string;
    requestName: string;
    result: TestResult;
    environment?: string;
    baseUrl?: string;
}

/**
 * Test history summary
 */
export interface TestHistorySummary {
    totalExecutions: number;
    successRate: number;
    averageResponseTime: number;
    lastExecution?: Date;
}

/**
 * Manager for test execution history
 */
export class TestHistory {
    private static readonly HISTORY_FILE = 'test-history.json';
    private static readonly MAX_HISTORY_ENTRIES = 100;

    /**
     * Get history file path
     */
    private static getHistoryPath(openApiPath: string): string {
        const openApiDir = path.dirname(openApiPath);
        return path.join(openApiDir, '.api-designer', this.HISTORY_FILE);
    }

    /**
     * Load test history
     */
    public static loadHistory(openApiPath: string): TestHistoryEntry[] {
        try {
            const historyPath = this.getHistoryPath(openApiPath);
            
            if (!fs.existsSync(historyPath)) {
                return [];
            }

            const content = fs.readFileSync(historyPath, 'utf8');
            const history: TestHistoryEntry[] = JSON.parse(content);
            
            return history;
        } catch (error) {
            logError('Failed to load test history:', error);
            return [];
        }
    }

    /**
     * Save test result to history
     */
    public static saveResult(
        openApiPath: string,
        requestName: string,
        result: TestResult,
        environment?: string,
        baseUrl?: string
    ): void {
        try {
            const history = this.loadHistory(openApiPath);
            
            // Add new entry
            const entry: TestHistoryEntry = {
                id: `history_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                requestId: result.requestId,
                requestName,
                result,
                environment,
                baseUrl
            };
            
            history.unshift(entry); // Add to beginning
            
            // Keep only last N entries
            const trimmedHistory = history.slice(0, this.MAX_HISTORY_ENTRIES);
            
            // Save
            const historyPath = this.getHistoryPath(openApiPath);
            const historyDir = path.dirname(historyPath);
            
            if (!fs.existsSync(historyDir)) {
                fs.mkdirSync(historyDir, { recursive: true });
            }
            
            fs.writeFileSync(historyPath, JSON.stringify(trimmedHistory, null, 2), 'utf8');
            
            logInfo(`Saved test result to history: ${requestName}`);
        } catch (error) {
            logError('Failed to save test history:', error);
        }
    }

    /**
     * Get history for a specific request
     */
    public static getRequestHistory(
        openApiPath: string,
        requestId: string
    ): TestHistoryEntry[] {
        const history = this.loadHistory(openApiPath);
        return history.filter(entry => entry.requestId === requestId);
    }

    /**
     * Get summary statistics
     */
    public static getSummary(openApiPath: string): TestHistorySummary {
        const history = this.loadHistory(openApiPath);
        
        if (history.length === 0) {
            return {
                totalExecutions: 0,
                successRate: 0,
                averageResponseTime: 0
            };
        }

        const successCount = history.filter(e => e.result.success).length;
        const totalResponseTime = history.reduce((sum, e) => {
            return sum + (e.result.response?.responseTime || 0);
        }, 0);

        const lastEntry = history[0];

        return {
            totalExecutions: history.length,
            successRate: (successCount / history.length) * 100,
            averageResponseTime: totalResponseTime / history.length,
            lastExecution: lastEntry ? new Date(lastEntry.result.timestamp) : undefined
        };
    }

    /**
     * Clear history
     */
    public static clearHistory(openApiPath: string): void {
        try {
            const historyPath = this.getHistoryPath(openApiPath);
            
            if (fs.existsSync(historyPath)) {
                fs.unlinkSync(historyPath);
                logInfo('Test history cleared');
            }
        } catch (error) {
            logError('Failed to clear test history:', error);
        }
    }

    /**
     * Export history to JSON
     */
    public static exportHistory(
        openApiPath: string,
        outputPath: string
    ): { success: boolean; message?: string } {
        try {
            const history = this.loadHistory(openApiPath);
            const summary = this.getSummary(openApiPath);
            
            const exportData = {
                exportedAt: new Date().toISOString(),
                summary,
                history
            };
            
            fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf8');
            
            logInfo(`Exported test history to: ${outputPath}`);
            
            return {
                success: true,
                message: `Exported ${history.length} test results`
            };
        } catch (error) {
            logError('Failed to export test history:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to export history'
            };
        }
    }
}

