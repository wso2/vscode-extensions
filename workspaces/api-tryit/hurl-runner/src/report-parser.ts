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
import * as path from 'path';
import { HurlAssertionResult, HurlEntryResult, HurlFileResult, HurlFileStatus } from './types';
import { ProcessExecResult } from './process-adapter';

interface ParseContext {
	filePath: string;
	reportPath: string;
	startedAt: Date;
	finishedAt: Date;
	execResult: ProcessExecResult;
}

interface GenericReport {
	success?: boolean;
	entries?: unknown[];
	assertions?: unknown[];
	asserts?: unknown[];
	stats?: {
		entries?: number;
		failed?: number;
		passed?: number;
	};
	filename?: string;
}

interface GenericStats {
	entries?: number;
	failed?: number;
	passed?: number;
}

interface SourceRequestMeta {
	index: number;
	name: string;
	method: string;
	url: string;
	startLine: number;
	endLine: number;
}

interface StderrLineFailure {
	line: number;
	message?: string;
}

const REQUEST_LINE_REGEX = /^([A-Z][A-Z0-9_-]*)\s+(.+)$/;

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function normalizeStats(value: unknown): GenericStats | undefined {
	if (!isObject(value)) {
		return undefined;
	}

	const entries = typeof value.entries === 'number' ? value.entries : undefined;
	const failed = typeof value.failed === 'number' ? value.failed : undefined;
	const passed = typeof value.passed === 'number' ? value.passed : undefined;

	if (typeof entries !== 'number' && typeof failed !== 'number' && typeof passed !== 'number') {
		return undefined;
	}

	return { entries, failed, passed };
}

function extractAssertionsFromEntries(entries: unknown[]): unknown[] {
	const assertions: unknown[] = [];

	for (const entry of entries) {
		if (!isObject(entry) || !Array.isArray(entry.asserts)) {
			continue;
		}

		const entryName = typeof entry.name === 'string' ? entry.name : undefined;
		for (const assertValue of entry.asserts) {
			if (!isObject(assertValue)) {
				assertions.push(assertValue);
				continue;
			}

			const normalizedAssert: Record<string, unknown> = { ...assertValue };
			if (entryName && typeof normalizedAssert.entryName !== 'string') {
				normalizedAssert.entryName = entryName;
			}
			assertions.push(normalizedAssert);
		}
	}

	return assertions;
}

function normalizeReportObject(value: Record<string, unknown>): GenericReport {
	const entries = Array.isArray(value.entries) ? value.entries : [];
	const rootAssertions = Array.isArray(value.assertions)
		? value.assertions
		: (Array.isArray(value.asserts) ? value.asserts : []);
	const entryAssertions = extractAssertionsFromEntries(entries);

	return {
		success: typeof value.success === 'boolean' ? value.success : undefined,
		entries,
		assertions: rootAssertions.length > 0 ? rootAssertions : entryAssertions,
		asserts: rootAssertions.length > 0 ? rootAssertions : entryAssertions,
		stats: normalizeStats(value.stats),
		filename: typeof value.filename === 'string' ? value.filename : undefined
	};
}

function normalizeReport(raw: unknown, filePath: string): GenericReport | undefined {
	const targetPath = path.resolve(filePath);

	if (Array.isArray(raw)) {
		const reports = raw.filter(isObject);
		if (reports.length === 0) {
			return undefined;
		}

		const matched = reports.find(report => {
			if (typeof report.filename !== 'string') {
				return false;
			}
			return path.resolve(report.filename) === targetPath;
		});

		if (!matched && reports.length !== 1) {
			return undefined;
		}
		return normalizeReportObject(matched ?? reports[0]);
	}

	if (!isObject(raw)) {
		return undefined;
	}

	if (Array.isArray(raw.files)) {
		const reports = raw.files.filter(isObject);
		if (reports.length === 0) {
			return undefined;
		}

		const matched = reports.find(report => {
			if (typeof report.filename !== 'string') {
				return false;
			}
			return path.resolve(report.filename) === targetPath;
		});

		if (!matched && reports.length !== 1) {
			return undefined;
		}
		return normalizeReportObject(matched ?? reports[0]);
	}

	return normalizeReportObject(raw);
}

async function resolveReportJsonPath(reportPath: string): Promise<string> {
	try {
		const stat = await fs.stat(reportPath);
		if (stat.isDirectory()) {
			return path.join(reportPath, 'report.json');
		}
	} catch {
		// Keep original report path; parseFileResult will surface the resulting file access error.
	}

	return reportPath;
}

function extractHurlErrorMessage(stderr: string | undefined): string | undefined {
	if (!stderr) {
		return undefined;
	}

	const lines = stderr
		.replace(/\r\n/g, '\n')
		.split('\n')
		.map(line => line.trim())
		.filter(line => line.length > 0);

	if (lines.length === 0) {
		return undefined;
	}

	for (const line of lines.reverse()) {
		const markerIndex = line.lastIndexOf('^');
		if (markerIndex < 0) {
			continue;
		}

		const detail = line.slice(markerIndex).replace(/^\^+\s*/, '').trim();
		if (detail.length > 0) {
			return detail;
		}
	}

	const errorLine = lines.find(line => /^error:/i.test(line));
	if (errorLine) {
		const normalized = errorLine.replace(/^error:\s*/i, '').trim();
		return normalized.length > 0 ? normalized : errorLine;
	}

	return lines[0];
}

function parseRequestLine(line: string): { method: string; url: string } | undefined {
	const match = line.match(REQUEST_LINE_REGEX);
	if (!match) {
		return undefined;
	}

	const method = match[1].toUpperCase();
	// Reject HTTP status lines (HTTP 200, HTTP 201, etc.)
	if (method === 'HTTP') {
		return undefined;
	}

	// Only accept valid HTTP request methods
	const validMethods = new Set([
		'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS',
		'CONNECT', 'TRACE', 'PROPFIND', 'PROPPATCH', 'MKCOL', 'COPY', 'MOVE', 'LOCK', 'UNLOCK'
	]);
	if (!validMethods.has(method)) {
		return undefined;
	}

	return {
		method,
		url: match[2].trim()
	};
}

function parseSourceRequests(lines: string[]): SourceRequestMeta[] {
	const requestLines: Array<{ lineIndex: number; line: number; method: string; url: string }> = [];

	for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
		const parsed = parseRequestLine(lines[lineIndex].trim());
		if (!parsed) {
			continue;
		}

		requestLines.push({
			lineIndex,
			line: lineIndex + 1,
			method: parsed.method,
			url: parsed.url
		});
	}

	if (requestLines.length === 0) {
		return [];
	}

	const requests: SourceRequestMeta[] = [];

	for (let index = 0; index < requestLines.length; index++) {
		const requestLine = requestLines[index];
		const previousRequestLineIndex = index > 0 ? requestLines[index - 1].lineIndex : -1;
		let name: string | undefined;

		for (let backIndex = requestLine.lineIndex - 1; backIndex > previousRequestLineIndex; backIndex--) {
			const trimmed = lines[backIndex].trim();
			if (!trimmed) {
				continue;
			}

			const nameMatch = trimmed.match(/^#\s*@name\s+(.+)$/i);
			if (nameMatch?.[1]?.trim()) {
				name = nameMatch[1].trim();
				break;
			}

			if (!trimmed.startsWith('#')) {
				break;
			}
		}

		requests.push({
			index: index + 1,
			name: name || `Request ${index + 1}`,
			method: requestLine.method,
			url: requestLine.url,
			startLine: requestLine.line,
			endLine: index < requestLines.length - 1 ? requestLines[index + 1].line - 1 : lines.length
		});
	}

	return requests;
}

function findSourceRequestByLine(sourceRequests: SourceRequestMeta[], lineNumber: number): SourceRequestMeta | undefined {
	if (!Number.isInteger(lineNumber)) {
		return undefined;
	}

	return sourceRequests.find(request => lineNumber >= request.startLine && lineNumber <= request.endLine);
}

function dedupeAssertions(assertions: HurlAssertionResult[]): HurlAssertionResult[] {
	const seen = new Set<string>();
	const deduped: HurlAssertionResult[] = [];

	for (const assertion of assertions) {
		const key = [
			assertion.expression,
			assertion.status,
			assertion.entryName || '',
			assertion.expected || '',
			assertion.actual || '',
			assertion.message || '',
			typeof assertion.line === 'number' ? String(assertion.line) : ''
		].join('\u001F');

		if (seen.has(key)) {
			continue;
		}

		seen.add(key);
		deduped.push(assertion);
	}

	return deduped;
}

function parseStderrLineFailures(stderr: string | undefined): StderrLineFailure[] {
	if (!stderr) {
		return [];
	}

	const lines = stderr.replace(/\r\n/g, '\n').split('\n');
	const failures: StderrLineFailure[] = [];

	for (let index = 0; index < lines.length; index++) {
		const sourceMatch = lines[index].match(/-->\s+.*:(\d+):\d+\s*$/);
		if (!sourceMatch) {
			continue;
		}

		const line = Number.parseInt(sourceMatch[1], 10);
		if (!Number.isFinite(line) || line <= 0) {
			continue;
		}

		let message: string | undefined;
		for (let inner = index + 1; inner < lines.length; inner++) {
			const current = lines[inner];
			if (/-->\s+/.test(current)) {
				break;
			}
			const markerIndex = current.lastIndexOf('^');
			if (markerIndex < 0) {
				continue;
			}
			const detail = current.slice(markerIndex).replace(/^\^+\s*/, '').trim();
			if (detail.length > 0) {
				message = detail;
				break;
			}
		}

		if (!message) {
			for (let back = index - 1; back >= 0; back--) {
				const trimmed = lines[back].trim();
				if (!trimmed) {
					break;
				}
				if (!/^error:/i.test(trimmed)) {
					continue;
				}
				const normalized = trimmed.replace(/^error:\s*/i, '').trim();
				message = normalized.length > 0 ? normalized : trimmed;
				break;
			}
		}

		failures.push({ line, message });
	}

	return failures;
}

function resolveFailureForRequest(
	sourceRequest: SourceRequestMeta | undefined,
	entryLine: number | undefined,
	stderrLineFailures: StderrLineFailure[]
): StderrLineFailure | undefined {
	if (typeof entryLine === 'number') {
		const byLine = stderrLineFailures.find(failure => failure.line === entryLine);
		if (byLine) {
			return byLine;
		}
	}

	if (!sourceRequest) {
		return undefined;
	}

	return stderrLineFailures.find(
		failure => failure.line >= sourceRequest.startLine && failure.line <= sourceRequest.endLine
	);
}

function toDisplayText(value: unknown): string | undefined {
	if (typeof value === 'string') {
		const normalized = value.trim();
		return normalized.length > 0 ? normalized : undefined;
	}

	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}

	if (value === null) {
		return 'null';
	}

	if (Array.isArray(value) || isObject(value)) {
		try {
			return JSON.stringify(value);
		} catch {
			return String(value);
		}
	}

	return undefined;
}

function pickFirstDisplayText(...values: unknown[]): string | undefined {
	for (const value of values) {
		const normalized = toDisplayText(value);
		if (normalized) {
			return normalized;
		}
	}
	return undefined;
}

function parseAssertFailureMessage(
	message: string | undefined
): { expression?: string; actual?: string; expected?: string } {
	if (!message) {
		return {};
	}

	const normalized = message.replace(/\r\n/g, '\n');

	const barExpression = normalized.match(/\|\s*([^|]+?)\s*\|\s*actual\s*:/i)?.[1]?.trim();
	const actual = normalized.match(/actual:\s*([^|\n]+)\s*(?:\||$)/i)?.[1]?.trim();
	const expected = normalized.match(/expected:\s*([^|\n]+)\s*(?:\||$)/i)?.[1]?.trim();

	return {
		expression: barExpression && barExpression.length > 0 ? barExpression : undefined,
		actual: actual && actual.length > 0 ? actual : undefined,
		expected: expected && expected.length > 0 ? expected : undefined
	};
}

function toEntry(
	entry: unknown,
	index: number,
	sourceRequest: SourceRequestMeta | undefined,
	stderrLineFailure: StderrLineFailure | undefined
): HurlEntryResult {
	const obj = (entry && typeof entry === 'object') ? entry as Record<string, unknown> : {};
	const requestObj = obj.request && typeof obj.request === 'object' ? obj.request as Record<string, unknown> : {};
	const responseObj = obj.response && typeof obj.response === 'object' ? obj.response as Record<string, unknown> : {};
	const success = obj.success;
	const error = obj.error;
	const line = typeof obj.line === 'number' ? obj.line : sourceRequest?.startLine;

	let status: HurlEntryResult['status'] = 'passed';
	if (success === false) {
		status = 'failed';
	}
	if (typeof error === 'string' && error.length > 0) {
		status = 'error';
	}
	if (status === 'passed' && Array.isArray(obj.asserts)) {
		const hasFailedAssert = obj.asserts.some(assertValue => isObject(assertValue) && assertValue.success === false);
		if (hasFailedAssert) {
			status = 'failed';
		}
	}
	if (stderrLineFailure) {
		status = 'error';
	}

	const name = typeof obj.name === 'string' && obj.name.trim().length > 0
		? obj.name
		: sourceRequest?.name || `Request ${index + 1}`;

	const statusValue = responseObj.status ?? obj.statusCode;
	const statusCode = typeof statusValue === 'number' ? statusValue : undefined;
	const errorMessage = typeof error === 'string' && error.length > 0
		? error
		: stderrLineFailure?.message;

	return {
		name,
		method: typeof requestObj.method === 'string' ? requestObj.method : sourceRequest?.method,
		url: typeof requestObj.url === 'string' ? requestObj.url : sourceRequest?.url,
		statusCode,
		status,
		durationMs: typeof obj.time === 'number' ? obj.time : undefined,
		line,
		errorMessage
	};
}

function toAssertion(
	assertion: unknown,
	filePath: string,
	sourceRequests: SourceRequestMeta[]
): HurlAssertionResult {
	const obj = (assertion && typeof assertion === 'object') ? assertion as Record<string, unknown> : {};
	const success = typeof obj.success === 'boolean'
		? obj.success
		: (typeof obj.passed === 'boolean' ? obj.passed : undefined);
	const assertionObj = isObject(obj.assertion) ? obj.assertion as Record<string, unknown> : undefined;
	const resultObj = isObject(obj.result) ? obj.result as Record<string, unknown> : undefined;
	const message = pickFirstDisplayText(obj.message, obj.error, resultObj?.message);
	const parsedFromMessage = parseAssertFailureMessage(message);
	const line = typeof obj.line === 'number' ? obj.line : undefined;
	const sourceRequest = typeof line === 'number'
		? findSourceRequestByLine(sourceRequests, line)
		: undefined;

	return {
		filePath,
		entryName: pickFirstDisplayText(obj.entryName, obj.entry, assertionObj?.entryName, sourceRequest?.name),
		expression: pickFirstDisplayText(
			obj.expression,
			obj.value,
			typeof obj.assertion === 'string' ? obj.assertion : undefined,
			assertionObj?.expression,
			assertionObj?.value,
			assertionObj?.raw,
			parsedFromMessage.expression
		) || 'unknown assertion',
		status: success === false ? 'failed' : 'passed',
		expected: pickFirstDisplayText(
			obj.expected,
			assertionObj?.expected,
			resultObj?.expected,
			parsedFromMessage.expected
		),
		actual: pickFirstDisplayText(
			obj.actual,
			assertionObj?.actual,
			resultObj?.actual,
			parsedFromMessage.actual
		),
		message,
		line
	};
}

function inferExpressionFromSourceLine(lines: string[], lineNumber: number): string | undefined {
	if (!Number.isInteger(lineNumber) || lineNumber <= 0 || lineNumber > lines.length) {
		return undefined;
	}

	const rawLine = lines[lineNumber - 1];
	if (!rawLine) {
		return undefined;
	}

	const expression = rawLine.trim();
	if (!expression || expression.startsWith('#') || expression.startsWith('[')) {
		return undefined;
	}

	return expression;
}

function deriveFileStatus(execResult: ProcessExecResult, report?: GenericReport, entries?: HurlEntryResult[], assertions?: HurlAssertionResult[]): HurlFileStatus {
	if (execResult.cancelled) {
		return 'error';
	}
	if (execResult.timedOut || execResult.error) {
		return 'error';
	}

	const failedEntries = (entries || []).some(entry => entry.status !== 'passed');
	const failedAssertions = (assertions || []).some(assertion => assertion.status === 'failed');

	if (typeof report?.success === 'boolean') {
		return report.success ? 'passed' : 'failed';
	}
	if (typeof report?.stats?.failed === 'number') {
		return report.stats.failed > 0 ? 'failed' : 'passed';
	}
	if (failedEntries || failedAssertions) {
		return 'failed';
	}
	if (execResult.exitCode !== 0) {
		return 'failed';
	}
	return 'passed';
}

export async function parseFileResult(context: ParseContext): Promise<HurlFileResult> {
	const durationMs = context.finishedAt.getTime() - context.startedAt.getTime();
	let report: GenericReport | undefined;
	let parseError: string | undefined;

	try {
		const reportJsonPath = await resolveReportJsonPath(context.reportPath);
		const reportText = await fs.readFile(reportJsonPath, 'utf8');
		report = normalizeReport(JSON.parse(reportText), context.filePath);
		if (!report) {
			parseError = 'Unsupported hurl report format';
		}
	} catch (error) {
		parseError = error instanceof Error ? error.message : 'Failed to parse report';
	}

	let sourceLines: string[] | undefined;
	try {
		const text = await fs.readFile(context.filePath, 'utf8');
		sourceLines = text.replace(/\r\n/g, '\n').split('\n');
	} catch {
		sourceLines = undefined;
	}

	const sourceRequests = sourceLines ? parseSourceRequests(sourceLines) : [];
	const stderrLineFailures = parseStderrLineFailures(context.execResult.stderr);

	const entrySourceRequests: Array<SourceRequestMeta | undefined> = [];
	const entries: HurlEntryResult[] = Array.isArray(report?.entries)
		? report.entries.map((entry, index) => {
			const entryObject = isObject(entry) ? entry : {};
			const entryLine = typeof entryObject.line === 'number' ? entryObject.line : undefined;
			const sourceRequest = (typeof entryLine === 'number'
				? findSourceRequestByLine(sourceRequests, entryLine)
				: undefined)
				|| sourceRequests[index];
			const lineFailure = resolveFailureForRequest(sourceRequest, entryLine, stderrLineFailures);
			entrySourceRequests.push(sourceRequest);
			return toEntry(entry, index, sourceRequest, lineFailure);
		})
		: [];

	if (entries.length === 0 && sourceRequests.length > 0) {
		const execFailed = context.execResult.cancelled || context.execResult.timedOut || !!context.execResult.error;
		const execErrorMessage = context.execResult.cancelled ? 'Execution cancelled'
			: context.execResult.timedOut ? 'Execution timed out'
			: context.execResult.error;
		for (const sourceRequest of sourceRequests) {
			const lineFailure = resolveFailureForRequest(sourceRequest, sourceRequest.startLine, stderrLineFailures);
			const entry = toEntry({}, entries.length, sourceRequest, lineFailure);
			if (execFailed && entry.status === 'passed') {
				entries.push({ ...entry, status: 'error', errorMessage: execErrorMessage });
			} else {
				entries.push(entry);
			}
			entrySourceRequests.push(sourceRequest);
		}
	}

	const rawAssertions = Array.isArray(report?.assertions)
		? report.assertions
		: (Array.isArray(report?.asserts) ? report.asserts : []);

	const assertions = rawAssertions.map(assertion => toAssertion(assertion, context.filePath, sourceRequests));

	for (const assertion of assertions) {
		if (assertion.expression !== 'unknown assertion' || typeof assertion.line !== 'number' || !sourceLines) {
			continue;
		}

		const inferred = inferExpressionFromSourceLine(sourceLines, assertion.line);
		if (inferred) {
			assertion.expression = inferred;
		}
	}

	for (let index = 0; index < entries.length; index++) {
		const entry = entries[index];
		const sourceRequest = entrySourceRequests[index];
		const matchedAssertions = dedupeAssertions(assertions.filter(assertion => {
			if (assertion.entryName && assertion.entryName === entry.name) {
				return true;
			}

			if (typeof assertion.line === 'number' && sourceRequest) {
				return assertion.line >= sourceRequest.startLine && assertion.line <= sourceRequest.endLine;
			}

			return false;
		}));

		entry.assertions = matchedAssertions;
		if (entry.status === 'passed' && matchedAssertions.some(assertion => assertion.status === 'failed')) {
			entry.status = 'failed';
		}
	}

	const status = deriveFileStatus(context.execResult, report, entries, assertions);
	const stderrMessage = extractHurlErrorMessage(context.execResult.stderr);

	let errorMessage: string | undefined;
	if (context.execResult.timedOut) {
		errorMessage = 'Execution timed out';
	} else if (context.execResult.error) {
		errorMessage = context.execResult.error;
	} else if (context.execResult.cancelled) {
		errorMessage = 'Execution cancelled';
	} else if (status !== 'passed' && assertions.length === 0 && stderrMessage) {
		errorMessage = stderrMessage;
	} else if (parseError && context.execResult.exitCode !== 0) {
		errorMessage = parseError;
	}

	return {
		filePath: context.filePath,
		status,
		startedAt: context.startedAt.toISOString(),
		finishedAt: context.finishedAt.toISOString(),
		durationMs,
		entries,
		assertions,
		errorMessage,
		stdout: context.execResult.stdout,
		stderr: context.execResult.stderr
	};
}
