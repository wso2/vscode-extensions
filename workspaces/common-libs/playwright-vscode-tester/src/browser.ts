'use strict';

import * as path from 'path';
import * as fs from 'fs-extra';
import { compareVersions } from 'compare-versions';
import { CodeUtil, ReleaseQuality } from './codeUtil';
const os = require('os');

export class VSBrowser {
    static readonly baseVersion = '1.37.0';
    static readonly browserName = 'vscode';
    private storagePath: string;
    private extensionsFolder: string | undefined;
    private customSettings: object;
    private codeVersion: string;
    private releaseType: ReleaseQuality;
    private static _instance: VSBrowser;

    constructor(codeVersion: string, releaseType: ReleaseQuality, private resources: string[], customSettings: object = {}) {
        this.storagePath = process.env.TEST_RESOURCES ? process.env.TEST_RESOURCES : os.tmpdir();
        this.extensionsFolder = process.env.EXTENSIONS_FOLDER ? process.env.EXTENSIONS_FOLDER : undefined;
        this.customSettings = customSettings;
        this.codeVersion = codeVersion;
        this.releaseType = releaseType;

        VSBrowser._instance = this;
    }

    public getStoragePath(): string {
        return this.storagePath;
    }

    async getLaunchArgs() {
        const userSettings = await this.writeSettings();

        const args = [
            this.resources[0],
            '--no-sandbox',
            '--enable-logging',
            '--log-level=0',
            `--log-file=${path.join(this.storagePath, 'settings', 'chromium-log')}`,
            `--crash-reporter-directory=${path.join(this.storagePath, 'settings', 'crash-reports')}`,
            '--enable-blink-features=ShadowDOMV0',
            '--disable-renderer-backgrounding',
            '--ignore-certificate-errors',
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--autoplay-policy=no-user-gesture-required',
            '--disable-site-isolation-trials',
            '--disable-dev-shm-usage',
            '--disable-ipc-flooding-protection',
            '--enable-precise-memory-info',
            '--disable-workspace-trust',
            `--user-data-dir=${path.join(this.storagePath, 'settings', 'Code')}`,
        ];

        if (this.extensionsFolder) {
            args.push(`--extensions-dir=${this.extensionsFolder}`);
        }

        if (compareVersions(this.codeVersion, '1.39.0') < 0) {
            if (process.platform === 'win32') {
                fs.copyFileSync(path.resolve(__dirname, '..', '..', 'resources', 'state.vscdb'), path.join(userSettings, 'globalStorage', 'state.vscdb'));
            }
            args.push(`--extensionDevelopmentPath=${process.cwd()}`);
        }

        return args;
    }


    private async writeSettings() {
        const userSettings = path.join(this.storagePath, 'settings', 'Code', 'User');
        if (fs.existsSync(userSettings)) {
            fs.removeSync(path.join(this.storagePath, 'settings'));
        }
        let defaultSettings = {
            "workbench.editor.enablePreview": false,
            "workbench.startupEditor": "none",
            "window.titleBarStyle": "custom",
            "window.commandCenter": false,
            "window.dialogStyle": "custom",
            "window.restoreFullscreen": true,
            "window.newWindowDimensions": "maximized",
            "security.workspace.trust.enabled": false,
            "files.simpleDialog.enable": true,
            "terminal.integrated.copyOnSelection": true
        };
        if (Object.keys(this.customSettings).length > 0) {
            console.log('Detected user defined code settings');
            defaultSettings = { ...defaultSettings, ...this.customSettings };
        }

        fs.mkdirpSync(path.join(userSettings, 'globalStorage'));
        await fs.remove(path.join(this.storagePath, 'screenshots'));
        fs.writeJSONSync(path.join(userSettings, 'settings.json'), defaultSettings);
        console.log(`Writing code settings to ${path.join(userSettings, 'settings.json')}`);
        return userSettings;
    }

    /**
     * Returns the vscode version as string
     */
    get version(): string {
        return this.codeVersion;
    }

    /**
     * Returns an instance of VSBrowser
     */
    static get instance(): VSBrowser {
        return VSBrowser._instance;
    }

    /**
     * Open folder(s) or file(s) in the current instance of vscode.
     * 
     * @param paths path(s) of folder(s)/files(s) to open as varargs
     * @returns Promise resolving when all selected resources are opened and the workbench reloads
     */
    async openResources(...paths: string[]): Promise<void> {
        if (paths.length === 0) {
            return;
        }

        const code = new CodeUtil(this.storagePath, this.releaseType, this.extensionsFolder);
        code.open(...paths);
        await new Promise(res => setTimeout(res, 3000));
    }
}
