/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

import { runTests } from '@vscode/test-electron';

const VSCODE_MACOS = '/Applications/Visual Studio Code.app/Contents/MacOS/Electron';

async function main() {
	try {
		const extensionDevelopmentPath = path.resolve(__dirname, '../../');
		const extensionTestsPath = path.resolve(__dirname, './suite/index');

		const useLocalVSCode = fs.existsSync(VSCODE_MACOS);
		const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vsc-apk-test-'));

		await runTests({
			...(useLocalVSCode ? { vscodeExecutablePath: VSCODE_MACOS } : {}),
			extensionDevelopmentPath,
			extensionTestsPath,
			launchArgs: ['--disable-gpu', '--no-sandbox', `--user-data-dir=${userDataDir}`]
		});
	} catch (err) {
		console.error('Failed to run tests', err);
		process.exit(1);
	}
}

main();
