"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs/promises"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const report_parser_1 = require("../src/report-parser");
function makeExecResult(overrides = {}) {
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
        await fs.writeFile(path.join(reportPath, 'report.json'), JSON.stringify([
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
        ]), 'utf8');
        const startedAt = new Date('2026-02-23T00:00:00.000Z');
        const finishedAt = new Date('2026-02-23T00:00:00.030Z');
        const parsed = await (0, report_parser_1.parseFileResult)({
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
    it('surfaces parse errors when the report is invalid and process failed', async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hurl-runner-report-'));
        const reportPath = path.join(tempDir, 'invalid');
        await fs.mkdir(reportPath, { recursive: true });
        await fs.writeFile(path.join(reportPath, 'report.json'), 'not-json', 'utf8');
        const parsed = await (0, report_parser_1.parseFileResult)({
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
        const parsed = await (0, report_parser_1.parseFileResult)({
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
        await fs.writeFile(path.join(reportPath, 'report.json'), JSON.stringify([
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
        ]), 'utf8');
        const parsed = await (0, report_parser_1.parseFileResult)({
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
        const parsed = await (0, report_parser_1.parseFileResult)({
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
});
//# sourceMappingURL=report-parser.test.js.map
