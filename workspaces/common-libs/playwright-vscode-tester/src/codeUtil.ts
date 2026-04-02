'use strict';

import * as child_process from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as vsce from '@vscode/vsce';
import { Unpack } from "./unpack";
import { Download } from './download';
import { VSBrowser } from './browser';
import { BrowserLaunchOptions, Browser } from './types.js';

export enum ReleaseQuality {
    Stable = 'stable',
    Insider = 'insider'
}

export interface RunOptions {
    /** version of VSCode to test against, defaults to latest */
    vscodeVersion?: string;
    /** path to custom settings json file */
    settings?: string;
    /** remove the extension's directory as well (if present) */
    cleanup?: boolean;
    /** path to a custom mocha configuration file */
    config?: string;
    /** try to perform all setup without internet connection, needs all requirements pre-downloaded manually */
    offline?: boolean;
    /** list of resources to be opened by VS Code */
    resources: string[];
}

/** defaults for the [[RunOptions]] */
export const DEFAULT_RUN_OPTIONS = {
    vscodeVersion: 'latest',
    settings: '',
    offline: false,
    resources: []
}

/**
 * Handles the VS Code instance used for testing.
 * Includes downloading, unpacking, launching, and version checks.
 */
export class CodeUtil {

    private codeFolder: string;
    private downloadPlatform: string;
    private downloadFolder: string;
    private releaseType: ReleaseQuality;
    private executablePath!: string;
    private cliPath!: string;
    private cliEnv!: string;
    private availableVersions: string[];
    private extensionsFolder: string | undefined;
    private profileName: string;

    /**
     * Create an instance of code handler 
     * @param folder Path to folder where all the artifacts will be stored.
     * @param extensionsFolder Path to use as extensions directory by VSCode
     * @param profileName Custom profile name for VSCode user data directory (optional)
     */
    constructor(folder = 'test-resources', type: ReleaseQuality = ReleaseQuality.Stable, extensionsFolder?: string, profileName?: string) {
        this.availableVersions = [];
        this.downloadPlatform = this.getPlatform();
        this.downloadFolder = path.resolve(folder);
        this.extensionsFolder = extensionsFolder ? path.resolve(extensionsFolder) : undefined;
        this.releaseType = type;
        this.profileName = profileName || `test-profile-${Date.now()}`;

        if (type === ReleaseQuality.Stable) {
            this.codeFolder = path.join(this.downloadFolder, (process.platform === 'darwin')
                ? 'Visual Studio Code.app' : `VSCode-${this.downloadPlatform}`);
        } else {
            this.codeFolder = path.join(this.downloadFolder, (process.platform === 'darwin')
                ? 'Visual Studio Code - Insiders.app' : `VSCode-${this.downloadPlatform}-insider`);
        }
    }

    /**
     * Get all versions for the given release stream
     */
    async getVSCodeVersions(): Promise<string[]> {
        const apiUrl = `https://update.code.visualstudio.com/api/releases/${this.releaseType}`;
        const json = await Download.getText(apiUrl);
        return json as unknown as string[];
    }

    /**
     * Download and unpack VS Code for testing purposes
     * 
     * @param version VS Code version to get, default latest
     */
    async downloadVSCode(version = 'latest'): Promise<void> {
        await this.checkCodeVersion(version);

        const literalVersion = version === 'latest' ? this.availableVersions[0] : version;
        if (this.releaseType == ReleaseQuality.Stable && literalVersion !== this.availableVersions[0]) {
            console.log(`
                WARNING: You are using the outdated VSCode version '${literalVersion}'. The latest stable version is '${this.availableVersions[0]}'.
            `);
        }

        console.log(`Downloading VSCode: ${literalVersion} / ${this.releaseType}`);
        if (!fs.existsSync(this.executablePath) || await this.getExistingCodeVersion() !== literalVersion) {
            fs.mkdirpSync(this.downloadFolder);

            const url = ['https://update.code.visualstudio.com', version, this.downloadPlatform, this.releaseType].join('/');
            const isTarGz = this.downloadPlatform.indexOf('linux') > -1;
            const fileName = `${path.basename(url)}.${isTarGz ? 'tar.gz' : 'zip'}`;

            console.log(`Downloading VS Code from: ${url}`);
            await Download.getFile(url, path.join(this.downloadFolder, fileName), true);
            console.log(`Downloaded VS Code into ${path.join(this.downloadFolder, fileName)}`);

            console.log(`Unpacking VS Code into ${this.downloadFolder}`);
            const target = await fs.mkdtemp('vscode');
            await Unpack.unpack(path.join(this.downloadFolder, fileName), target);
            let rootDir = target;
            const files = await fs.readdir(target);

            if (files.length === 1) {
                rootDir = path.join(target, files[0]);
            }
            await fs.move(rootDir, this.codeFolder, { overwrite: true });
            await fs.remove(target);

            console.log('Success!');
        } else {
            console.log('VS Code exists in local cache, skipping download');
        }
        this.findExecutables();
    }

    /**
     * Install your extension into the test instance of VS Code
     */
    installExtension(vsix?: string, id?: string): void {
        const pjson = require(path.resolve('package.json'));
        if (id) {
            return this.installExt(id);
        }
        const vsixPath = path.resolve(vsix ? vsix : `${pjson.name}-${pjson.version}.vsix`);
        this.installExt(vsixPath);
    }

    /**
     * Install extension dependencies from marketplace
     */
    installDependencies(): void {
        const pjson = require(path.resolve('package.json'));
        const deps = pjson.extensionDependencies;
        if (!deps) {
            return;
        }
        for (const id of deps as string[]) {
            this.installExt(id);
        }
    }

    private installExt(pathOrID: string): void {
        this.ensureExecutablePaths();
        let command = `${this.cliEnv} "${this.executablePath}" "${this.cliPath}" --ms-enable-electron-run-as-node --force --install-extension "${pathOrID}" --user-data-dir="${path.join(this.downloadFolder, 'settings', this.profileName, 'Code')}"`;
        if (this.extensionsFolder) {
            command += ` --extensions-dir=${this.extensionsFolder}`;
        }
        // If no extensionsFolder is specified, extensions will be installed to the default location
        // within the user data directory: {user-data-dir}/extensions/
        child_process.execSync(command, { stdio: 'inherit' });
    }

    /**
     * Open files/folders in running vscode
     * @param paths vararg paths to files or folders to open
     */
    open(...paths: string[]): void {
        this.ensureExecutablePaths();
        const segments = paths.map(f => `"${f}"`).join(' ');
        const command = `${this.cliEnv} "${this.executablePath}" "${this.cliPath}" --ms-enable-electron-run-as-node -r ${segments} --user-data-dir="${path.join(this.downloadFolder, 'settings', this.profileName, 'Code')}"`;
        child_process.execSync(command);
    }

    /**
     * Download a vsix file
     * @param vsixURL URL of the vsix file
     */
    async downloadExtension(vsixURL: string): Promise<string> {
        fs.mkdirpSync(this.downloadFolder);
        const fileName = path.basename(vsixURL);
        const target = path.join(this.downloadFolder, fileName);
        if (!fileName.endsWith('.vsix')) {
            throw new Error('The URL does not point to a vsix file');
        }

        console.log(`Downloading ${fileName}`);
        await Download.getFile(vsixURL, target);
        console.log('Success!');
        return target;
    }

    /**
     * Package extension into a vsix file
     * @param useYarn false to use npm as packaging system, true to use yarn instead
     */
    async packageExtension(useYarn?: boolean): Promise<void> {
        await vsce.createVSIX({
            useYarn
        });
    }

    /**
     * Uninstall the tested extension from the test instance of VS Code
     *
     * @param cleanup remove the extension's directory as well.
     */
    uninstallExtension(cleanup?: boolean): void {
        const pjson = require(path.resolve('package.json'));
        const extension = `${pjson.publisher}.${pjson.name}`;

        if (cleanup) {
            this.ensureExecutablePaths();
            let command = `${this.cliEnv} "${this.executablePath}" "${this.cliPath}" --ms-enable-electron-run-as-node --uninstall-extension "${extension}" --user-data-dir="${path.join(this.downloadFolder, 'settings', this.profileName, 'Code')}"`;
            if (this.extensionsFolder) {
                command += ` --extensions-dir=${this.extensionsFolder}`;
            }
            // If no extensionsFolder is specified, uninstall from the default location
            // within the user data directory: {user-data-dir}/extensions/
            child_process.execSync(command, { stdio: 'inherit' });
        }
    }


    /**
     * Finds the version of chromium used for given VS Code version.
     * Works only for versions 1.30+, older versions need to be checked manually
     * 
     * @param codeVersion version of VS Code, default latest
     * @param quality release stream, default stable
     */
    async getChromiumVersion(codeVersion = 'latest'): Promise<string> {
        await this.checkCodeVersion(codeVersion);
        const literalVersion = codeVersion === 'latest' ? this.availableVersions[0] : codeVersion;
        let revision = literalVersion;
        if (literalVersion.endsWith('-insider')) {
            if (codeVersion === 'latest') {
                revision = 'main';
            } else {
                revision = literalVersion.substring(0, literalVersion.indexOf('-insider'));
                revision = `release/${revision.substring(0, revision.lastIndexOf('.'))}`;
            }
        } else {
            revision = `release/${revision.substring(0, revision.lastIndexOf('.'))}`;
        }

        const fileName = 'manifest.json';
        const url = `https://raw.githubusercontent.com/Microsoft/vscode/${revision}/cgmanifest.json`;
        await Download.getFile(url, path.join(this.downloadFolder, fileName));

        try {
            const manifest = require(path.join(this.downloadFolder, fileName));
            return manifest.registrations[0].version;
        } catch (err) {
            let version = '';
            if (await fs.pathExists(this.codeFolder)) {
                version = await this.getChromiumVersionOffline();
            }
            if (version === '') {
                throw new Error('Unable to determine required ChromeDriver version');
            }
            return version;
        }
    }

    /**
     * Check if VS Code exists in local cache along with an appropriate version of chromedriver
     * without internet connection
     */
    async checkOfflineRequirements(): Promise<string> {
        try {
            await this.getExistingCodeVersion();
        } catch (err) {
            console.log('ERROR: Cannot find a local copy of VS Code in offline mode, exiting.');
            throw (err);
        }
        return this.getChromiumVersionOffline();
    }

    /**
     * Attempt to get chromium version from a downloaded copy of vs code
     */
    async getChromiumVersionOffline(): Promise<string> {
        const manifestPath = path.join(this.codeFolder, 'resources', 'app', 'ThirdPartyNotices.txt');
        const text = (await fs.readFile(manifestPath)).toString();
        const matches = text.match(/chromium\sversion\s(.*)\s\(/);
        if (matches && matches[1]) {
            return matches[1];
        }
        return '';
    }

    /**
     * Get the root folder of VS Code instance
     */
    getCodeFolder(): string {
        return this.codeFolder;
    }

    /**
     * Check if given version is available in the given stream
     */
    private async checkCodeVersion(vscodeVersion: string): Promise<void> {
        if (this.availableVersions.length < 1) {
            this.availableVersions = await this.getVSCodeVersions();
        }
        if (vscodeVersion !== 'latest' && this.availableVersions.indexOf(vscodeVersion) < 0) {
            throw new Error(`Version ${vscodeVersion} is not available in ${this.releaseType} stream`);
        }
    }

    /**
     * Check what VS Code version is present in the testing folder
     */
    private getExistingCodeVersion(): Promise<string> {
        const command = [this.cliEnv, `"${this.executablePath}"`, `"${this.cliPath}"`, '--ms-enable-electron-run-as-node', '-v'].join(' ');
        return new Promise<string>((resolve, reject) => {
            child_process.exec(command, (err, stdout) => {
                if (err) return reject(err);
                resolve(stdout.split('\n')[0]);
            });
        });
    }

    /**
     * Construct the platform string based on OS
     */
    private getPlatform(): string {
        let platform: string = process.platform;
        const arch = process.arch;
        this.cliEnv = 'ELECTRON_RUN_AS_NODE=1';

        if (platform === 'linux') {
            platform += arch === 'x64' ? `-${arch}` : `-ia32`;
        } else if (platform === 'win32') {
            platform += arch === 'x64' ? `-${arch}` : '';
            platform += '-archive';
            this.cliEnv = `set ${this.cliEnv} &&`;
        } else if (platform === 'darwin') {
            platform = (process.arch === 'arm64' || process.arch === 'x64') ? 'darwin-arm64' : 'darwin';
        }

        return platform;
    }

    /**
     * Setup paths specific to used OS
     */
    private findExecutables(): void {
        const defaultCliPath = path.join(this.codeFolder, 'resources', 'app', 'out', 'cli.js');
        this.cliPath = defaultCliPath;

        if (process.platform === 'win32' && fs.existsSync(this.codeFolder) && !fs.existsSync(this.cliPath)) {
            const entries = fs.readdirSync(this.codeFolder, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isDirectory()) {
                    continue;
                }
                const candidate = path.join(this.codeFolder, entry.name, 'resources', 'app', 'out', 'cli.js');
                if (fs.existsSync(candidate)) {
                    this.cliPath = candidate;
                    break;
                }
            }
        }
        console.log(`Using CLI path: ${this.cliPath}`);

        switch (process.platform) {
            case 'darwin':
                this.executablePath = path.join(this.codeFolder, 'Contents', 'MacOS', 'Electron');
                this.cliPath = path.join(this.codeFolder, 'Contents', 'Resources', 'app', 'out', 'cli.js');
                break;
            case 'win32':
                this.executablePath = path.join(this.codeFolder, 'Code.exe');
                if (this.releaseType === ReleaseQuality.Insider) {
                    this.executablePath = path.join(this.codeFolder, 'Code - Insiders.exe');
                }
                break;
            case 'linux':
                this.executablePath = path.join(this.codeFolder, 'code');
                if (this.releaseType === ReleaseQuality.Insider) {
                    this.executablePath = path.join(this.codeFolder, 'code-insiders');
                }
                break;
        }
    }


    async getCypressBrowserOptions(runOptions: RunOptions = DEFAULT_RUN_OPTIONS): Promise<BrowserLaunchOptions> {
        if (!runOptions.offline) {
            await this.checkCodeVersion(runOptions.vscodeVersion ?? DEFAULT_RUN_OPTIONS.vscodeVersion);
        } else {
            this.availableVersions = [await this.getExistingCodeVersion()];
        }
        const literalVersion = runOptions.vscodeVersion === undefined || runOptions.vscodeVersion === 'latest' ? this.availableVersions[0] : runOptions.vscodeVersion;

        const finalEnv: NodeJS.ProcessEnv = {};
        Object.assign(finalEnv, {});
        const key = 'PATH';
        finalEnv[key] = [this.downloadFolder, process.env[key]].join(path.delimiter);

        const browser = new VSBrowser(literalVersion, this.releaseType, runOptions.resources, {}, this.profileName, this.extensionsFolder);
        const launchArgs = await browser.getLaunchArgs()

        process.env = {
            ...process.env,
            ...finalEnv,
        }
        process.env.TEST_RESOURCES = this.downloadFolder;
        process.env.EXTENSIONS_FOLDER = this.extensionsFolder;
        // process.env.VSCODE_APPDATA = path.join(browser.getStoragePath(), 'settings');

        return {
            args: launchArgs,
            env: process.env,
            extensions: [],
            preferences: {},
        }
    }

    async getBrowser(runOptions: RunOptions = DEFAULT_RUN_OPTIONS): Promise<Browser> {
        this.ensureExecutablePaths();
        if (!runOptions.offline) {
            await this.checkCodeVersion(runOptions.vscodeVersion ?? DEFAULT_RUN_OPTIONS.vscodeVersion);
        } else {
            this.availableVersions = [await this.getExistingCodeVersion()];
        }
        const literalVersion = runOptions.vscodeVersion === undefined || runOptions.vscodeVersion === 'latest' ? this.availableVersions[0] : runOptions.vscodeVersion;

        return {
            name: 'vscode',
            family: 'chromium',
            displayName: 'VS Code',
            version: literalVersion,
            path: this.executablePath,
            majorVersion: '108',
            channel: this.releaseType,
            isHeaded: process.env.CI === 'true' ? false : true,
            isHeadless: process.env.CI === 'true' ? true : false,
        }
    }

    private ensureExecutablePaths(): void {
        if (!this.executablePath || !this.cliPath) {
            this.findExecutables();
        }
    }
}
