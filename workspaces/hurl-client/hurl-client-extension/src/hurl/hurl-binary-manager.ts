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

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import * as https from 'https';
import { spawn } from 'child_process';

const DEFAULT_HURL_VERSION = '7.1.0';
const HURL_RELEASE_BASE_URL = 'https://github.com/Orange-OpenSource/hurl/releases/download';
const CONFIG_SECTION = 'http-book';

interface ResolveCommandOptions {
	autoInstall?: boolean;
	promptOnFailure?: boolean;
}

interface InstallOptions {
	version?: string;
	force?: boolean;
	interactive?: boolean;
}

interface HurlAsset {
	archiveName: string;
	downloadUrl: string;
	archiveType: 'tar.gz' | 'zip';
}

interface InstallMetadata {
	version: string;
	installedAt: string;
	sourceUrl: string;
	platform: string;
	arch: string;
}

function getBinaryName(): string {
	return process.platform === 'win32' ? 'hurl.exe' : 'hurl';
}

function getPlatformArchKey(): string {
	return `${process.platform}-${process.arch}`;
}

function resolveManagedAsset(version: string): HurlAsset | undefined {
	const platformKey = getPlatformArchKey();

	let archiveName: string;
	let archiveType: 'tar.gz' | 'zip';

	switch (platformKey) {
		case 'darwin-arm64':  archiveName = `hurl-${version}-aarch64-apple-darwin.tar.gz`;       archiveType = 'tar.gz'; break;
		case 'darwin-x64':   archiveName = `hurl-${version}-x86_64-apple-darwin.tar.gz`;        archiveType = 'tar.gz'; break;
		case 'linux-x64':    archiveName = `hurl-${version}-x86_64-unknown-linux-gnu.tar.gz`;   archiveType = 'tar.gz'; break;
		case 'linux-arm64':  archiveName = `hurl-${version}-aarch64-unknown-linux-gnu.tar.gz`;  archiveType = 'tar.gz'; break;
		case 'win32-x64':    archiveName = `hurl-${version}-x86_64-pc-windows-msvc.zip`;        archiveType = 'zip';    break;
		case 'win32-arm64':  archiveName = `hurl-${version}-aarch64-pc-windows-msvc.zip`;       archiveType = 'zip';    break;
		default: return undefined;
	}

	return {
		archiveName,
		downloadUrl: `${HURL_RELEASE_BASE_URL}/${version}/${archiveName}`,
		archiveType
	};
}

export class HurlBinaryManager {
	constructor(private readonly context: vscode.ExtensionContext) {}

	async resolveCommandPath(options: ResolveCommandOptions = {}): Promise<string> {
		const configuredPath = vscode.workspace.getConfiguration(CONFIG_SECTION).get<string>('hurl.path', '').trim();
		if (configuredPath.length > 0) {
			if (await this.pathExists(configuredPath)) {
				return configuredPath;
			}
			throw new Error(`Configured hurl binary path does not exist: ${configuredPath}`);
		}

		const version = this.getManagedVersion();
		const managedBinaryPath = this.getManagedBinaryPath(version);
		if (await this.pathExists(managedBinaryPath)) {
			return managedBinaryPath;
		}

		const autoInstall = options.autoInstall ?? vscode.workspace.getConfiguration(CONFIG_SECTION).get<boolean>('hurl.autoInstall', true);
		if (!autoInstall) {
			return 'hurl';
		}

		try {
			return await this.installManagedHurl({ version, interactive: false });
		} catch (error) {
			if (options.promptOnFailure) {
				const message = error instanceof Error ? error.message : 'Failed to install managed hurl binary';
				const action = await vscode.window.showErrorMessage(
					`${message}. Set http-book.hurl.path or run "HttpBook: Install Hurl".`,
					'Install Hurl',
					'Open Settings'
				);
				if (action === 'Install Hurl') {
					try {
						return await this.installManagedHurl({ version, interactive: true });
					} catch {
						// Fall through to PATH fallback.
					}
				}
				if (action === 'Open Settings') {
					await vscode.commands.executeCommand('workbench.action.openSettings', `${CONFIG_SECTION}.hurl.path`);
				}
			}
			return 'hurl';
		}
	}

	async installManagedHurl(options: InstallOptions = {}): Promise<string> {
		const version = options.version || this.getManagedVersion();
		const asset = resolveManagedAsset(version);
		if (!asset) {
			throw new Error(
				`Managed Hurl install is not supported on ${getPlatformArchKey()}. Set http-book.hurl.path manually.`
			);
		}

		const install = async (progress?: vscode.Progress<{ message?: string; increment?: number }>): Promise<string> => {
			const binaryPath = this.getManagedBinaryPath(version);
			if (!options.force && await this.pathExists(binaryPath)) {
				return binaryPath;
			}

			const versionRoot = this.getVersionRoot(version);
			const workRoot = path.join(versionRoot, '_download');
			const extractRoot = path.join(workRoot, 'extract');
			const archivePath = path.join(workRoot, asset.archiveName);

			await fs.mkdir(workRoot, { recursive: true });
			await fs.mkdir(extractRoot, { recursive: true });

			progress?.report({ message: `Downloading ${asset.archiveName}` });
			const archiveBuffer = await this.downloadFile(asset.downloadUrl);
			await fs.writeFile(archivePath, new Uint8Array(archiveBuffer));

			progress?.report({ message: 'Extracting archive' });
			if (asset.archiveType === 'zip') {
				await this.extractZip(archivePath, extractRoot);
			} else {
				await this.extractTarGz(archivePath, extractRoot);
			}

			progress?.report({ message: 'Finalizing installation' });
			const locatedBinary = await this.findBinary(extractRoot, getBinaryName());
			if (!locatedBinary) {
				throw new Error('Downloaded archive does not contain a hurl executable');
			}

			await fs.mkdir(path.dirname(binaryPath), { recursive: true });
			await this.copyBinaryCompanionFiles(locatedBinary, path.dirname(binaryPath));
			await fs.copyFile(locatedBinary, binaryPath);
			if (process.platform !== 'win32') {
				await fs.chmod(binaryPath, 0o755);
			}

			const metadata: InstallMetadata = {
				version,
				installedAt: new Date().toISOString(),
				sourceUrl: asset.downloadUrl,
				platform: process.platform,
				arch: process.arch
			};
			await fs.writeFile(path.join(versionRoot, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');
			await fs.rm(workRoot, { recursive: true, force: true });

			return binaryPath;
		};

		if (options.interactive) {
			return vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: 'HttpBook: Installing Hurl',
					cancellable: false
				},
				progress => install(progress)
			);
		}

		return install();
	}

	private getManagedVersion(): string {
		const configured = vscode.workspace.getConfiguration(CONFIG_SECTION).get<string>('hurl.version', DEFAULT_HURL_VERSION).trim();
		return configured || DEFAULT_HURL_VERSION;
	}

	private getVersionRoot(version: string): string {
		return path.join(this.context.globalStorageUri.fsPath, 'hurl-managed', version, getPlatformArchKey());
	}

	private getManagedBinaryPath(version: string): string {
		return path.join(this.getVersionRoot(version), getBinaryName());
	}

	private async pathExists(targetPath: string): Promise<boolean> {
		try {
			await fs.stat(targetPath);
			return true;
		} catch {
			return false;
		}
	}

	private async downloadFile(url: string): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			const request = https.get(url, response => {
				if (!response.statusCode) {
					response.resume();
					reject(new Error(`Failed to download ${url}: missing status code`));
					return;
				}

				const redirectStatuses = new Set([301, 302, 303, 307, 308]);
				if (redirectStatuses.has(response.statusCode) && response.headers.location) {
					const redirectedUrl = new URL(response.headers.location, url).toString();
					response.resume();
					this.downloadFile(redirectedUrl).then(resolve).catch(reject);
					return;
				}

				if (response.statusCode < 200 || response.statusCode > 299) {
					const statusLine = `${response.statusCode} ${response.statusMessage || ''}`.trim();
					response.resume();
					reject(new Error(`Failed to download ${url}: ${statusLine}`));
					return;
				}

				const chunks: Array<Buffer | Uint8Array> = [];
				response.on('data', chunk => {
					chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
				});
				response.on('end', () => resolve(Buffer.concat(chunks as any) as unknown as Buffer));
				response.on('error', reject);
			});

			request.on('error', reject);
		});
	}

	private async extractTarGz(archivePath: string, destinationPath: string): Promise<void> {
		await this.execProcess('tar', ['-xzf', archivePath, '-C', destinationPath]);
	}

	private async extractZip(archivePath: string, destinationPath: string): Promise<void> {
		await this.execProcess('powershell.exe', [
			'-NoProfile', '-NonInteractive', '-Command',
			`Expand-Archive -LiteralPath '${archivePath}' -DestinationPath '${destinationPath}' -Force`
		]);
	}

	private async execProcess(command: string, args: string[]): Promise<void> {
		await new Promise<void>((resolve, reject) => {
			let stderr = '';
			const child = spawn(command, args, { shell: false });

			child.stderr.on('data', data => {
				stderr += data.toString();
			});

			child.on('error', error => {
				reject(new Error(`Failed to execute ${command}: ${error.message}`));
			});

			child.on('close', code => {
				if (code === 0) {
					resolve();
					return;
				}
				const detail = stderr.trim();
				reject(new Error(detail.length > 0 ? detail : `${command} exited with code ${code ?? 'unknown'}`));
			});
		});
	}

	private async findBinary(rootPath: string, binaryName: string): Promise<string | undefined> {
		const stack = [rootPath];
		while (stack.length > 0) {
			const current = stack.pop();
			if (!current) {
				continue;
			}

			const entries = await fs.readdir(current, { withFileTypes: true });
			for (const entry of entries) {
				const entryPath = path.join(current, entry.name);
				if (entry.isDirectory()) {
					stack.push(entryPath);
					continue;
				}
				if (entry.isFile() && entry.name === binaryName) {
					return entryPath;
				}
			}
		}

		return undefined;
	}

	private async copyBinaryCompanionFiles(sourceBinaryPath: string, destinationDir: string): Promise<void> {
		const sourceDir = path.dirname(sourceBinaryPath);
		const binaryFileName = path.basename(sourceBinaryPath);
		const entries = await fs.readdir(sourceDir, { withFileTypes: true });

		for (const entry of entries) {
			const sourcePath = path.join(sourceDir, entry.name);
			const destinationPath = path.join(destinationDir, entry.name);

			if (entry.name === binaryFileName) {
				continue;
			}

			if (entry.isDirectory()) {
				await fs.cp(sourcePath, destinationPath, { recursive: true, force: true });
				continue;
			}

			if (entry.isFile()) {
				await fs.copyFile(sourcePath, destinationPath);
			}
		}
	}
}

let manager: HurlBinaryManager | undefined;

export function initializeHurlBinaryManager(context: vscode.ExtensionContext): HurlBinaryManager {
	manager = new HurlBinaryManager(context);
	return manager;
}

export function getHurlBinaryManager(): HurlBinaryManager {
	if (!manager) {
		throw new Error('HurlBinaryManager is not initialized');
	}
	return manager;
}
