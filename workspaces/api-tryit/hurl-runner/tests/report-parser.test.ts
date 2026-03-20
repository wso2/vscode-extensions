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
		const reportPath = path.join(tempDir, 'report');
		await fs.mkdir(reportPath, { recursive: true });

		await fs.writeFile(
			path.join(reportPath, 'report.json'),
			JSON.stringify([
				{
					filename: '/tmp/cases/create-user.hurl',
					success: false,
					entries: [
						{
							name: 'Create user',
							success: false,
							time: 12,
							request: { method: 'POST', url: 'https://example.com/users' },
							response: { status: 500 },
							asserts: [
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
						}
					]
				}
			]),
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
		expect(parsed.entries).toHaveLength(1);
		expect(parsed.entries[0]).toMatchObject({
			name: 'Create user',
			method: 'POST',
			url: 'https://example.com/users',
			statusCode: 500,
			status: 'failed',
			durationMs: 12
		});
		expect(parsed.entries[0].assertions).toHaveLength(1);
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

	it('normalizes string status values into numeric statusCode', async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hurl-runner-report-'));
		const reportPath = path.join(tempDir, 'report');
		await fs.mkdir(reportPath, { recursive: true });

		await fs.writeFile(
			path.join(reportPath, 'report.json'),
			JSON.stringify([
				{
					filename: '/tmp/cases/get-user.hurl',
					success: true,
					entries: [
						{
							name: 'Get user',
							success: true,
							time: 7,
							request: { method: 'GET', url: 'https://example.com/users/1' },
							response: { status: '200 OK' }
						}
					]
				}
			]),
			'utf8'
		);

		const parsed = await parseFileResult({
			filePath: '/tmp/cases/get-user.hurl',
			reportPath,
			startedAt: new Date('2026-02-23T00:00:00.000Z'),
			finishedAt: new Date('2026-02-23T00:00:00.010Z'),
			execResult: makeExecResult()
		});

		expect(parsed.entries).toHaveLength(1);
		expect(parsed.entries[0].statusCode).toBe(200);
	});

	it('extracts statusCode from calls response payload', async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hurl-runner-report-'));
		const reportPath = path.join(tempDir, 'report');
		await fs.mkdir(reportPath, { recursive: true });

		await fs.writeFile(
			path.join(reportPath, 'report.json'),
			JSON.stringify([
				{
					filename: '/tmp/cases/get-status.hurl',
					success: true,
					entries: [
						{
							name: 'Get status',
							success: true,
							request: { method: 'GET', url: 'https://example.com/status' },
							calls: [
								{ response: { status: '200 OK' } }
							]
						}
					]
				}
			]),
			'utf8'
		);

		const parsed = await parseFileResult({
			filePath: '/tmp/cases/get-status.hurl',
			reportPath,
			startedAt: new Date('2026-02-23T00:00:00.000Z'),
			finishedAt: new Date('2026-02-23T00:00:00.010Z'),
			execResult: makeExecResult()
		});

		expect(parsed.entries).toHaveLength(1);
		expect(parsed.entries[0].statusCode).toBe(200);
	});

	it('surfaces parse errors when the report is invalid and process failed', async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hurl-runner-report-'));
		const reportPath = path.join(tempDir, 'invalid');
		await fs.mkdir(reportPath, { recursive: true });
		await fs.writeFile(path.join(reportPath, 'report.json'), 'not-json', 'utf8');

		const parsed = await parseFileResult({
			filePath: '/tmp/cases/broken.hurl',
			reportPath,
			startedAt: new Date('2026-02-23T00:00:00.000Z'),
			finishedAt: new Date('2026-02-23T00:00:00.010Z'),
			execResult: makeExecResult({ exitCode: 1, stderr: 'failed run' })
		});

		expect(parsed.status).toBe('failed');
		expect(parsed.errorMessage).toBe('failed run');
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

	it('extracts actionable failure details from stderr when assertions are unavailable', async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hurl-runner-report-'));
		const reportPath = path.join(tempDir, 'report');
		await fs.mkdir(reportPath, { recursive: true });

		await fs.writeFile(
			path.join(reportPath, 'report.json'),
			JSON.stringify([
				{
					filename: '/tmp/cases/upload.hurl',
					success: false,
					entries: [
						{
							name: 'Upload',
							time: 0,
							asserts: []
						}
					]
				}
			]),
			'utf8'
		);

		const parsed = await parseFileResult({
			filePath: '/tmp/cases/upload.hurl',
			reportPath,
			startedAt: new Date('2026-02-23T00:00:00.000Z'),
			finishedAt: new Date('2026-02-23T00:00:00.010Z'),
			execResult: makeExecResult({
				exitCode: 3,
				stderr: [
					'error: File read access',
					'  --> /tmp/cases/upload.hurl:8:11',
					' 8 | key: file,tests.zip; application/octet-stream',
					'   |           ^^^^^^^^^ file tests.zip can not be read'
				].join('\n')
			})
		});

		expect(parsed.status).toBe('failed');
		expect(parsed.errorMessage).toBe('file tests.zip can not be read');
	});

	it('prefers stderr message when report artifact is missing', async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hurl-runner-report-'));
		const reportPath = path.join(tempDir, 'missing-report-dir');

		const parsed = await parseFileResult({
			filePath: '/tmp/cases/delete-post.hurl',
			reportPath,
			startedAt: new Date('2026-02-23T00:00:00.000Z'),
			finishedAt: new Date('2026-02-23T00:00:00.010Z'),
			execResult: makeExecResult({
				exitCode: 3,
				stderr: [
					'error: Parsing response section name',
					'  --> /tmp/cases/delete-post.hurl:7:2',
					' 7 | [Form]',
					'   |  ^ the section is not valid. Valid values are Captures or Asserts'
				].join('\n')
			})
		});

		expect(parsed.status).toBe('failed');
		expect(parsed.errorMessage).toBe('the section is not valid. Valid values are Captures or Asserts');
	});

	it('maps assertion expression/expected/actual from value and assert-failure message shape', async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hurl-runner-report-'));
		const reportPath = path.join(tempDir, 'report');
		await fs.mkdir(reportPath, { recursive: true });

		await fs.writeFile(
			path.join(reportPath, 'report.json'),
			JSON.stringify([
				{
					filename: '/tmp/cases/create-post.hurl',
					success: false,
					entries: [
						{
							name: 'Create post',
							success: false,
							time: 1118,
							asserts: [
								{
									line: 14,
									value: 'status == 202',
									success: false,
									message: 'Assert failure --> /tmp/cases/create-post.hurl:14:0 | POST https://example.com | ... 14 | status == 202 | actual: integer <201> | expected: integer <202> |'
								},
								{
									line: 15,
									value: 'header "content-type" contains "application/json"',
									success: true
								},
								{
									line: 16,
									assertion: {
										value: 'jsonpath "$.id" exists'
									},
									success: true
								}
							]
						}
					]
				}
			]),
			'utf8'
		);

		const parsed = await parseFileResult({
			filePath: '/tmp/cases/create-post.hurl',
			reportPath,
			startedAt: new Date('2026-02-23T00:00:00.000Z'),
			finishedAt: new Date('2026-02-23T00:00:01.118Z'),
			execResult: makeExecResult({ exitCode: 3 })
		});

		expect(parsed.status).toBe('failed');
		expect(parsed.assertions).toHaveLength(3);
		expect(parsed.assertions[0]).toMatchObject({
			expression: 'status == 202',
			status: 'failed',
			line: 14,
			actual: 'integer <201>',
			expected: 'integer <202>'
		});
		expect(parsed.assertions[1]).toMatchObject({
			expression: 'header "content-type" contains "application/json"',
			status: 'passed'
		});
		expect(parsed.assertions[2]).toMatchObject({
			expression: 'jsonpath "$.id" exists',
			status: 'passed'
		});
	});

	it('infers assertion text from source file when report assertion expression is missing', async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hurl-runner-report-'));
		const hurlFilePath = path.join(tempDir, 'source-asserts.hurl');
		const reportPath = path.join(tempDir, 'report');
		await fs.mkdir(reportPath, { recursive: true });

		await fs.writeFile(
			hurlFilePath,
			[
				'POST https://example.com/posts',
				'HTTP 201',
				'',
				'[Asserts]',
				'status == 201',
				'header "content-type" contains "application/json"',
				'jsonpath "$.id" exists'
			].join('\n'),
			'utf8'
		);

		await fs.writeFile(
			path.join(reportPath, 'report.json'),
			JSON.stringify([
				{
					filename: hurlFilePath,
					success: true,
					entries: [
						{
							name: 'Create',
							success: true,
							asserts: [
								{ line: 5, success: true },
								{ line: 6, success: true },
								{ line: 7, success: true }
							]
						}
					]
				}
			]),
			'utf8'
		);

		const parsed = await parseFileResult({
			filePath: hurlFilePath,
			reportPath,
			startedAt: new Date('2026-02-23T00:00:00.000Z'),
			finishedAt: new Date('2026-02-23T00:00:00.010Z'),
			execResult: makeExecResult({ exitCode: 0 })
		});

		expect(parsed.assertions).toHaveLength(3);
		expect(parsed.assertions[0].expression).toBe('status == 201');
		expect(parsed.assertions[1].expression).toBe('header "content-type" contains "application/json"');
		expect(parsed.assertions[2].expression).toBe('jsonpath "$.id" exists');
	});

	it('maps request names from source by line and attaches assertions per request block', async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hurl-runner-report-'));
		const hurlFilePath = path.join(tempDir, 'multi.hurl');
		const reportPath = path.join(tempDir, 'report');
		await fs.mkdir(reportPath, { recursive: true });

		await fs.writeFile(
			hurlFilePath,
			[
				'# @collectionName Demo',
				'',
				'# @name Create post',
				'POST https://example.com/posts',
				'HTTP 201',
				'',
				'[Asserts]',
				'status == 202',
				'',
				'# @name Delete post',
				'DELETE https://example.com/posts/1',
				'HTTP 200',
				'',
				'[Asserts]',
				'status == 200'
			].join('\n'),
			'utf8'
		);

		await fs.writeFile(
			path.join(reportPath, 'report.json'),
			JSON.stringify([
				{
					filename: hurlFilePath,
					success: false,
					entries: [
						{ index: 1, line: 4, time: 12 },
						{ index: 2, line: 11, time: 9 }
					],
					assertions: [
						{ line: 8, success: false, message: 'expected 202, got 201' },
						{ line: 12, success: true },
						{ line: 15, success: true }
					]
				}
			]),
			'utf8'
		);

		const parsed = await parseFileResult({
			filePath: hurlFilePath,
			reportPath,
			startedAt: new Date('2026-02-23T00:00:00.000Z'),
			finishedAt: new Date('2026-02-23T00:00:00.020Z'),
			execResult: makeExecResult({ exitCode: 3 })
		});

		expect(parsed.entries).toHaveLength(2);
		expect(parsed.entries[0].name).toBe('Create post');
		expect(parsed.entries[0].status).toBe('failed');
		expect(parsed.entries[1].name).toBe('Delete post');
		expect(parsed.entries[1].status).toBe('passed');
		expect(parsed.assertions).toHaveLength(3);
	});
});
