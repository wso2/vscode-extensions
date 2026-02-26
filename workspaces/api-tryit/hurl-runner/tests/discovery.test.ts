/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
 * specific language governing permissions and limitations
 * under the License.
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { discoverHurlFiles } from '../src/discovery';

async function writeHurlFile(filePath: string): Promise<void> {
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

		const discovered = await discoverHurlFiles({ collectionPath: tempDir });
		const relative = discovered.files.map(file => path.relative(discovered.rootPath, file).replace(/\\/g, '/'));

		expect(discovered.totalFiles).toBe(3);
		expect(relative).toEqual(['a-first.hurl', 'nested/b-middle.hurl', 'z-last.hurl']);
	});

	it('applies include and exclude filters', async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hurl-runner-discovery-'));
		await writeHurlFile(path.join(tempDir, 'users', 'list.hurl'));
		await writeHurlFile(path.join(tempDir, 'users', 'create.hurl'));
		await writeHurlFile(path.join(tempDir, 'admin', 'delete.hurl'));

		const discovered = await discoverHurlFiles({
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

		const discovered = await discoverHurlFiles({ collectionPath: filePath });

		expect(discovered.rootPath).toBe(path.dirname(filePath));
		expect(discovered.files).toEqual([path.resolve(filePath)]);
		expect(discovered.totalFiles).toBe(1);
	});
});
