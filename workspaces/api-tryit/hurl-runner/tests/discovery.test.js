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
const discovery_1 = require("../src/discovery");
async function writeHurlFile(filePath) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, 'GET https://example.com\nHTTP 200\n', 'utf8');
}
describe('discoverHurlFiles', () => {
    let tempDir = '';
    afterEach(async () => {
        if (tempDir) {
            await fs.rm(tempDir, { recursive: true, force: true });
            tempDir = '';
        }
    });
    it('discovers nested .hurl files in deterministic order', async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hurl-runner-discovery-'));
        await writeHurlFile(path.join(tempDir, 'z-last.hurl'));
        await writeHurlFile(path.join(tempDir, 'a-first.hurl'));
        await writeHurlFile(path.join(tempDir, 'nested', 'b-middle.hurl'));
        await fs.writeFile(path.join(tempDir, 'ignore.txt'), 'x', 'utf8');
        const discovered = await (0, discovery_1.discoverHurlFiles)({ collectionPath: tempDir });
        const relative = discovered.files.map(file => path.relative(discovered.rootPath, file).replace(/\\/g, '/'));
        expect(discovered.totalFiles).toBe(3);
        expect(relative).toEqual(['a-first.hurl', 'nested/b-middle.hurl', 'z-last.hurl']);
    });
    it('applies include and exclude filters', async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hurl-runner-discovery-'));
        await writeHurlFile(path.join(tempDir, 'users', 'list.hurl'));
        await writeHurlFile(path.join(tempDir, 'users', 'create.hurl'));
        await writeHurlFile(path.join(tempDir, 'admin', 'delete.hurl'));
        const discovered = await (0, discovery_1.discoverHurlFiles)({
            collectionPath: tempDir,
            includePatterns: ['users/**'],
            excludePatterns: ['**/create.hurl']
        });
        const relative = discovered.files.map(file => path.relative(discovered.rootPath, file).replace(/\\/g, '/'));
        expect(relative).toEqual(['users/list.hurl']);
    });
    it('supports a single .hurl file as input', async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hurl-runner-discovery-'));
        const filePath = path.join(tempDir, 'single.hurl');
        await writeHurlFile(filePath);
        const discovered = await (0, discovery_1.discoverHurlFiles)({ collectionPath: filePath });
        expect(discovered.rootPath).toBe(path.dirname(filePath));
        expect(discovered.files).toEqual([path.resolve(filePath)]);
        expect(discovered.totalFiles).toBe(1);
    });
});
//# sourceMappingURL=discovery.test.js.map