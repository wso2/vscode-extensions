import { _electron } from 'playwright-core';
import * as path from 'path';
import { getBrowser, getBrowserLaunchOptions } from './utils';
import { ReleaseQuality } from './codeUtil';

export const startVSCode = async (resourcesFolder: string, vscodeVersion: string,
    releaseType: ReleaseQuality = ReleaseQuality.Stable, enableRecorder = false, extensionsFolder?: string, projectPath?: string) => {

    const browser = await getBrowser(resourcesFolder, vscodeVersion, releaseType, extensionsFolder);
    const browserOptions = await getBrowserLaunchOptions(resourcesFolder, vscodeVersion, releaseType, projectPath, extensionsFolder);

    const args = [...browserOptions.args];

    // run in headless mode if running in CI
    if (process.env.CI) {
        args.push('--disable-gpu');
    }

    const vscode = await _electron.launch({
        executablePath: browser.path,
        args,
        env: browserOptions.env,
        recordVideo: {
            dir: path.join(resourcesFolder, 'videos'),
            size: {
                width: 1920,
                height: 1080,
            },
        },
    });

    // Get the first window that the app opens, wait if necessary.
    const window = await vscode.firstWindow();

    // Direct Electron console to Node terminal.
    const fs = require('fs');
    const logFilePath = path.join(resourcesFolder, 'videos', 'extension.log');

    window.on('console', (msg) => {
        if (!/^Received response for untracked message id:|^Received notification with unknown method:/.test(msg.text())) {
            fs.appendFileSync(logFilePath, `${msg.text()}\n`);
        }
    });

    // wait for the window to be ready
    await window.waitForEvent('domcontentloaded');
    // wait for .workbench to be ready
    await window.locator('.monaco-workbench').waitFor({ state: 'visible' });

    if (enableRecorder) {
        // enable recorder
        window.pause();
    }
    return vscode;
};
