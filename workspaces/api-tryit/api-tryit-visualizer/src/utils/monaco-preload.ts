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

import { loader } from '@monaco-editor/react';

let environmentConfigured = false;
let warmupPromise: Promise<void> | undefined;

export function ensureMonacoEnvironment(): void {
	if (environmentConfigured || typeof window === 'undefined') {
		return;
	}

	(window as unknown as { MonacoEnvironment?: unknown }).MonacoEnvironment = {
		getWorkerUrl: (_moduleId: string, label: string) => {
			if (label === 'json') {
				return './json.worker.js';
			}
			if (label === 'css' || label === 'scss' || label === 'less') {
				return './css.worker.js';
			}
			if (label === 'html' || label === 'handlebars' || label === 'razor') {
				return './html.worker.js';
			}
			if (label === 'typescript' || label === 'javascript') {
				return './ts.worker.js';
			}
			return './editor.worker.js';
		}
	};

	environmentConfigured = true;
}

export function warmupMonacoEditor(): Promise<void> {
	ensureMonacoEnvironment();

	if (!warmupPromise) {
		warmupPromise = loader.init().then(() => undefined);
	}

	return warmupPromise;
}
