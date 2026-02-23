import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { parseFileResult } from '../src/report-parser';
import { ProcessExecResult } from '../src/process-adapter';

function makeExecResult(overrides: Partial<ProcessExecResult> = {}): ProcessExecResult {
	return {
		exitCode: 0,
		stdout: '',
		stderr: '',
		timedOut: false,
		cancelled: false,
		...overrides
	};
}

describe('parseFileResult', () => {
	let tempDir = '';

	afterEach(async () => {
		if (tempDir) {
			await fs.rm(tempDir, { recursive: true, force: true });
			tempDir = '';
		}
	});

	it('maps report entries and assertions into normalized model', async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hurl-runner-report-'));
		const reportPath = path.join(tempDir, 'report.json');

		await fs.writeFile(
			reportPath,
			JSON.stringify({
				success: false,
				entries: [
					{
						name: 'Create user',
						success: false,
						time: 12,
						request: { method: 'POST', url: 'https://example.com/users' },
						response: { status: 500 }
					}
				],
				assertions: [
					{
						entryName: 'Create user',
						expression: 'status == 201',
						success: false,
						expected: '201',
						actual: '500',
						message: 'Expected status 201',
						line: 9
					}
				]
			}),
			'utf8'
		);

		const startedAt = new Date('2026-02-23T00:00:00.000Z');
		const finishedAt = new Date('2026-02-23T00:00:00.030Z');
		const parsed = await parseFileResult({
			filePath: '/tmp/cases/create-user.hurl',
			reportPath,
			startedAt,
			finishedAt,
			execResult: makeExecResult({ exitCode: 1 })
		});

		expect(parsed.status).toBe('failed');
		expect(parsed.durationMs).toBe(30);
		expect(parsed.entries).toEqual([
			{
				name: 'Create user',
				method: 'POST',
				url: 'https://example.com/users',
				statusCode: 500,
				status: 'failed',
				durationMs: 12
			}
		]);
		expect(parsed.assertions).toEqual([
			{
				filePath: '/tmp/cases/create-user.hurl',
				entryName: 'Create user',
				expression: 'status == 201',
				status: 'failed',
				expected: '201',
				actual: '500',
				message: 'Expected status 201',
				line: 9
			}
		]);
	});

	it('surfaces parse errors when the report is invalid and process failed', async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hurl-runner-report-'));
		const reportPath = path.join(tempDir, 'invalid.json');
		await fs.writeFile(reportPath, 'not-json', 'utf8');

		const parsed = await parseFileResult({
			filePath: '/tmp/cases/broken.hurl',
			reportPath,
			startedAt: new Date('2026-02-23T00:00:00.000Z'),
			finishedAt: new Date('2026-02-23T00:00:00.010Z'),
			execResult: makeExecResult({ exitCode: 1, stderr: 'failed run' })
		});

		expect(parsed.status).toBe('failed');
		expect(parsed.errorMessage).toMatch(/Unexpected token|JSON/);
	});

	it('marks cancellation as file error with explicit message', async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hurl-runner-report-'));
		const reportPath = path.join(tempDir, 'missing.json');

		const parsed = await parseFileResult({
			filePath: '/tmp/cases/cancelled.hurl',
			reportPath,
			startedAt: new Date('2026-02-23T00:00:00.000Z'),
			finishedAt: new Date('2026-02-23T00:00:00.010Z'),
			execResult: makeExecResult({ exitCode: null, cancelled: true })
		});

		expect(parsed.status).toBe('error');
		expect(parsed.errorMessage).toBe('Execution cancelled');
	});
});
