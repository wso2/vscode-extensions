import path from "path";
import { CodeUtil, ReleaseQuality } from "./codeUtil";
import { BrowserLaunchOptions, Browser } from "./types";
import { Download } from './download';
import fs from "fs";

export async function getBrowser(folder: string, version: string, quality: ReleaseQuality, extensionsFolder?: string, profileName?: string): Promise<Browser> {
    const codeUtil = new CodeUtil(folder, quality, extensionsFolder, profileName);
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

export async function getBrowserLaunchOptions(folder: string, version: string, quality: ReleaseQuality, projectPath?: string, extensionsFolder?: string, profileName?: string): Promise<BrowserLaunchOptions> {
    const codeUtil = new CodeUtil(folder, quality, extensionsFolder, profileName);
    const resources = []
    if (projectPath) {
        resources.push(projectPath);
    }
    const options = await codeUtil.getCypressBrowserOptions({ vscodeVersion: version, resources });

    return options;
}

export async function downloadExtensionFromMarketplace(
    extensionId: string,
    targetFolder: string,
    skipIfExists: boolean = true
): Promise<void> {
    fs.mkdirSync(targetFolder, { recursive: true });

    const [marketplaceId, channel] = extensionId.split('@');
    const extensionName = marketplaceId.split('.').pop();

    if (skipIfExists) {
        const existingFile = fs.readdirSync(targetFolder).find(file => {
            if (!file.endsWith('.vsix')) {
                return false;
            }
            const fileNamePrefix = file.slice(0, file.lastIndexOf('-'));
            return fileNamePrefix === extensionName;
        });
        if (existingFile) {
            console.log(`A VSIX for ${extensionName} extension already exists as ${existingFile}, skipping download.`);
            return;
        }
    }

    const { vsixUrl, version } = await getVsixUrlFromMarketplace(marketplaceId, channel);

    const fileName = `${extensionName}-${version}.vsix`;
    const target = path.join(targetFolder, fileName);

    console.log(`Downloading ${fileName}`);
    await Download.getFile(vsixUrl, target);
    console.log('Success!');
}

async function getVsixUrlFromMarketplace(marketplaceId: string, channel: string) {
    const isPrerelease = channel === 'prerelease';

    const res = await fetch(
        "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json;api-version=7.2-preview.1"
            },
            body: JSON.stringify({
                filters: [
                    {
                        criteria: [
                            { filterType: 7, value: marketplaceId }
                        ]
                    }
                ],
                flags: 0x2 | 0x10000 // Include Files | IncludeLatestPrereleaseAndStableVersionOnly
            })
        }
    );

    if (!res.ok) {
        const errorText = await res.text();
        console.error("Response body:", errorText);
        throw new Error(`API request failed: ${res.status}`);
    }

    const json: any = await res.json();

    const extension_data = json.results?.[0]?.extensions?.[0];
    if (!extension_data) {
        throw new Error("Extension not found");
    }

    const versionsData: any[] = extension_data.versions;
    if (!versionsData || versionsData.length === 0) {
        throw new Error("No versions found");
    }

    const versionData = versionsData.find((v: any) => (isPrerelease ? v.flags.includes("prerelease") : !v.flags.includes("prerelease")));
    const version = versionData?.version;
    const vsixUrl = versionData?.files?.find((f: any) => f.assetType === "Microsoft.VisualStudio.Services.VSIXPackage")?.source;

    return { vsixUrl, version };
}
