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

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { discoverHurlFiles } from './discovery';
import { HurlRunnerError } from './errors';
import { ChildProcessAdapter, ProcessAdapter } from './process-adapter';
import { parseFileResult } from './report-parser';
import {
	HurlDiscoveryResult,
	HurlEnvironmentInfo,
	HurlFileResult,
	HurlRunEvent,
	HurlRunInput,
	HurlRunOptions,
	HurlRunResult,
	HurlRunSummary,
	HurlRunDiagnostics,
	HurlRunner
} from './types';

interface RunnerDependencies {
	processAdapter?: ProcessAdapter;
	now?: () => Date;
	runId?: () => string;
	command?: string;
}

interface ExecutionContext {
	runId: string;
	tempDir: string;
	rootPath: string;
	command: string;
	hurlVersion?: string;
	warnings: string[];
	runOptions: HurlRunOptions;
	cancelled: boolean;
	stopScheduling: boolean;
	firstCommandLine?: string[];
	globalExitCode?: number;
}

interface SingleFileExecutionResult {
	fileResult: HurlFileResult;
	exitCode: number | null;
}

export class HurlRunnerImpl implements HurlRunner {
	private readonly processAdapter: ProcessAdapter;
	private readonly now: () => Date;
	private readonly makeRunId: () => string;
	private readonly command: string;
	private readonly previousRuns = new Map<string, HurlRunResult>();
	private readonly MAX_PREVIOUS_RUNS = 50;

	constructor(deps: RunnerDependencies = {}) {
		this.processAdapter = deps.processAdapter || new ChildProcessAdapter();
		this.now = deps.now || (() => new Date());
		this.makeRunId = deps.runId || (() => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
		this.command = deps.command || 'hurl';
	}

	async verifyEnvironment(commandPath?: string): Promise<HurlEnvironmentInfo> {
		const resolvedCommand = commandPath || this.command;
		const result = await this.processAdapter.exec(resolvedCommand, ['--version']);
		if (result.exitCode !== 0 || result.error) {
			return {
				available: false,
				command: resolvedCommand,
				errorMessage: result.error || result.stderr || 'hurl command is not available'
			};
		}

		const text = (result.stdout || result.stderr || '').trim();
		const firstLine = text.split(/\r?\n/)[0];

		return {
			available: true,
			command: resolvedCommand,
			version: firstLine || undefined
		};
	}

	discover(input: HurlRunInput): Promise<HurlDiscoveryResult> {
		return discoverHurlFiles(input);
	}

	run(input: HurlRunInput, options: HurlRunOptions = {}): Promise<HurlRunResult> {
		return this.runStream(input, options, () => undefined);
	}

	async runStream(
		input: HurlRunInput,
		options: HurlRunOptions,
		onEvent: (event: HurlRunEvent) => void
	): Promise<HurlRunResult> {
		const runId = this.makeRunId();
		const runStarted = this.now();
		const warnings: string[] = [];

		let discovery: HurlDiscoveryResult;
		try {
			discovery = await this.discover(input);
			warnings.push(...discovery.warnings);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to discover hurl files';
			const result = this.buildFinalResult({
				runId,
				startedAt: runStarted,
				finishedAt: this.now(),
				files: [],
				diagnostics: {
					commandLine: [],
					warnings,
					exitCode: 1
				},
				forcedStatus: 'error'
			});
			result.diagnostics.warnings.push(message);
			onEvent({ type: 'runFinished', runId, result });
			this.recordRun(runId, result);
			return result;
		}

		let files = discovery.files;
		if (options.onlyFailedFromRunId) {
			const previous = this.previousRuns.get(options.onlyFailedFromRunId);
			if (!previous) {
				warnings.push(`No previous run found for run id: ${options.onlyFailedFromRunId}`);
				files = [];
			} else {
				const failedFiles = new Set(
					previous.files
						.filter(file => file.status === 'failed' || file.status === 'error')
						.map(file => file.filePath)
				);
				files = files.filter(file => failedFiles.has(file));
			}
		}

		onEvent({ type: 'runStarted', runId, totalFiles: files.length });

		if (options.signal?.aborted) {
			onEvent({ type: 'runCancelled', runId });
			const result = this.buildFinalResult({
				runId,
				startedAt: runStarted,
				finishedAt: this.now(),
				files: [],
				diagnostics: {
					commandLine: [],
					warnings,
					exitCode: 1
				},
				forcedStatus: 'cancelled'
			});
			onEvent({ type: 'runFinished', runId, result });
			this.recordRun(runId, result);
			return result;
		}

		let hurlVersion: string | undefined;
		const resolvedCommand = options.commandPath || this.command;
		try {
			const envInfo = await this.verifyEnvironment(resolvedCommand);
			if (!envInfo.available) {
				const result = this.buildFinalResult({
					runId,
					startedAt: runStarted,
					finishedAt: this.now(),
					files: [],
					diagnostics: {
						commandLine: [resolvedCommand],
						warnings,
						exitCode: 1
					},
					forcedStatus: 'error'
				});
				if (envInfo.errorMessage) {
					result.diagnostics.warnings.push(envInfo.errorMessage);
				}
				onEvent({ type: 'runFinished', runId, result });
				this.recordRun(runId, result);
				return result;
			}
			hurlVersion = envInfo.version;
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to verify Hurl environment';
			const result = this.buildFinalResult({
				runId,
				startedAt: runStarted,
				finishedAt: this.now(),
				files: [],
				diagnostics: {
					commandLine: [resolvedCommand],
					warnings: [...warnings, message],
					exitCode: 1
				},
				forcedStatus: 'error'
			});
			onEvent({ type: 'runFinished', runId, result });
			this.recordRun(runId, result);
			return result;
		}

		if (files.length === 0) {
			const result = this.buildFinalResult({
				runId,
				startedAt: runStarted,
				finishedAt: this.now(),
				files: [],
				diagnostics: {
					commandLine: [],
					warnings: [...warnings, 'No hurl files available to run.'],
					exitCode: 1
				},
				forcedStatus: 'error'
			});
			onEvent({ type: 'runFinished', runId, result });
			this.recordRun(runId, result);
			return result;
		}

		const tempDir = options.reportArtifactsDir
			? path.resolve(options.reportArtifactsDir)
			: await fs.mkdtemp(path.join(os.tmpdir(), 'hurl-runner-'));
		await fs.mkdir(tempDir, { recursive: true });

		const context: ExecutionContext = {
			runId,
			tempDir,
			rootPath: discovery.rootPath,
			command: resolvedCommand,
			hurlVersion,
			warnings,
			runOptions: options,
			cancelled: false,
			stopScheduling: false
		};

		const parallelism = Math.max(1, options.parallelism || 1);
		const fileResults: Array<HurlFileResult | undefined> = new Array(files.length);
		let nextIndex = 0;
		let completed = 0;

		const worker = async (): Promise<void> => {
			while (true) {
				if (context.stopScheduling || context.cancelled) {
					break;
				}

				if (options.signal?.aborted) {
					context.cancelled = true;
					context.stopScheduling = true;
					break;
				}

				const currentIndex = nextIndex;
				if (currentIndex >= files.length) {
					break;
				}
				nextIndex += 1;

				const filePath = files[currentIndex];
				onEvent({ type: 'fileStarted', runId, filePath });
				const execution = await this.executeSingleFile(filePath, currentIndex, context);
				fileResults[currentIndex] = execution.fileResult;
				completed += 1;

				onEvent({ type: 'fileFinished', runId, file: execution.fileResult });
				onEvent({ type: 'runProgress', runId, completedFiles: completed, totalFiles: files.length });

				if (execution.exitCode !== null && typeof context.globalExitCode !== 'number') {
					context.globalExitCode = execution.exitCode;
				}

				if (options.failFast && (execution.fileResult.status === 'failed' || execution.fileResult.status === 'error')) {
					context.stopScheduling = true;
				}

				if (options.signal?.aborted || (execution.fileResult.status === 'error' && execution.fileResult.errorMessage === 'Execution cancelled')) {
					context.cancelled = true;
					context.stopScheduling = true;
				}
			}
		};

		const workers = Array.from({ length: Math.min(parallelism, files.length) }, () => worker());
		await Promise.all(workers);

		if (context.cancelled) {
			onEvent({ type: 'runCancelled', runId });
		}

		for (let index = 0; index < fileResults.length; index++) {
			if (!fileResults[index]) {
				const now = this.now();
				fileResults[index] = {
					filePath: files[index],
					status: 'skipped',
					startedAt: now.toISOString(),
					finishedAt: now.toISOString(),
					durationMs: 0,
					entries: [],
					assertions: []
				};
			}
		}

		const finalDiagnostics: HurlRunDiagnostics = {
			commandLine: context.firstCommandLine || [],
			hurlVersion: context.hurlVersion,
			exitCode: context.globalExitCode,
			warnings: [...warnings]
		};

		const result = this.buildFinalResult({
			runId,
			startedAt: runStarted,
			finishedAt: this.now(),
			files: fileResults as HurlFileResult[],
			diagnostics: finalDiagnostics,
			forcedStatus: context.cancelled ? 'cancelled' : undefined
		});

		onEvent({ type: 'runFinished', runId, result });
		this.recordRun(runId, result);

		if (!options.reportArtifactsDir) {
			await fs.rm(tempDir, { recursive: true, force: true });
		}

		return result;
	}

	private recordRun(runId: string, result: HurlRunResult): void {
		this.previousRuns.set(runId, result);
		if (this.previousRuns.size > this.MAX_PREVIOUS_RUNS) {
			const oldestKey = this.previousRuns.keys().next().value!;
			this.previousRuns.delete(oldestKey);
		}
	}

	private async executeSingleFile(
		filePath: string,
		fileIndex: number,
		context: ExecutionContext
	): Promise<SingleFileExecutionResult> {
		const reportPath = path.join(context.tempDir, `report-${fileIndex + 1}`);
		const args = this.buildHurlArgs(filePath, reportPath, context.runOptions);
		if (!context.firstCommandLine) {
			context.firstCommandLine = [context.command, ...args];
		}

		const startedAt = this.now();
		const execResult = await this.processAdapter.exec(context.command, args, {
			cwd: context.rootPath,
			env: context.runOptions.env,
			timeoutMs: context.runOptions.timeoutMs,
			signal: context.runOptions.signal
		});
		const finishedAt = this.now();
		const parsed = await parseFileResult({
			filePath,
			reportPath,
			startedAt,
			finishedAt,
			execResult
		});

		return {
			fileResult: parsed,
			exitCode: execResult.exitCode
		};
	}

	private buildHurlArgs(filePath: string, reportPath: string, options: HurlRunOptions): string[] {
		const args = [filePath, '--report-json', reportPath];
		// --test suppresses all response output; omit it when the caller wants the response body
		if (!options.includeResponseOutput) {
			args.push('--test');
		}
		if (options.continueOnError !== false) {
			args.push('--continue-on-error');
		}

		if (options.includeResponseOutput) {
			args.push('-i');
		}
		if (options.insecure) {
			args.push('-k');
		}
		if (options.followRedirects) {
			args.push('-L');
		}
		for (const [key, value] of Object.entries(options.variables || {})) {
			args.push('--variable', `${key}=${value}`);
		}
		return args;
	}

	private buildFinalResult(input: {
		runId: string;
		startedAt: Date;
		finishedAt: Date;
		files: HurlFileResult[];
		diagnostics: HurlRunDiagnostics;
		forcedStatus?: HurlRunResult['status'];
	}): HurlRunResult {
		const summary = this.buildSummary(input.files);
		const status = input.forcedStatus || this.deriveRunStatus(summary);

		return {
			runId: input.runId,
			status,
			startedAt: input.startedAt.toISOString(),
			finishedAt: input.finishedAt.toISOString(),
			durationMs: input.finishedAt.getTime() - input.startedAt.getTime(),
			summary,
			files: input.files,
			diagnostics: input.diagnostics
		};
	}

	private deriveRunStatus(summary: HurlRunSummary): HurlRunResult['status'] {
		if (summary.errorFiles > 0) {
			return 'error';
		}
		if (summary.failedFiles > 0) {
			return 'failed';
		}
		return 'passed';
	}

	private buildSummary(files: HurlFileResult[]): HurlRunSummary {
		let passedFiles = 0;
		let failedFiles = 0;
		let errorFiles = 0;
		let skippedFiles = 0;
		let totalEntries = 0;
		let passedEntries = 0;
		let failedEntries = 0;

		for (const file of files) {
			if (file.status === 'passed') {
				passedFiles += 1;
			} else if (file.status === 'failed') {
				failedFiles += 1;
			} else if (file.status === 'error') {
				errorFiles += 1;
			} else if (file.status === 'skipped') {
				skippedFiles += 1;
			}

			totalEntries += file.entries.length;
			for (const entry of file.entries) {
				if (entry.status === 'passed') {
					passedEntries += 1;
				} else {
					failedEntries += 1;
				}
			}
		}

		return {
			totalFiles: files.length,
			passedFiles,
			failedFiles,
			errorFiles,
			skippedFiles,
			totalEntries,
			passedEntries,
			failedEntries
		};
	}
}

export function createHurlRunner(deps?: RunnerDependencies): HurlRunner {
	return new HurlRunnerImpl(deps);
}

export function assertSupportedOptions(options: HurlRunOptions): void {
	if (options.parallelism && options.parallelism < 1) {
		throw new HurlRunnerError('execution_error', 'parallelism must be greater than 0');
	}
}
