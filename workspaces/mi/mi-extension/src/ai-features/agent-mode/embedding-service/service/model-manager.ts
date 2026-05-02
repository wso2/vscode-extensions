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

// ─── Constants ────────────────────────────────────────────────────────────────

const MODEL_ORG = 'isuruwijesiri';
const MODEL_NAME = 'all-MiniLM-L6-v2-code-search-512';
const MODEL_ID = `${MODEL_ORG}/${MODEL_NAME}`;

// Required files for a complete model download (paths relative to model root).
const REQUIRED_MODEL_FILES = [
    'config.json',
    'tokenizer_config.json',
    'tokenizer.json',
    'vocab.txt',
    path.join('onnx', 'model_quantized.onnx'),
];

const HF_BASE_URL = `https://huggingface.co/${MODEL_ID}/resolve/main`;
const MAX_REDIRECTS = 5;
const DOWNLOAD_TIMEOUT_MS = 30_000;

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
 * Returns true if all required model files are present on disk.
 */
export function isModelDownloaded(modelRootPath?: string): boolean {
    const modelDir = getLocalModelDir(modelRootPath);
    return REQUIRED_MODEL_FILES.every(f => fs.existsSync(path.join(modelDir, f)));
}

// ─── Download ─────────────────────────────────────────────────────────────────

export type ModelDownloadProgressCallback = (fileName: string, percent: number) => void;

/**
 * Downloads the embedding model files from HuggingFace into the local model directory.
 * Files are written to .part temporaries and renamed on success — no corrupt partials on failure.
 *
 * @param onProgress - Optional callback called with (fileName, percent 0-100)
 * @param modelRootPath - Optional override for the model root directory
 */
export async function downloadModel(onProgress?: ModelDownloadProgressCallback, modelRootPath?: string): Promise<void> {
    const modelDir = getLocalModelDir(modelRootPath);

    // Ensure all required directories exist
    fs.mkdirSync(path.join(modelDir, 'onnx'), { recursive: true });

    for (const relativePath of REQUIRED_MODEL_FILES) {
        const destPath = path.join(modelDir, relativePath);

        // Skip files that already exist (resume-friendly)
        if (fs.existsSync(destPath)) {
            onProgress?.(relativePath, 100);
            continue;
        }

        const url = `${HF_BASE_URL}/${relativePath.replace(/\\/g, '/')}`;
        console.log(`[ModelManager] Downloading: ${url}`);

        await downloadFile(url, destPath, (percent) => {
            onProgress?.(relativePath, percent);
        });

        console.log(`[ModelManager] Saved: ${destPath}`);
    }
}

function downloadFile(
    url: string,
    destPath: string,
    onProgress?: (percent: number) => void
): Promise<void> {
    return new Promise((resolve, reject) => {
        const partPath = destPath + '.part';
        const fileStream = fs.createWriteStream(partPath);

        const cleanup = (err: Error) => {
            fileStream.destroy();
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

                res.pipe(fileStream);

                fileStream.on('finish', () => {
                    fileStream.close(() => {
                        try {
                            fs.renameSync(partPath, destPath);
                            onProgress?.(100);
                            resolve();
                        } catch (renameErr) {
                            cleanup(renameErr as Error);
                        }
                    });
                });

                res.on('error', cleanup);
                fileStream.on('error', cleanup);
            });

            req.setTimeout(DOWNLOAD_TIMEOUT_MS, () => {
                req.destroy(new Error(`Download timeout after ${DOWNLOAD_TIMEOUT_MS}ms: ${reqUrl}`));
            });
            req.on('error', cleanup);
        };

        request(url);
    });
}
