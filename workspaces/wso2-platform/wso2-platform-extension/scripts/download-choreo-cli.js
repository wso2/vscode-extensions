#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const os = require('os');

const PROJECT_ROOT = path.join(__dirname, '..');
const REPO_ROOT = path.join(PROJECT_ROOT, '..', '..', '..');
// Primary location used by the extension
const CLI_RESOURCES_DIR = path.join(PROJECT_ROOT, 'resources', 'choreo-cli');
// Persistent cache that survives 'rush purge'
const CLI_CACHE_DIR = path.join(REPO_ROOT, 'common', 'temp', 'choreo-cli');
const PACKAGE_JSON_PATH = path.join(PROJECT_ROOT, 'package.json');
const GITHUB_REPO_URL = 'https://api.github.com/repos/wso2/choreo-cli';

// Platform-specific file patterns for CLI downloads
const CLI_ASSET_PATTERNS = [
    'choreo-cli-{version}-darwin-amd64.zip',
    'choreo-cli-{version}-darwin-arm64.zip',
    'choreo-cli-{version}-linux-amd64.tar.gz',
    'choreo-cli-{version}-linux-arm64.tar.gz',
    'choreo-cli-{version}-windows-amd64.zip'
];

// ============================================================================
// Version Management
// ============================================================================

function getCliVersion() {
    const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
    const cliVersion = packageJson.cliVersion;
    
    if (!cliVersion) {
        throw new Error('cliVersion not found in package.json');
    }
    
    console.log(`Choreo CLI version for WSO2 platform extension: ${cliVersion}`);
    return cliVersion;
}

function getCombinedZipFileName(version) {
    return `choreo-cli-${version}.zip`;
}

function getCombinedZipPath(version, baseDir) {
    return path.join(baseDir, getCombinedZipFileName(version));
}

function getResourcesZipPath(version) {
    return getCombinedZipPath(version, CLI_RESOURCES_DIR);
}

function getCacheZipPath(version) {
    return getCombinedZipPath(version, CLI_CACHE_DIR);
}

function getExpectedAssetNames(version) {
    return CLI_ASSET_PATTERNS.map(pattern => pattern.replace('{version}', version));
}

// ============================================================================
// File System Utilities
// ============================================================================

function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function getFileSize(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats.size;
    } catch (error) {
        return 'unknown';
    }
}

function deleteFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        console.warn(`Failed to delete file ${filePath}:`, error.message);
    }
}

function createTempDirectory(prefix) {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function deleteDirectory(dirPath) {
    try {
        if (fs.existsSync(dirPath)) {
            fs.rmSync(dirPath, { recursive: true, force: true });
        }
    } catch (error) {
        console.warn(`Failed to delete directory ${dirPath}:`, error.message);
    }
}

// ============================================================================
// CLI File Validation & Cache Management
// ============================================================================

function checkExistingCLI(version) {
    const resourcesZipPath = getResourcesZipPath(version);
    const cacheZipPath = getCacheZipPath(version);
    
    const resourcesExists = fs.existsSync(resourcesZipPath);
    const cacheExists = fs.existsSync(cacheZipPath);
    
    // Both exist - we're good
    if (resourcesExists && cacheExists) {
        console.log(`✓ Choreo CLI for version ${version} exists`);
        return true;
    }
    
    // Resources exists but cache doesn't (e.g., after rush purge)
    if (resourcesExists && !cacheExists) {
        console.log(`✓ CLI zip exists in resources/choreo-cli`);
        console.log(`Restoring cache (common/temp) from resources...`);
        ensureDirectoryExists(CLI_CACHE_DIR);
        fs.copyFileSync(resourcesZipPath, cacheZipPath);
        console.log(`✓ Restored cache from resources/choreo-cli`);
        return true;
    }
    
    // Cache exists but resources doesn't
    if (!resourcesExists && cacheExists) {
        console.log(`Found CLI zip in cache (common/temp), copying to resources/choreo-cli...`);
        ensureDirectoryExists(CLI_RESOURCES_DIR);
        fs.copyFileSync(cacheZipPath, resourcesZipPath);
        console.log(`✓ Copied CLI zip to resources/choreo-cli`);
        return true;
    }
    
    // Neither exists
    console.log(`CLI zip for version ${version} not found in resources or cache`);
    return false;
}

function cleanupOldFilesInDirectory(directory, currentVersion) {
    if (!fs.existsSync(directory)) {
        return;
    }

    const currentZipName = getCombinedZipFileName(currentVersion);
    const entries = fs.readdirSync(directory);
    
    for (const entry of entries) {
        if (entry === currentZipName) {
            continue; // Skip the current version
        }

        const entryPath = path.join(directory, entry);
        const stats = fs.statSync(entryPath);
        
        console.log(`Removing old ${stats.isDirectory() ? 'directory' : 'file'}: ${entry} from ${path.basename(directory)}`);
        
        if (stats.isDirectory()) {
            fs.rmSync(entryPath, { recursive: true, force: true });
        } else {
            fs.unlinkSync(entryPath);
        }
    }
}

function cleanupOldFiles(currentVersion) {
    // Clean up old files from both locations
    cleanupOldFilesInDirectory(CLI_RESOURCES_DIR, currentVersion);
    cleanupOldFilesInDirectory(CLI_CACHE_DIR, currentVersion);
}

// ============================================================================
// GitHub API Utilities
// ============================================================================

function getAuthHeaders() {
    const token = process.env.CHOREO_BOT_TOKEN || process.env.GITHUB_TOKEN;
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function logRateLimitError(headers) {
    console.error('HTTP 403: Forbidden. This may be due to GitHub API rate limiting.');
    console.error('Set GITHUB_TOKEN environment variable with a personal access token to increase rate limits.');

    if (headers['x-ratelimit-limit']) {
        console.error(`Rate limit: ${headers['x-ratelimit-remaining']}/${headers['x-ratelimit-limit']}`);
        const resetTime = new Date(headers['x-ratelimit-reset'] * 1000).toLocaleString();
        console.error(`Rate limit resets at: ${resetTime}`);
    }
}

function httpsRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            ...options,
            headers: {
                'User-Agent': 'Choreo-CLI-Downloader',
                'Accept': 'application/vnd.github.v3+json',
                ...getAuthHeaders(),
                ...options.headers
            }
        }, (res) => {
            if (res.statusCode === 403) {
                logRateLimitError(res.headers);
            }

            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ data, statusCode: res.statusCode, headers: res.headers });
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function getReleaseByTag(tag) {
    console.log(`Fetching release information for tag: ${tag}...`);
    const response = await httpsRequest(`${GITHUB_REPO_URL}/releases/tags/${tag}`);
    return JSON.parse(response.data);
}

// ============================================================================
// File Download
// ============================================================================

function isRedirect(statusCode) {
    return statusCode >= 300 && statusCode < 400;
}

function isSuccess(statusCode) {
    return statusCode >= 200 && statusCode < 300;
}

function downloadFile(url, outputPath, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(outputPath);

        const cleanupAndReject = (error) => {
            file.close();
            deleteFile(outputPath);
            reject(error);
        };

        const makeRequest = (requestUrl, redirectCount = 0) => {
            const req = https.request(requestUrl, {
                headers: {
                    'User-Agent': 'Choreo-CLI-Downloader',
                    'Accept': 'application/octet-stream'
                }
            }, (res) => {
                if (isRedirect(res.statusCode) && res.headers.location) {
                    if (redirectCount >= maxRedirects) {
                        cleanupAndReject(new Error(`Too many redirects (${redirectCount})`));
                        return;
                    }
                    makeRequest(res.headers.location, redirectCount + 1);
                    return;
                }

                if (isSuccess(res.statusCode)) {
                    res.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        resolve();
                    });
                    file.on('error', cleanupAndReject);
                } else {
                    cleanupAndReject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                }
            });

            req.on('error', cleanupAndReject);
            req.end();
        };

        makeRequest(url);
    });
}

async function downloadAsset(asset, tempDir) {
    const finalPath = path.join(tempDir, asset.name);
    const tempPath = `${finalPath}.tmp`;
    const downloadUrl = `${GITHUB_REPO_URL}/releases/assets/${asset.id}`;
    
    console.log(`Downloading ${asset.name}...`);
    
    try {
        await downloadFile(downloadUrl, tempPath);
        fs.renameSync(tempPath, finalPath); // Atomic operation
        
        const fileSize = getFileSize(finalPath);
        console.log(`✓ Downloaded ${asset.name} (${fileSize} bytes)`);
    } catch (error) {
        deleteFile(tempPath);
        console.error(`✗ Failed to download ${asset.name}: ${error.message}`);
        throw error;
    }
}

function getZipCommand(files, outputZipPath, tempDir) {
    const isWindows = os.platform() === 'win32';
    
    if (isWindows) {
        const filesArg = files.map(f => `'${f}'`).join(',');
        return {
            command: `powershell.exe -Command "Compress-Archive -Path ${filesArg} -DestinationPath '${outputZipPath}' -Force"`,
            cwd: tempDir
        };
    }
    
    // macOS/Linux
    const filesArg = files.map(f => `'${f}'`).join(' ');
    return {
        command: `zip -q '${outputZipPath}' ${filesArg}`,
        cwd: tempDir
    };
}

function createCombinedZip(tempDir, outputZipPath) {
    console.log('\nCreating Choreo CLI zip file...');
    const files = fs.readdirSync(tempDir).filter(f => !f.startsWith('.'));
    const { command, cwd } = getZipCommand(files, outputZipPath, tempDir);
    
    try {
        execSync(command, { cwd, stdio: 'inherit' });
        
        const zipSize = getFileSize(outputZipPath);
        const relativePath = path.relative(PROJECT_ROOT, outputZipPath);
        console.log(`✓ Created Choreo CLI combined zip: ${relativePath} (${zipSize} bytes)`);
    } catch (error) {
        throw new Error(`Failed to create zip file: ${error.message}`);
    }
}

// ============================================================================
// Main Download Logic
// ============================================================================

async function downloadAllAssets(releaseData, expectedAssetNames, tempDir) {
    const downloadPromises = expectedAssetNames.map(assetName => {
        const asset = releaseData.assets?.find(a => a.name === assetName);
        
        if (!asset) {
            console.warn(`Warning: Choreo CLI Asset not found: ${assetName}`);
            return Promise.resolve();
        }

        return downloadAsset(asset, tempDir);
    });

    await Promise.all(downloadPromises);
}

async function downloadAndCombineCLI(version) {
    const tempDir = createTempDirectory(`choreo-cli-${version}-`);
    
    try {
        // Ensure both directories exist
        ensureDirectoryExists(CLI_RESOURCES_DIR);
        ensureDirectoryExists(CLI_CACHE_DIR);

        const releaseData = await getReleaseByTag(version);
        const expectedAssetNames = getExpectedAssetNames(version);

        await downloadAllAssets(releaseData, expectedAssetNames, tempDir);

        // Create zip in cache directory first
        const cacheZipPath = getCacheZipPath(version);
        createCombinedZip(tempDir, cacheZipPath);
        
        // Copy to resources directory
        const resourcesZipPath = getResourcesZipPath(version);
        console.log('Copying CLI zip to resources/choreo-cli...');
        fs.copyFileSync(cacheZipPath, resourcesZipPath);
        console.log('✓ Copied CLI zip to resources/choreo-cli');
        
    } finally {
        console.log('Cleaning up temporary directory...');
        deleteDirectory(tempDir);
    }
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
    try {
        const cliVersion = getCliVersion();
        
        // Check if combined CLI zip already exists
        if (checkExistingCLI(cliVersion)) {
            console.log('✓ Combined CLI zip is already present');
            process.exit(0);
        }

        console.log(`\nDownloading Choreo CLI version ${cliVersion}...`);

        // Clean up old files before downloading new one
        cleanupOldFiles(cliVersion);

        // Download all CLI assets and combine into single zip
        await downloadAndCombineCLI(cliVersion);

        console.log(`\n✓ Successfully created Choreo CLI zip for version ${cliVersion}`);

    } catch (error) {
        console.error('\n✗ Error:', error.message);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    main();
}

module.exports = { main, checkExistingCLI };