
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

import type { FeatureExtractionPipeline, PreTrainedTokenizer } from '@huggingface/transformers';
import * as path from 'path';
import * as fs from 'fs';
import { pathToFileURL, fileURLToPath } from 'url';
import { ensureOnnxRuntimeReady } from './wasm-runtime-manager';

// Shim fetch() to resolve local file paths (onnxruntime-web needs this)
const fetchShimInstalled = Symbol.for('mi-embedding-worker.fetchShim');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any;
if (!g[fetchShimInstalled]) {
  const originalFetch = g.fetch || fetch;
  g.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.href
        : (input as Request).url;
    let filePath: string | undefined;
    if (typeof url === 'string') {
      if (url.startsWith('file:')) {
        filePath = fileURLToPath(url);
      } else if (path.isAbsolute(url)) {
        filePath = url;
      }
    }
    if (filePath) {
      const buf = await fs.promises.readFile(filePath);
      // Cast Uint8Array through unknown for TypeScript compatibility
      const body = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength) as unknown as BodyInit;
      return new Response(body);
    }
    return originalFetch(input, init);
  };
  g[fetchShimInstalled] = true;
}

export class Embedder {
  private extractor: FeatureExtractionPipeline | null = null;
  private tokenizer: PreTrainedTokenizer | null = null;

  async initialize(modelPath: string): Promise<void> {
    console.log(`[Embedder] Initializing embedder with WASM-based ONNX Runtime`);
    console.log(`[Embedder] Model cache path: ${modelPath}`);

    try {
      // Verify model directory structure
      const modelDir = path.join(modelPath, 'isuruwijesiri', 'all-MiniLM-L6-v2-code-search-512');
      if (!fs.existsSync(modelDir)) {
        throw new Error(`Model directory not found at: ${modelDir}`);
      }
      console.log(`[Embedder] Model directory verified`);

      // Ensure onnxruntime-web WASM/MJS files are downloaded from the org CDN.
      // They are not bundled into the VSIX; they live in a user-local cache dir.
      const wasmRuntimeDir = await ensureOnnxRuntimeReady();
      console.log(`[Embedder] WASM runtime ready at: ${wasmRuntimeDir}`);

      // Pre-load 'sharp' to prevent issues in packaged env (transformers.js)
      try { require('sharp'); } catch { /* expected */ }

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      let transformers;
      try {
        transformers = require('@huggingface/transformers');
      } catch (e) {
        throw new Error(`Failed to load @huggingface/transformers: ${e instanceof Error ? e.message : String(e)}`);
      }
      const { pipeline, env, AutoTokenizer } = transformers;

      console.log(`[Embedder] Transformers.js loaded successfully`);

      // Configure model cache and disable remote models
      env.cacheDir = modelPath;
      env.localModelPath = modelPath;
      (env as any).allowRemoteModels = false;

      const onnxBackend = (env as any).backends?.onnx;
      if (onnxBackend?.wasm) {
        // Point onnxruntime-web at the user-local cache where the CDN-downloaded
        // WASM/MJS files were placed. Trailing slash is required by ORT's loader.
        onnxBackend.wasm.wasmPaths = pathToFileURL(wasmRuntimeDir).href + '/';
        onnxBackend.wasm.proxy = false;
        onnxBackend.wasm.numThreads = 1;
      }
      
      // Load embedding model (WASM backend, offline)
      this.extractor = await pipeline(
        'feature-extraction',
        'isuruwijesiri/all-MiniLM-L6-v2-code-search-512',
        { dtype: 'q8' }
      );
      console.log(`[Embedder] Pipeline loaded successfully`);

      // Load tokenizer for token counting
      console.log(`[Embedder] Loading tokenizer...`);
      this.tokenizer = await AutoTokenizer.from_pretrained('isuruwijesiri/all-MiniLM-L6-v2-code-search-512');
      console.log(`[Embedder] Tokenizer loaded successfully`);
      
      console.log(`[Embedder] Initialization complete - ready for embeddings`);
    } catch (e) {
      console.error('[Embedder] Initialization failed:', e);
      if (e instanceof Error) {
        console.error('[Embedder] Error details:', e.message);
        console.error('[Embedder] Stack trace:', e.stack);
      }
      throw e;
    }
  }

  async embed(text: string): Promise<Float32Array> {
    if (!this.extractor) {
      throw new Error('Embedder not initialized');
    }

    // Generate normalized embeddings (mean pooling)
    const result = await this.extractor(text, {
      pooling: 'mean',
      normalize: true
    });
    return new Float32Array(Array.from(result.data));
  }

  countTokens(text: string): number {
    if (!this.tokenizer) {
      throw new Error('Tokenizer not initialized');
    }
    const tokens = this.tokenizer.encode(text);
    return tokens.length;
  }

  close(): void {
    if (this.extractor) {
      try {
        this.extractor.dispose?.();
      } catch (e) {
        console.error('[Embedder] dispose failed:', e);
      }
      this.extractor = null;
    }
    this.tokenizer = null;
  }
}
