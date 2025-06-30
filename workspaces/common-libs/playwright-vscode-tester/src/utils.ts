import path from "path";
import { CodeUtil, ReleaseQuality } from "./codeUtil";
import { BrowserLaunchOptions, Browser } from "./types";
import fs from "fs";

export async function getBrowser(folder: string, version: string, quality: ReleaseQuality, extensionsFolder?: string): Promise<Browser> {
    const codeUtil = new CodeUtil(folder, quality);
    const vscodePath = path.join(folder, `Visual Studio Code.app`);
    if (!fs.existsSync(vscodePath)) {
        await codeUtil.downloadVSCode(version);
    }
    const browser = await codeUtil.getBrowser();

    if (extensionsFolder) {
        const files = path.resolve(extensionsFolder);
        const vsixFiles = fs.readdirSync(files).filter(file => file.endsWith('.vsix'));
        for (const vsix of vsixFiles) {
            const vsixPath = path.join(files, vsix);
            codeUtil.installExtension(vsixPath);
        }
    }

    return browser;
}

export async function getBrowserLaunchOptions(folder: string, version: string, quality: ReleaseQuality, projectPath?: string, extensionsFolder?: string): Promise<BrowserLaunchOptions> {
    const codeUtil = new CodeUtil(folder, quality, extensionsFolder);
    const resources = []
    if (projectPath) {
        resources.push(projectPath);
    }
    const options = await codeUtil.getCypressBrowserOptions({ vscodeVersion: version, resources });

    return options;
}
