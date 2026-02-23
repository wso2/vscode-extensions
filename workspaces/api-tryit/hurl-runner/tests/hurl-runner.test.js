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
const hurl_runner_1 = require("../src/hurl-runner");
class MockProcessAdapter {
    constructor(scenarios, versionResult = {
        exitCode: 0,
        stdout: 'hurl 5.0.0',
        stderr: '',
        timedOut: false,
        cancelled: false
    }) {
        this.scenarios = scenarios;
        this.versionResult = versionResult;
        this.calls = [];
    }
    async exec(command, args, options = {}) {
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
    async executeScenario(scenario, reportPath, signal) {
        if (signal?.aborted) {
            return this.cancelledResult();
        }
        if (scenario.delayMs && scenario.delayMs > 0) {
            await new Promise(resolve => {
                const timer = setTimeout(() => {
                    cleanup();
                    resolve();
                }, scenario.delayMs);
                const onAbort = () => {
                    cleanup();
                    resolve();
                };
                const cleanup = () => {
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
    cancelledResult() {
        return {
            exitCode: null,
            stdout: '',
            stderr: '',
            timedOut: false,
            cancelled: true
        };
    }
}
function buildPassReport(name) {
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
function buildFailReport(name) {
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
async function createCollection(fileNames) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'hurl-runner-cases-'));
    const files = [];
    for (const fileName of fileNames) {
        const fullPath = path.join(root, fileName);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, 'GET https://example.com\nHTTP 200\n', 'utf8');
        files.push(path.resolve(fullPath));
    }
    return { root, files };
}
describe('HurlRunnerImpl', () => {
    const createdDirs = [];
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
    function createRunner(adapter) {
        return new hurl_runner_1.HurlRunnerImpl({
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
    it('run returns aggregated summary and command diagnostics', async () => {
        const collection = await createCollection(['a.hurl', 'b.hurl']);
        createdDirs.push(collection.root);
        const scenarios = new Map([
            [collection.files[0], { report: buildPassReport('a') }],
            [collection.files[1], { report: buildFailReport('b'), exitCode: 1 }]
        ]);
        const adapter = new MockProcessAdapter(scenarios);
        const runner = createRunner(adapter);
        const result = await runner.run({ collectionPath: collection.root }, {
            parallelism: 1,
            insecure: true,
            followRedirects: true,
            variables: { token: 'abc' }
        });
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
        expect(result.diagnostics.commandLine).toEqual(expect.arrayContaining(['hurl', '-k', '-L', '--variable', 'token=abc']));
    });
    it('runStream emits progress events in expected order', async () => {
        const collection = await createCollection(['one.hurl', 'two.hurl']);
        createdDirs.push(collection.root);
        const scenarios = new Map([
            [collection.files[0], { report: buildPassReport('one') }],
            [collection.files[1], { report: buildPassReport('two') }]
        ]);
        const adapter = new MockProcessAdapter(scenarios);
        const runner = createRunner(adapter);
        const events = [];
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
        const scenarios = new Map([
            [collection.files[0], { report: buildFailReport('one'), exitCode: 1 }],
            [collection.files[1], { report: buildPassReport('two') }],
            [collection.files[2], { report: buildPassReport('three') }]
        ]);
        const adapter = new MockProcessAdapter(scenarios);
        const runner = createRunner(adapter);
        const events = [];
        const result = await runner.runStream({ collectionPath: collection.root }, { parallelism: 1, failFast: true }, event => events.push(event));
        expect(result.status).toBe('failed');
        expect(result.files.map(file => file.status)).toEqual(['failed', 'skipped', 'skipped']);
        expect(result.summary.skippedFiles).toBe(2);
        expect(events.filter(event => event.type === 'fileStarted')).toHaveLength(1);
    });
    it('supports cancellation via AbortSignal and emits runCancelled', async () => {
        const collection = await createCollection(['cancelled.hurl', 'next.hurl']);
        createdDirs.push(collection.root);
        const scenarios = new Map([
            [collection.files[0], { report: buildPassReport('cancelled'), delayMs: 100 }],
            [collection.files[1], { report: buildPassReport('next') }]
        ]);
        const adapter = new MockProcessAdapter(scenarios);
        const runner = createRunner(adapter);
        const controller = new AbortController();
        const events = [];
        const result = await runner.runStream({ collectionPath: collection.root }, { parallelism: 1, signal: controller.signal }, event => {
            events.push(event);
            if (event.type === 'fileStarted') {
                controller.abort();
            }
        });
        expect(result.status).toBe('cancelled');
        expect(result.files[0].status).toBe('error');
        expect(result.files[0].errorMessage).toBe('Execution cancelled');
        expect(result.files[1].status).toBe('skipped');
        expect(events.map(event => event.type)).toContain('runCancelled');
    });
    it('supports rerun failed from previous run id', async () => {
        const collection = await createCollection(['pass.hurl', 'fail.hurl', 'pass-2.hurl']);
        createdDirs.push(collection.root);
        const scenarios = new Map([
            [collection.files[0], { report: buildPassReport('pass') }],
            [collection.files[1], { report: buildFailReport('fail'), exitCode: 1 }],
            [collection.files[2], { report: buildPassReport('pass-2') }]
        ]);
        const adapter = new MockProcessAdapter(scenarios);
        const runner = createRunner(adapter);
        const firstRun = await runner.run({ collectionPath: collection.root }, { parallelism: 1 });
        expect(firstRun.status).toBe('failed');
        const callsBeforeRerun = adapter.calls.length;
        const rerun = await runner.run({ collectionPath: collection.root }, { parallelism: 1, onlyFailedFromRunId: firstRun.runId });
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
//# sourceMappingURL=hurl-runner.test.js.map