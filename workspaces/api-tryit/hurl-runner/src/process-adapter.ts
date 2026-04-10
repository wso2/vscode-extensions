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
import { spawn } from 'child_process';

export interface ProcessExecOptions {
	cwd?: string;
	env?: Record<string, string>;
	timeoutMs?: number;
	signal?: AbortSignal;
}

export interface ProcessExecResult {
	exitCode: number | null;
	stdout: string;
	stderr: string;
	timedOut: boolean;
	cancelled: boolean;
	error?: string;
}

export interface ProcessAdapter {
	exec(command: string, args: string[], options?: ProcessExecOptions): Promise<ProcessExecResult>;
}

export class ChildProcessAdapter implements ProcessAdapter {
	exec(command: string, args: string[], options: ProcessExecOptions = {}): Promise<ProcessExecResult> {
		return new Promise(resolve => {
			let stdout = '';
			let stderr = '';
			let timedOut = false;
			let cancelled = false;
			let finished = false;
			let timeoutHandle: NodeJS.Timeout | undefined;
			let child: ReturnType<typeof spawn> | undefined;

			const finalize = (result: ProcessExecResult): void => {
				if (finished) {
					return;
				}
				finished = true;
				if (timeoutHandle) {
					clearTimeout(timeoutHandle);
				}
				if (options.signal) {
					options.signal.removeEventListener('abort', onAbort);
				}
				resolve(result);
			};

			const onAbort = (): void => {
				cancelled = true;
				child?.kill('SIGTERM');
			};

			if (options.signal?.aborted) {
				finalize({
					exitCode: null,
					stdout,
					stderr,
					timedOut,
					cancelled: true
				});
				return;
			}

			try {
				child = spawn(command, args, {
					cwd: options.cwd,
					env: { ...process.env, ...(options.env || {}) },
					shell: false
				});
			} catch (error) {
				finalize({
					exitCode: null,
					stdout,
					stderr,
					timedOut,
					cancelled,
					error: error instanceof Error ? error.message : 'Failed to spawn process'
				});
				return;
			}

			if (options.timeoutMs && options.timeoutMs > 0) {
				timeoutHandle = setTimeout(() => {
					timedOut = true;
					child.kill('SIGKILL');
				}, options.timeoutMs);
			}

			if (options.signal) {
				options.signal.addEventListener('abort', onAbort);
			}

			child.stdout?.on('data', chunk => {
				stdout += chunk.toString();
			});

			child.stderr?.on('data', chunk => {
				stderr += chunk.toString();
			});

			child.on('error', error => {
				finalize({
					exitCode: null,
					stdout,
					stderr,
					timedOut,
					cancelled,
					error: error.message
				});
			});

			child.on('close', code => {
				finalize({
					exitCode: code,
					stdout,
					stderr,
					timedOut,
					cancelled
				});
			});
		});
	}
}
