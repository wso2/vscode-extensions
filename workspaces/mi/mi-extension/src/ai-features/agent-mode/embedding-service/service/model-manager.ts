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
import { createHash } from 'crypto';

// ─── Constants ────────────────────────────────────────────────────────────────

const MODEL_ORG = 'isuruwijesiri';
const MODEL_NAME = 'all-MiniLM-L6-v2-code-search-512';
const MODEL_ID = `${MODEL_ORG}/${MODEL_NAME}`;
const MODEL_REVISION = '13b266a617039c16d924b49a56ae978dbd8727ff';

type ModelFileMetadata = {
    relativePath: string;
    sizeBytes: number;
    sha256: string;
};

// SHA-256 values for the files resolved from MODEL_REVISION.
const REQUIRED_MODEL_FILES: ModelFileMetadata[] = [
    {
        relativePath: 'config.json',
        sizeBytes: 611,
        sha256: '7f0faf76d12c68326d6296638406f9c4507fa327e52ed6fdc3678c0761a6f760',
    },
    {
        relativePath: 'tokenizer_config.json',
        sizeBytes: 1464,
        sha256: 'ccb4eb21a03e1442ee5c3f85431b9c307960a04579942537d74778dc8080a48c',
    },
    {
        relativePath: 'tokenizer.json',
        sizeBytes: 711649,
        sha256: '91f1def9b9391fdabe028cd3f3fcc4efd34e5d1f08c3bf2de513ebb5911a1854',
    },
    {
        relativePath: 'vocab.txt',
        sizeBytes: 231508,
        sha256: '07eced375cec144d27c900241f3e339478dec958f92fddbc551f295c992038a3',
    },
    {
        relativePath: 'onnx/model_quantized.onnx',
        sizeBytes: 22862151,
        sha256: 'a62789a43f6b95f497d214f7001d2311156215620e1e6ff96e90f303dca4404d',
    },
];

const HF_BASE_URL = `https://huggingface.co/${MODEL_ID}/resolve/${MODEL_REVISION}`;
const MAX_REDIRECTS = 5;
// Idle timeout only: this waits for network inactivity, not total download time.
// It only fires when no data has streamed for 30s continuously.
// If it triggers, the user can retry, or cancel to disable semantic search
// until the model is downloaded successfully.
const DOWNLOAD_IDLE_TIMEOUT_MS = 30_000;

// ─── Path Helpers ─────────────────────────────────────────────────────────────

/**
 * Returns the root directory for all WSO2 MI models.
 * Uses MI_COPILOT_MODELS_DIR env var when set (override for testing/CI).
 */
export function getWso2MiModelsDir(): string {
    const override = process.env.MI_COPILOT_MODELS_DIR?.trim();
    if (override) {
        return path.resolve(override);
    }
    return path.join(os.homedir(), '.wso2-mi', 'copilot', 'models');
}

/**
 * Returns the directory where the embedding model is stored on disk.
 */
export function getLocalModelDir(modelRootPath?: string): string {
    const root = modelRootPath || getWso2MiModelsDir();
    return path.join(root, MODEL_ORG, MODEL_NAME);
}

// ─── State Check ──────────────────────────────────────────────────────────────

/**
 * Returns true if all required model files are present and match the pinned hashes.
 */
export function isModelDownloaded(modelRootPath?: string): boolean {
    const modelDir = getLocalModelDir(modelRootPath);
    return REQUIRED_MODEL_FILES.every(file =>
        isValidModelFile(path.join(modelDir, file.relativePath), file)
    );
}

// ─── Download ─────────────────────────────────────────────────────────────────

export type ModelDownloadProgressCallback = (fileName: string, percent: number) => void;

/**
 * Downloads the embedding model files from HuggingFace into the local model directory.
 * Files are written to .part temporaries, hash-verified, and renamed on success.
 *
 * @param onProgress - Optional callback called with (fileName, percent 0-100)
 * @param modelRootPath - Optional override for the model root directory
 */
export async function downloadModel(onProgress?: ModelDownloadProgressCallback, modelRootPath?: string): Promise<void> {
    const modelDir = getLocalModelDir(modelRootPath);

    // Ensure all required directories exist
    fs.mkdirSync(path.join(modelDir, 'onnx'), { recursive: true });

    for (const file of REQUIRED_MODEL_FILES) {
        const relativePath = file.relativePath;
        const destPath = path.join(modelDir, relativePath);

        // Skip only files that already match the pinned size and hash.
        if (isValidModelFile(destPath, file)) {
            onProgress?.(relativePath, 100);
            continue;
        }

        if (fs.existsSync(destPath)) {
            console.warn(`[ModelManager] Removing invalid model file before redownload: ${destPath}`);
            fs.unlinkSync(destPath);
        }

        const url = `${HF_BASE_URL}/${relativePath}`;
        console.log(`[ModelManager] Downloading: ${url}`);

        await downloadFile(url, destPath, file, (percent) => {
            onProgress?.(relativePath, percent);
        });

        console.log(`[ModelManager] Saved: ${destPath}`);
    }
}

function downloadFile(
    url: string,
    destPath: string,
    metadata: ModelFileMetadata,
    onProgress?: (percent: number) => void
): Promise<void> {
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
                // Follow redirects (HuggingFace issues both relative and absolute redirects)
                if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    if (redirects >= MAX_REDIRECTS) {
                        cleanup(new Error(`Too many redirects downloading ${url}`));
                        return;
                    }
                    res.resume(); // Consume response to free socket
                    const nextUrl = new URL(res.headers.location, reqUrl).toString();
                    request(nextUrl, redirects + 1);
                    return;
                }

                if (res.statusCode !== 200) {
                    cleanup(new Error(`HTTP ${res.statusCode} downloading ${url}`));
                    return;
                }

                const totalBytes = parseInt(res.headers['content-length'] ?? '0', 10);
                let downloadedBytes = 0;
                let lastReportedPercent = -1;
                const activeFileStream = fs.createWriteStream(partPath);
                fileStream = activeFileStream;

                res.on('data', (chunk: Buffer) => {
                    downloadedBytes += chunk.length;
                    if (totalBytes > 0) {
                        const percent = Math.floor((downloadedBytes / totalBytes) * 100);
                        if (percent !== lastReportedPercent) {
                            lastReportedPercent = percent;
                            onProgress?.(percent);
                        }
                    }
                });

                res.pipe(activeFileStream);

                activeFileStream.on('finish', () => {
                    activeFileStream.close(() => {
                        try {
                            assertValidModelFile(partPath, metadata);
                            fs.renameSync(partPath, destPath);
                            onProgress?.(100);
                            settled = true;
                            resolve();
                        } catch (renameErr) {
                            cleanup(renameErr as Error);
                        }
                    });
                });

                res.on('error', cleanup);
                activeFileStream.on('error', cleanup);
            });

            // Idle-only timeout: fires when no data streams for 30s.
            req.setTimeout(DOWNLOAD_IDLE_TIMEOUT_MS, () => {
                req.destroy(new Error(`Download stalled after ${DOWNLOAD_IDLE_TIMEOUT_MS}ms without data: ${reqUrl}`));
            });
            req.on('error', cleanup);
        };

        request(url);
    });
}

function isValidModelFile(filePath: string, metadata: ModelFileMetadata): boolean {
    try {
        assertValidModelFile(filePath, metadata);
        return true;
    } catch {
        return false;
    }
}

function assertValidModelFile(filePath: string, metadata: ModelFileMetadata): void {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Missing model file: ${filePath}`);
    }

    const actualSize = fs.statSync(filePath).size;
    if (actualSize !== metadata.sizeBytes) {
        throw new Error(
            `Invalid model file size for ${metadata.relativePath}: expected ${metadata.sizeBytes}, got ${actualSize}`
        );
    }

    const actualSha256 = sha256File(filePath);
    if (actualSha256 !== metadata.sha256) {
        throw new Error(
            `Invalid model file hash for ${metadata.relativePath}: expected ${metadata.sha256}, got ${actualSha256}`
        );
    }
}

function sha256File(filePath: string): string {
    const hash = createHash('sha256');
    hash.update(fs.readFileSync(filePath));
    return hash.digest('hex');
}
