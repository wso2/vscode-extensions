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

		return normalizeReportObject(matched || reports[0]);
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

		return normalizeReportObject(matched || reports[0]);
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

function toEntry(entry: unknown, index: number): HurlEntryResult {
	const obj = (entry && typeof entry === 'object') ? entry as Record<string, unknown> : {};
	const requestObj = obj.request && typeof obj.request === 'object' ? obj.request as Record<string, unknown> : {};
	const responseObj = obj.response && typeof obj.response === 'object' ? obj.response as Record<string, unknown> : {};
	const success = obj.success;
	const error = obj.error;

	let status: HurlEntryResult['status'] = 'passed';
	if (success === false) {
		status = 'failed';
	}
	if (typeof error === 'string' && error.length > 0) {
		status = 'error';
	}

	const name = typeof obj.name === 'string' && obj.name.trim().length > 0
		? obj.name
		: `Entry ${index + 1}`;

	const statusValue = responseObj.status ?? obj.statusCode;
	const statusCode = typeof statusValue === 'number' ? statusValue : undefined;

	return {
		name,
		method: typeof requestObj.method === 'string' ? requestObj.method : undefined,
		url: typeof requestObj.url === 'string' ? requestObj.url : undefined,
		statusCode,
		status,
		durationMs: typeof obj.time === 'number' ? obj.time : undefined
	};
}

function toAssertion(assertion: unknown, filePath: string): HurlAssertionResult {
	const obj = (assertion && typeof assertion === 'object') ? assertion as Record<string, unknown> : {};
	const success = obj.success;
	return {
		filePath,
		entryName: typeof obj.entryName === 'string' ? obj.entryName : undefined,
		expression: typeof obj.expression === 'string' ? obj.expression : (typeof obj.assertion === 'string' ? obj.assertion : 'unknown assertion'),
		status: success === false ? 'failed' : 'passed',
		expected: typeof obj.expected === 'string' ? obj.expected : undefined,
		actual: typeof obj.actual === 'string' ? obj.actual : undefined,
		message: typeof obj.message === 'string' ? obj.message : undefined,
		line: typeof obj.line === 'number' ? obj.line : undefined
	};
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

	const entries = Array.isArray(report?.entries)
		? report?.entries.map((entry, index) => toEntry(entry, index))
		: [];

	const rawAssertions = Array.isArray(report?.assertions)
		? report.assertions
		: (Array.isArray(report?.asserts) ? report.asserts : []);

	const assertions = rawAssertions.map(assertion => toAssertion(assertion, context.filePath));

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
