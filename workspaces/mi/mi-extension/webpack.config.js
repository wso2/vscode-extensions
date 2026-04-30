/**
 * Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
 * 
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * Webpack Configuration for MI VSCode Extension
 * 
 * ============================================================================
 * WASM/ONNX Runtime Bundling
 * ============================================================================
 * 
 * This extension uses @huggingface/transformers for semantic embeddings.
 * Architecture ensures NO CDN usage and NO external dependencies:
 * 
 * - WASM Backend: onnxruntime-web (via transformers.js)
 *   - WASM files bundled into dist/ by webpack
 *   - asyncWebAssembly experiment enabled for proper WASM handling
 *   - WASM cache stored locally at ~/.wso2-mi/copilot/models/.onnx-wasm-cache
 * 
 * - NO Native Dependencies:
 *   - ❌ onnxruntime-node (replaced by WASM backend)
 *   - ❌ better-sqlite3 (replaced by @orama/orama)
 *   - ✅ Pure JavaScript only
 * 
 * - Offline Capable:
 *   - allowRemoteModels = false
 *   - allowRemoteFrameworks = false
 *   - All model files pre-downloaded to ~/.wso2-mi/copilot/models/
 * 
 * ============================================================================
 */

//@ts-check

'use strict';

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const webpack = require('webpack');
const { createEnvDefinePlugin } = require('../../../common/scripts/env-webpack-helper');

// Resolve the onnxruntime-web package root (nested under @huggingface/transformers
// in the pnpm store). We need the absolute paths of its two runtime-loaded files
// — the WASM JS wrapper and the WASM binary — so webpack can emit them into dist/
// as static assets. At runtime, embedder.ts points `env.backends.onnx.wasm.wasmPaths`
// at `file://.../dist/` so onnxruntime-web loads them directly, bypassing the
// fetch → Blob → URL.createObjectURL → import(blob:...) path that fails under
// Node's ESM loader (ERR_UNSUPPORTED_ESM_URL_SCHEME).
const ortWebPkgRoot = (() => {
  const huggingfaceMain = require.resolve('@huggingface/transformers');
  let d = path.dirname(huggingfaceMain);
  while (!fs.existsSync(path.join(d, 'package.json'))) d = path.dirname(d);
  const ortWebMain = require.resolve('onnxruntime-web', { paths: [d] });
  let r = path.dirname(ortWebMain);
  while (!fs.existsSync(path.join(r, 'package.json'))) r = path.dirname(r);
  return r;
})();
// Plain (non-JSEP) variant — onnxruntime-web/wasm's CPU backend loads
// `ort-wasm-simd-threaded.mjs` / `.wasm` when no webgpu/jspi features are
// requested. The `.jsep.*` variants only get used by the webgpu entry point.
const ortWasmMjs = path.join(ortWebPkgRoot, 'dist', 'ort-wasm-simd-threaded.mjs');
const ortWasmBin = path.join(ortWebPkgRoot, 'dist', 'ort-wasm-simd-threaded.wasm');

const envPath = path.resolve(__dirname, '.env');
const env = dotenv.config({ path: envPath }).parsed;
console.log("Fetching values for environment variables...");
// @ts-ignore
const { envKeys, missingVars } = createEnvDefinePlugin(env);
if (missingVars.length > 0) {
  console.warn(
    '\n⚠️  Environment Variable Configuration Warning:\n' +
    `Missing required environment variables: ${missingVars.join(', ')}\n` +
    `Please provide values in either .env file or runtime environment.\n`
  );
}

/** @type {import('webpack').Configuration} */
module.exports = {
  target: 'node',
	mode: 'none',

  entry: {
    extension: './src/extension.ts',
    'embedding-worker': './src/ai-features/agent-mode/embedding-service/service/embedding-worker.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]',
    assetModuleFilename: '[name][ext]',
  },
  externals: {
    vscode: 'commonjs vscode',
    // Optional Node.js-only deps of @huggingface/transformers that we do NOT use
    // (text-only feature-extraction pipeline). These are excluded via runtime
    // `require(...)` that is caught by a try/catch in embedder.ts — webpack's
    // module cache then returns an empty stub on subsequent requires.
    // Note: `onnxruntime-node` is NOT externalised; it is aliased to
    // `onnxruntime-web/wasm` in `resolve.alias` below so transformers picks
    // the WASM backend. Externals matching short-circuits alias resolution,
    // so an entry here would defeat the alias.
    'sharp': 'commonjs sharp',
    'canvas': 'commonjs canvas',
    'pdf-parse': 'commonjs pdf-parse',
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      // Redirect transformers' onnxruntime-node import to WASM-only ORT build.
      // This avoids webgpu/jspi bundle paths that rely on blob: module URLs in Node.
      'onnxruntime-node$': 'onnxruntime-web/wasm',
      // Synthetic aliases resolved in embedder.ts — trigger webpack to emit the
      // onnxruntime-web WASM wrapper + binary into dist/ as static assets.
      'ort-wasm-jsep-mjs$': ortWasmMjs,
      'ort-wasm-jsep-wasm$': ortWasmBin,
      'zod/v3': 'zod',
      'zod/v4': 'zod'
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      },
      {
        // onnxruntime-web's WASM JS wrapper + binary: emit to dist/ with stable
        // names so we can load them at runtime via a file:// URL. The wrapper
        // must be treated as a static asset (not parsed as an ESM module) so
        // that webpack doesn't try to inline it. Matches the plain and JSEP
        // variants: plain is used by our CPU backend; JSEP is kept available
        // in case onnxruntime-web's feature detection asks for it.
        test: /ort-wasm-simd-threaded(\.jsep)?\.(mjs|wasm)$/,
        type: 'asset/resource'
      },
      {
        // Any other .wasm files follow the same emit-to-dist behaviour.
        test: /\.wasm$/,
        type: 'asset/resource'
      }
    ]
  },
  experiments: {
    layers: true
  },
  plugins: [
      new webpack.DefinePlugin(envKeys),
      new webpack.NormalModuleReplacementPlugin(
        /^zod\/(v3|v4)$/,
        (resource) => {
          resource.request = 'zod';
        }
      ),
  ],
  devtool: !process.env.CI ? "nosources-source-map" : undefined,
  infrastructureLogging: {
    level: "log",
  },
  ignoreWarnings: [
    // @opentelemetry/instrumentation and require-in-the-middle use dynamic require()
    // for Node.js module hooking. This is by-design in OTel and harmless at runtime
    // (Langfuse tracing is behind a dev flag and these modules run fine in Node/Electron).
    { module: /@opentelemetry[\/]instrumentation/ },
    { module: /require-in-the-middle/ },
    // Handlebars uses the deprecated require.extensions API internally.
    // It works correctly at runtime in Node.js/Electron; the warnings are cosmetic.
    { module: /handlebars[\/]lib[\/]index\.js$/ },
    // TypeScript compiler (used by ts-morph) and vscode-languageserver-types
    // use dynamic require() in their UMD wrappers. Both work fine at runtime.
    { module: /@ts-morph[\/]common[\/]dist[\/]typescript\.js$/ },
    { module: /typescript[\/]lib[\/]typescript\.js$/ },
    { module: /vscode-languageserver-types[\/]lib[\/]umd[\/]main\.js$/ },
    // @huggingface/transformers uses WebAssembly for ONNX runtime inference
    // WASM files are bundled and handled correctly at runtime in Node.js/Electron
    { module: /@huggingface[\/]transformers/ },
  ],
};
