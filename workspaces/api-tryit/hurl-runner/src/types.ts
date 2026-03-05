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

export interface HurlEnvironmentInfo {
	available: boolean;
	command: string;
	version?: string;
	errorMessage?: string;
}

export interface HurlRunInput {
	collectionPath: string;
	includePatterns?: string[];
	excludePatterns?: string[];
}

export interface HurlRunOptions {
	parallelism?: number;
	failFast?: boolean;
	continueOnError?: boolean;
	timeoutMs?: number;
	env?: Record<string, string>;
	variables?: Record<string, string>;
	insecure?: boolean;
	followRedirects?: boolean;
	includeResponseOutput?: boolean;
	commandPath?: string;
	onlyFailedFromRunId?: string;
	reportArtifactsDir?: string;
	signal?: AbortSignal;
}

export type HurlRunStatus = 'passed' | 'failed' | 'error' | 'cancelled';

export type HurlFileStatus = 'passed' | 'failed' | 'error' | 'skipped';

export interface HurlRunResult {
	runId: string;
	status: HurlRunStatus;
	startedAt: string;
	finishedAt: string;
	durationMs: number;
	summary: HurlRunSummary;
	files: HurlFileResult[];
	diagnostics: HurlRunDiagnostics;
}

export interface HurlRunSummary {
	totalFiles: number;
	passedFiles: number;
	failedFiles: number;
	errorFiles: number;
	skippedFiles: number;
	totalEntries: number;
	passedEntries: number;
	failedEntries: number;
}

export interface HurlFileResult {
	filePath: string;
	status: HurlFileStatus;
	startedAt: string;
	finishedAt: string;
	durationMs: number;
	entries: HurlEntryResult[];
	assertions: HurlAssertionResult[];
	errorMessage?: string;
	stdout?: string;
	stderr?: string;
}

export interface HurlEntryResult {
	name: string;
	method?: string;
	url?: string;
	statusCode?: number;
	status: 'passed' | 'failed' | 'error';
	durationMs?: number;
	assertions?: HurlAssertionResult[];
	line?: number;
	errorMessage?: string;
}

export interface HurlAssertionResult {
	filePath: string;
	entryName?: string;
	expression: string;
	status: 'passed' | 'failed';
	expected?: string;
	actual?: string;
	message?: string;
	line?: number;
}

export interface HurlRunDiagnostics {
	hurlVersion?: string;
	commandLine: string[];
	exitCode?: number;
	warnings: string[];
}

export interface HurlDiscoveryResult {
	rootPath: string;
	files: string[];
	totalFiles: number;
	warnings: string[];
}

export type HurlRunEvent =
	| { type: 'runStarted'; runId: string; totalFiles: number }
	| { type: 'fileStarted'; runId: string; filePath: string }
	| { type: 'fileFinished'; runId: string; file: HurlFileResult }
	| { type: 'runProgress'; runId: string; completedFiles: number; totalFiles: number }
	| { type: 'runFinished'; runId: string; result: HurlRunResult }
	| { type: 'runCancelled'; runId: string };

export interface HurlRunner {
	verifyEnvironment(commandPath?: string): Promise<HurlEnvironmentInfo>;
	discover(input: HurlRunInput): Promise<HurlDiscoveryResult>;
	run(input: HurlRunInput, options?: HurlRunOptions): Promise<HurlRunResult>;
	runStream(
		input: HurlRunInput,
		options: HurlRunOptions,
		onEvent: (event: HurlRunEvent) => void
	): Promise<HurlRunResult>;
}
