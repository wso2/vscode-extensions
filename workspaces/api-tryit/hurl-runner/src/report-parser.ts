import * as fs from 'fs/promises';
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
		const reportText = await fs.readFile(context.reportPath, 'utf8');
		report = JSON.parse(reportText) as GenericReport;
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

	let errorMessage: string | undefined;
	if (context.execResult.timedOut) {
		errorMessage = 'Execution timed out';
	} else if (context.execResult.error) {
		errorMessage = context.execResult.error;
	} else if (context.execResult.cancelled) {
		errorMessage = 'Execution cancelled';
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
