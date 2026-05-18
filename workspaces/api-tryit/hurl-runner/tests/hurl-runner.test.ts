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
import { HurlRunnerImpl } from '../src/hurl-runner';
import { ProcessAdapter, ProcessExecOptions, ProcessExecResult } from '../src/process-adapter';
import { HurlRunEvent } from '../src/types';

interface MockScenario {
	report?: unknown;
	exitCode?: number | null;
	stdout?: string;
	stderr?: string;
	timedOut?: boolean;
	error?: string;
	delayMs?: number;
}

class MockProcessAdapter implements ProcessAdapter {
	readonly calls: Array<{ command: string; args: string[]; options?: ProcessExecOptions }> = [];

	constructor(
		private readonly scenarios: Map<string, MockScenario>,
		private readonly versionResult: ProcessExecResult = {
			exitCode: 0,
			stdout: 'hurl 5.0.0',
			stderr: '',
			timedOut: false,
			cancelled: false
		}
	) {}

	async exec(command: string, args: string[], options: ProcessExecOptions = {}): Promise<ProcessExecResult> {
		this.calls.push({ command, args: [...args], options });

		if (args[0] === '--version') {
			return this.versionResult;
		}

		const filePath = path.resolve(args[0]);
		const reportArgIndex = args.indexOf('--report-json');
		const reportPath = reportArgIndex >= 0 ? args[reportArgIndex + 1] : undefined;
		const scenario = this.scenarios.get(filePath) || {};
		return this.executeScenario(scenario, reportPath, options.signal);
	}

	private async executeScenario(
		scenario: MockScenario,
		reportPath: string | undefined,
		signal?: AbortSignal
	): Promise<ProcessExecResult> {
		if (signal?.aborted) {
			return this.cancelledResult();
		}

		if (scenario.delayMs && scenario.delayMs > 0) {
			await new Promise<void>(resolve => {
				const timer = setTimeout(() => {
					cleanup();
					resolve();
				}, scenario.delayMs);
				const onAbort = (): void => {
					cleanup();
					resolve();
				};
				const cleanup = (): void => {
					clearTimeout(timer);
					signal?.removeEventListener('abort', onAbort);
				};
				signal?.addEventListener('abort', onAbort);
			});
		}

		if (signal?.aborted) {
			return this.cancelledResult();
		}

		if (reportPath && scenario.report !== undefined) {
			await fs.mkdir(reportPath, { recursive: true });
			await fs.writeFile(path.join(reportPath, 'report.json'), JSON.stringify([scenario.report]), 'utf8');
		}

		return {
			exitCode: scenario.exitCode ?? 0,
			stdout: scenario.stdout || '',
			stderr: scenario.stderr || '',
			timedOut: scenario.timedOut || false,
			cancelled: false,
			error: scenario.error
		};
	}

	private cancelledResult(): ProcessExecResult {
		return {
			exitCode: null,
			stdout: '',
			stderr: '',
			timedOut: false,
			cancelled: true
		};
	}
}

function buildPassReport(name: string): unknown {
	return {
		success: true,
		entries: [
			{
				name,
				success: true,
				request: { method: 'GET', url: `https://example.com/${name}` },
				response: { status: 200 }
			}
		],
		assertions: [{ expression: 'status == 200', success: true }]
	};
}

function buildFailReport(name: string): unknown {
	return {
		success: false,
		entries: [
			{
				name,
				success: false,
				request: { method: 'GET', url: `https://example.com/${name}` },
				response: { status: 500 }
			}
		],
		assertions: [{ expression: 'status == 200', success: false, actual: '500', expected: '200' }]
	};
}

async function createCollection(fileNames: string[]): Promise<{ root: string; files: string[] }> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'hurl-runner-cases-'));
	const files: string[] = [];

	for (const fileName of fileNames) {
		const fullPath = path.join(root, fileName);
		await fs.mkdir(path.dirname(fullPath), { recursive: true });
		await fs.writeFile(fullPath, 'GET https://example.com\nHTTP 200\n', 'utf8');
		files.push(path.resolve(fullPath));
	}

	return { root, files };
}

describe('HurlRunnerImpl', () => {
	const createdDirs: string[] = [];
	let runCounter = 0;
	let timeCounter = 0;
	const baseTime = new Date('2026-02-23T00:00:00.000Z').getTime();

	afterEach(async () => {
		runCounter = 0;
		timeCounter = 0;
		while (createdDirs.length > 0) {
			const dir = createdDirs.pop();
			if (dir) {
				await fs.rm(dir, { recursive: true, force: true });
			}
		}
	});

	function createRunner(adapter: ProcessAdapter): HurlRunnerImpl {
		return new HurlRunnerImpl({
			processAdapter: adapter,
			runId: () => `run-${++runCounter}`,
			now: () => new Date(baseTime + timeCounter++ * 10)
		});
	}

	it('verifyEnvironment returns available status and version', async () => {
		const adapter = new MockProcessAdapter(new Map());
		const runner = createRunner(adapter);

		const env = await runner.verifyEnvironment();

		expect(env.available).toBe(true);
		expect(env.version).toBe('hurl 5.0.0');
	});

	it('uses configured command path for environment verification and execution', async () => {
		const collection = await createCollection(['custom-command.hurl']);
		createdDirs.push(collection.root);
		const scenarios = new Map<string, MockScenario>([
			[collection.files[0], { report: buildPassReport('custom-command') }]
		]);
		const adapter = new MockProcessAdapter(scenarios);
		const runner = new HurlRunnerImpl({
			processAdapter: adapter,
			runId: () => `run-${++runCounter}`,
			now: () => new Date(baseTime + timeCounter++ * 10),
			command: '/opt/tools/hurl'
		});

		const env = await runner.verifyEnvironment();
		expect(env.available).toBe(true);
		expect(env.command).toBe('/opt/tools/hurl');

		await runner.run({ collectionPath: collection.root }, { parallelism: 1 });
		const commandCalls = adapter.calls.map(call => call.command);
		expect(commandCalls).toEqual(['/opt/tools/hurl', '/opt/tools/hurl', '/opt/tools/hurl']);
	});

	it('run returns aggregated summary and command diagnostics', async () => {
		const collection = await createCollection(['a.hurl', 'b.hurl']);
		createdDirs.push(collection.root);
		const scenarios = new Map<string, MockScenario>([
			[collection.files[0], { report: buildPassReport('a') }],
			[collection.files[1], { report: buildFailReport('b'), exitCode: 1 }]
		]);
		const adapter = new MockProcessAdapter(scenarios);
		const runner = createRunner(adapter);

		const result = await runner.run(
			{ collectionPath: collection.root },
			{
				parallelism: 1,
				insecure: true,
				followRedirects: true,
				variables: { token: 'abc' }
			}
		);

		expect(result.status).toBe('failed');
		expect(result.summary).toEqual({
			totalFiles: 2,
			passedFiles: 1,
			failedFiles: 1,
			errorFiles: 0,
			skippedFiles: 0,
			totalEntries: 2,
			passedEntries: 1,
			failedEntries: 1
		});
		expect(result.files.map(file => file.status)).toEqual(['passed', 'failed']);
		expect(result.diagnostics.commandLine).toEqual(
			expect.arrayContaining(['hurl', '--test', '--continue-on-error', '-k', '-L', '--variable', 'token=abc'])
		);
	});

	it('appends include output flag when includeResponseOutput is enabled', async () => {
		const collection = await createCollection(['include-output.hurl']);
		createdDirs.push(collection.root);
		const scenarios = new Map<string, MockScenario>([
			[collection.files[0], { report: buildPassReport('include-output') }]
		]);
		const adapter = new MockProcessAdapter(scenarios);
		const runner = createRunner(adapter);

		await runner.run({ collectionPath: collection.root }, { parallelism: 1, includeResponseOutput: true });

		const hurlCall = adapter.calls.find(call => call.args.includes('--report-json'));
		expect(hurlCall).toBeDefined();
		// --test is omitted when includeResponseOutput is true so stdout is not suppressed
		expect(hurlCall?.args).toEqual(expect.arrayContaining(['--continue-on-error', '-i']));
		expect(hurlCall?.args).not.toContain('--test');
	});

	it('allows disabling continue-on-error per run', async () => {
		const collection = await createCollection(['no-continue.hurl']);
		createdDirs.push(collection.root);
		const scenarios = new Map<string, MockScenario>([
			[collection.files[0], { report: buildPassReport('no-continue') }]
		]);
		const adapter = new MockProcessAdapter(scenarios);
		const runner = createRunner(adapter);

		await runner.run(
			{ collectionPath: collection.root },
			{ parallelism: 1, continueOnError: false }
		);

		const hurlCall = adapter.calls.find(call => call.args.includes('--report-json'));
		expect(hurlCall).toBeDefined();
		expect(hurlCall?.args).not.toContain('--continue-on-error');
	});

	it('runStream emits progress events in expected order', async () => {
		const collection = await createCollection(['one.hurl', 'two.hurl']);
		createdDirs.push(collection.root);
		const scenarios = new Map<string, MockScenario>([
			[collection.files[0], { report: buildPassReport('one') }],
			[collection.files[1], { report: buildPassReport('two') }]
		]);
		const adapter = new MockProcessAdapter(scenarios);
		const runner = createRunner(adapter);
		const events: HurlRunEvent[] = [];

		const result = await runner.runStream({ collectionPath: collection.root }, { parallelism: 1 }, event => {
			events.push(event);
		});

		expect(result.status).toBe('passed');
		expect(events.map(event => event.type)).toEqual([
			'runStarted',
			'fileStarted',
			'fileFinished',
			'runProgress',
			'fileStarted',
			'fileFinished',
			'runProgress',
			'runFinished'
		]);
	});

	it('supports failFast and marks remaining files as skipped', async () => {
		const collection = await createCollection(['one.hurl', 'two.hurl', 'three.hurl']);
		createdDirs.push(collection.root);
		const scenarios = new Map<string, MockScenario>([
			[collection.files[0], { report: buildFailReport('one'), exitCode: 1 }],
			[collection.files[1], { report: buildPassReport('two') }],
			[collection.files[2], { report: buildPassReport('three') }]
		]);
		const adapter = new MockProcessAdapter(scenarios);
		const runner = createRunner(adapter);
		const events: HurlRunEvent[] = [];

		const result = await runner.runStream(
			{ collectionPath: collection.root },
			{ parallelism: 1, failFast: true },
			event => events.push(event)
		);

		expect(result.status).toBe('failed');
		expect(result.files.map(file => file.status)).toEqual(['failed', 'skipped', 'skipped']);
		expect(result.summary.skippedFiles).toBe(2);
		expect(events.filter(event => event.type === 'fileStarted')).toHaveLength(1);
	});

	it('supports cancellation via AbortSignal and emits runCancelled', async () => {
		const collection = await createCollection(['cancelled.hurl', 'next.hurl']);
		createdDirs.push(collection.root);
		const scenarios = new Map<string, MockScenario>([
			[collection.files[0], { report: buildPassReport('cancelled'), delayMs: 100 }],
			[collection.files[1], { report: buildPassReport('next') }]
		]);
		const adapter = new MockProcessAdapter(scenarios);
		const runner = createRunner(adapter);
		const controller = new AbortController();
		const events: HurlRunEvent[] = [];

		const result = await runner.runStream(
			{ collectionPath: collection.root },
			{ parallelism: 1, signal: controller.signal },
			event => {
				events.push(event);
				if (event.type === 'fileStarted') {
					controller.abort();
				}
			}
		);

		expect(result.status).toBe('cancelled');
		expect(result.files[0].status).toBe('error');
		expect(result.files[0].errorMessage).toBe('Execution cancelled');
		expect(result.files[1].status).toBe('skipped');
		expect(events.map(event => event.type)).toContain('runCancelled');
	});

	it('supports rerun failed from previous run id', async () => {
		const collection = await createCollection(['pass.hurl', 'fail.hurl', 'pass-2.hurl']);
		createdDirs.push(collection.root);
		const scenarios = new Map<string, MockScenario>([
			[collection.files[0], { report: buildPassReport('pass') }],
			[collection.files[1], { report: buildFailReport('fail'), exitCode: 1 }],
			[collection.files[2], { report: buildPassReport('pass-2') }]
		]);
		const adapter = new MockProcessAdapter(scenarios);
		const runner = createRunner(adapter);

		const firstRun = await runner.run({ collectionPath: collection.root }, { parallelism: 1 });
		expect(firstRun.status).toBe('failed');

		const callsBeforeRerun = adapter.calls.length;
		const rerun = await runner.run(
			{ collectionPath: collection.root },
			{ parallelism: 1, onlyFailedFromRunId: firstRun.runId }
		);

		const rerunFileCalls = adapter.calls
			.slice(callsBeforeRerun)
			.filter(call => call.args.includes('--report-json'))
			.map(call => path.resolve(call.args[0]));

		expect(rerun.summary.totalFiles).toBe(1);
		expect(rerun.files).toHaveLength(1);
		expect(rerun.files[0].filePath).toBe(collection.files[1]);
		expect(rerunFileCalls).toEqual([collection.files[1]]);
	});
});
