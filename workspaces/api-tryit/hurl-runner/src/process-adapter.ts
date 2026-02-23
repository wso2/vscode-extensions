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

			let child;
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
				options.signal.addEventListener('abort', () => {
					cancelled = true;
					child.kill('SIGTERM');
				});
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
