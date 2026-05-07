/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as fs from 'fs';
import * as https from 'https';
import * as os from 'os';
import * as path from 'path';

const CDN_BASE_URL = 'https://mi-connectors.wso2.com/onnxruntime-web';

// Only the plain CPU/WASM variant is loaded in the Node-side extension host.
// jsep/jspi/asyncify variants on the CDN are unused here.
const REQUIRED_WASM_FILES = [
    'ort-wasm-simd-threaded.mjs',
    'ort-wasm-simd-threaded.wasm',
];

const MAX_REDIRECTS = 5;
const DOWNLOAD_IDLE_TIMEOUT_MS = 30_000;

export function getOnnxRuntimeDir(): string {
    const override = process.env.MI_COPILOT_ONNX_RUNTIME_DIR?.trim();
    if (override) {
        return path.resolve(override);
    }
    return path.join(os.homedir(), '.wso2-mi', 'copilot', 'onnx-runtime');
}

export function isOnnxRuntimeReady(runtimeDir: string = getOnnxRuntimeDir()): boolean {
    return REQUIRED_WASM_FILES.every(name => fs.existsSync(path.join(runtimeDir, name)));
}

export async function ensureOnnxRuntimeReady(): Promise<string> {
    const runtimeDir = getOnnxRuntimeDir();
    fs.mkdirSync(runtimeDir, { recursive: true });

    for (const name of REQUIRED_WASM_FILES) {
        const destPath = path.join(runtimeDir, name);
        if (fs.existsSync(destPath)) {
            continue;
        }
        const url = `${CDN_BASE_URL}/${name}`;
        console.log(`[WasmRuntimeManager] Downloading: ${url}`);
        await downloadFile(url, destPath);
        console.log(`[WasmRuntimeManager] Saved: ${destPath}`);
    }

    return runtimeDir;
}

function downloadFile(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const partPath = destPath + '.part';
        let settled = false;
        let fileStream: fs.WriteStream | undefined;

        const cleanup = (err: Error) => {
            if (settled) {
                return;
            }
            settled = true;
            fileStream?.destroy();
            try { fs.unlinkSync(partPath); } catch { /* ignore */ }
            reject(err);
        };

        const request = (reqUrl: string, redirects = 0) => {
            const req = https.get(reqUrl, { headers: { 'User-Agent': 'wso2-mi-vscode-extension' } }, (res) => {
                if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    if (redirects >= MAX_REDIRECTS) {
                        cleanup(new Error(`Too many redirects downloading ${url}`));
                        return;
                    }
                    res.resume();
                    request(new URL(res.headers.location, reqUrl).toString(), redirects + 1);
                    return;
                }

                if (res.statusCode !== 200) {
                    cleanup(new Error(`HTTP ${res.statusCode} downloading ${url}`));
                    return;
                }

                const stream = fs.createWriteStream(partPath);
                fileStream = stream;
                res.pipe(stream);

                stream.on('finish', () => {
                    stream.close(() => {
                        try {
                            fs.renameSync(partPath, destPath);
                            settled = true;
                            resolve();
                        } catch (renameErr) {
                            cleanup(renameErr as Error);
                        }
                    });
                });

                res.on('error', cleanup);
                stream.on('error', cleanup);
            });

            req.setTimeout(DOWNLOAD_IDLE_TIMEOUT_MS, () => {
                req.destroy(new Error(`Download stalled after ${DOWNLOAD_IDLE_TIMEOUT_MS}ms: ${reqUrl}`));
            });
            req.on('error', cleanup);
        };

        request(url);
    });
}
