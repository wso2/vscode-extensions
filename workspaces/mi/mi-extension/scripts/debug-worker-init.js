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

const path = require('path');
const os = require('os');
const fs = require('fs');
const { fork } = require('child_process');

const workerPath = path.resolve(__dirname, '../dist/embedding-worker.js');
const projectPath = path.resolve(__dirname, '..');
const modelRootPath = path.join(os.homedir(), '.wso2-mi', 'copilot', 'models');
const dbPath = path.join(os.tmpdir(), 'mi-worker-debug', 'embeddings.json');
const artifactsSubPath = 'src';

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

console.log('workerPath:', workerPath);
console.log('modelRootPath:', modelRootPath);
console.log('dbPath:', dbPath);

const child = fork(workerPath, [], {
  stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
});

const req = {
  v: '1.0',
  id: `req-${Date.now()}`,
  ts: Date.now(),
  type: 'request',
  method: 'init',
  payload: {
    projectPath,
    dbPath,
    modelRootPath,
    artifactsSubPath,
    pollIntervalMs: 60000,
  },
};

const timeout = setTimeout(() => {
  console.error('Timed out waiting for worker response');
  child.kill('SIGKILL');
  process.exit(1);
}, 120000);

child.on('message', (msg) => {
  console.log('[MSG]', JSON.stringify(msg));
  if (msg?.type === 'response' && msg?.id === req.id && msg?.method === 'init') {
    clearTimeout(timeout);
    child.kill('SIGTERM');
    process.exit(msg.ok ? 0 : 2);
  }
});

child.on('exit', (code, signal) => {
  console.log('worker exited:', { code, signal });
});

child.send(req);
