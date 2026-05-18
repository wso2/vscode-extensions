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
import * as path from 'path';
import { HurlRunnerError } from './errors';
import { matchesPattern, normalizeForPattern } from './pattern';
import { HurlDiscoveryResult, HurlRunInput } from './types';

async function collectHurlFiles(directory: string): Promise<string[]> {
	let entries;
	try {
		entries = await fs.readdir(directory, { withFileTypes: true });
	} catch (err) {
		throw new HurlRunnerError('discovery_error', `Failed to read directory: ${directory}: ${err instanceof Error ? err.message : String(err)}`);
	}
	const files: string[] = [];

	for (const entry of entries) {
		const fullPath = path.resolve(directory, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await collectHurlFiles(fullPath)));
		} else if (entry.isFile() && entry.name.toLowerCase().endsWith('.hurl')) {
			files.push(fullPath);
		}
	}

	return files;
}

function applyPathFilters(files: string[], rootPath: string, input: HurlRunInput): string[] {
	let filtered = files;
	const includePatterns = input.includePatterns || [];
	const excludePatterns = input.excludePatterns || [];

	if (includePatterns.length > 0) {
		filtered = filtered.filter(filePath => {
			const relative = normalizeForPattern(path.relative(rootPath, filePath));
			return includePatterns.some(pattern => matchesPattern(relative, pattern));
		});
	}

	if (excludePatterns.length > 0) {
		filtered = filtered.filter(filePath => {
			const relative = normalizeForPattern(path.relative(rootPath, filePath));
			return !excludePatterns.some(pattern => matchesPattern(relative, pattern));
		});
	}

	return filtered;
}

export async function discoverHurlFiles(input: HurlRunInput): Promise<HurlDiscoveryResult> {
	if (!input.collectionPath || typeof input.collectionPath !== 'string') {
		throw new HurlRunnerError('discovery_error', 'Invalid collectionPath provided');
	}

	const targetPath = path.resolve(input.collectionPath);
	let stat;
	try {
		stat = await fs.stat(targetPath);
	} catch {
		throw new HurlRunnerError('discovery_error', `Path does not exist: ${targetPath}`);
	}

	let rootPath: string;
	let discoveredFiles: string[];

	if (stat.isFile()) {
		if (!targetPath.toLowerCase().endsWith('.hurl')) {
			throw new HurlRunnerError('discovery_error', `File is not a .hurl file: ${targetPath}`);
		}
		rootPath = path.dirname(targetPath);
		discoveredFiles = [targetPath];
	} else if (stat.isDirectory()) {
		rootPath = targetPath;
		discoveredFiles = await collectHurlFiles(targetPath);
	} else {
		throw new HurlRunnerError('discovery_error', `Unsupported path type: ${targetPath}`);
	}

	const files = applyPathFilters(discoveredFiles, rootPath, input).sort((a, b) => a.localeCompare(b));
	const warnings: string[] = [];
	if (files.length === 0) {
		warnings.push('No .hurl files found after applying filters.');
	}

	return {
		rootPath,
		files,
		totalFiles: files.length,
		warnings
	};
}
