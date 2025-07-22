#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

const PROJECT_ROOT = path.join(__dirname, '..');
const LS_DIR = path.join(PROJECT_ROOT, 'ls');
const GITHUB_REPO_URL = 'https://api.github.com/repos/wso2/si-language-server';

const args = process.argv.slice(2);
const usePrerelease = args.includes('--prerelease') || process.env.isPreRelease === 'true';

const LS_JARS = [
    'io.siddhi.langserver.core',
    'io.siddhi.langserver.launcher',
    'io.siddhi.langserver.runner'
];

function checkExistingJars() {
    try {
        if (!fs.existsSync(LS_DIR)) {
            return false;
        }

        const files = fs.readdirSync(LS_DIR);
        
        const existingJars = LS_JARS.filter(jarName => 
            files.some(file => file.includes(jarName) && file.endsWith('.jar'))
        );

        if (existingJars.length === LS_JARS.length) {
            console.log(`All Siddhi language server JARs already exist in ${path.relative(PROJECT_ROOT, LS_DIR)}`);
            return true;
        }

        if (existingJars.length > 0) {
            console.log(`Found ${existingJars.length}/${LS_JARS.length} Siddhi language server JARs. Re-downloading all...`);
        }

        return false;
    } catch (error) {
        console.error('Error checking existing JAR files:', error.message);
        return false;
    }
}

function httpsRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const authHeader = {};
        if (process.env.CHOREO_BOT_TOKEN) {
            authHeader['Authorization'] = `Bearer ${process.env.CHOREO_BOT_TOKEN}`;
        } else if (process.env.GITHUB_TOKEN) {
            authHeader['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
        }

        const req = https.request(url, {
            ...options,
            headers: {
                'User-Agent': 'SI-LS-Downloader',
                'Accept': 'application/vnd.github.v3+json',
                ...authHeader,
                ...options.headers
            }
        }, (res) => {
            // Handle HTTP 403 errors specifically
            if (res.statusCode === 403) {
                console.error('HTTP 403: Forbidden. This may be due to GitHub API rate limiting.');
                console.error('Set GITHUB_TOKEN environment variable with a personal access token to increase rate limits.');

                // Log rate limit info if available
                if (res.headers['x-ratelimit-limit']) {
                    console.error(`Rate limit: ${res.headers['x-ratelimit-remaining']}/${res.headers['x-ratelimit-limit']}`);
                    console.error(`Rate limit resets at: ${new Date(res.headers['x-ratelimit-reset'] * 1000).toLocaleString()}`);
                }
            }
            let data = '';

            res.on('data', chunk => {
                data += chunk;
            });

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

function downloadFile(url, outputPath, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(outputPath);

        const makeRequest = (requestUrl, redirectCount = 0) => {
            const req = https.request(requestUrl, {
                headers: {
                    'User-Agent': 'SI-LS-Downloader',
                    'Accept': 'application/octet-stream'
                }
            }, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    if (redirectCount >= maxRedirects) {
                        file.close();
                        fs.unlink(outputPath, () => { });
                        reject(new Error(`Too many redirects (${redirectCount})`));
                        return;
                    }

                    console.log(`Following redirect to: ${res.headers.location}`);
                    makeRequest(res.headers.location, redirectCount + 1);
                    return;
                }

                if (res.statusCode >= 200 && res.statusCode < 300) {
                    res.pipe(file);

                    file.on('finish', () => {
                        file.close();
                        resolve();
                    });

                    file.on('error', (err) => {
                        fs.unlink(outputPath, () => { });
                        reject(err);
                    });
                } else {
                    file.close();
                    fs.unlink(outputPath, () => { });
                    reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                }
            });

            req.on('error', (err) => {
                file.close();
                fs.unlink(outputPath, () => { });
                reject(err);
            });

            req.end();
        };

        makeRequest(url);
    });
}

function getFileSize(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats.size;
    } catch (error) {
        return 'unknown';
    }
}

async function getLatestRelease(usePrerelease) {
    if (usePrerelease) {
        // Get all releases and find the latest prerelease
        const releasesResponse = await httpsRequest(`${GITHUB_REPO_URL}/releases`);
        let releases;
        try {
            releases = JSON.parse(releasesResponse.data);
        } catch (error) {
            throw new Error('Failed to parse releases information JSON');
        }
        // Sort releases by published_at date in descending order and find the latest prerelease
        const prerelease = releases
            .filter(release => release.prerelease)
            .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))[0];

        if (!prerelease) {
            throw new Error('No prerelease found');
        }
        return prerelease;
    } else {
        // Get the latest stable release
        const releaseResponse = await httpsRequest(`${GITHUB_REPO_URL}/releases/latest`);
        try {
            return JSON.parse(releaseResponse.data);
        } catch (error) {
            throw new Error('Failed to parse release information JSON');
        }
    }
}

async function downloadSiddhiJars(releaseData) {
    const downloadedJars = [];
    
    for (const expectedJar of LS_JARS) {
        console.log(`Looking for ${expectedJar}...`);
        
        // Find the JAR asset (may have version variations)
        const jarAsset = releaseData.assets?.find(asset => {
            const assetName = asset.name.toLowerCase();
            const expectedName = expectedJar.toLowerCase();
            
            // Check for exact match or partial match (version may differ)
            return assetName === expectedName || 
                   (assetName.includes(expectedJar.split('-')[0]) && 
                    assetName.includes('langserver') && 
                    assetName.endsWith('.jar'));
        });

        if (!jarAsset) {
            console.error(`Error: Could not find ${expectedJar} in release assets`);
            continue;
        }

        console.log(`Found ${jarAsset.name} (Asset ID: ${jarAsset.id})`);
        
        const lsJarPath = path.join(LS_DIR, jarAsset.name);
        const downloadUrl = `${GITHUB_REPO_URL}/releases/assets/${jarAsset.id}`;

        try {
            console.log(`Downloading ${jarAsset.name}...`);
            await downloadFile(downloadUrl, lsJarPath);

            if (fs.existsSync(lsJarPath)) {
                const fileSize = getFileSize(lsJarPath);
                if (fileSize > 0) {
                    const relativePath = path.relative(PROJECT_ROOT, lsJarPath);
                    console.log(`✓ Successfully downloaded ${jarAsset.name} to ${relativePath}`);
                    console.log(`  File size: ${fileSize} bytes`);
                    downloadedJars.push(jarAsset.name);
                } else {
                    throw new Error('Downloaded file is empty');
                }
            } else {
                throw new Error('Downloaded file does not exist');
            }
        } catch (error) {
            console.error(`✗ Failed to download ${jarAsset.name}: ${error.message}`);
        }
    }
    
    return downloadedJars;
}

async function main() {
    try {
        if (checkExistingJars()) {
            process.exit(0);
        }

        console.log(`Downloading WSO2 Integrator: SI language server JARs${usePrerelease ? ' (prerelease)' : ''}...`);

        if (!fs.existsSync(LS_DIR)) {
            fs.mkdirSync(LS_DIR, { recursive: true });
        }

        console.log('Fetching release information...');
        const releaseData = await getLatestRelease(usePrerelease);

        console.log(`Found release: ${releaseData.name || releaseData.tag_name}`);
        console.log(`Release date: ${releaseData.published_at}`);
        console.log(`Available assets: ${releaseData.assets?.length || 0}`);

        if (!releaseData.assets || releaseData.assets.length === 0) {
            console.error('Error: No assets found in the release');
            process.exit(1);
        }

        // List all available assets for debugging
        console.log('\nAvailable assets:');
        releaseData.assets.forEach(asset => console.log(`  - ${asset.name}`));
        console.log('');

        const downloadedJars = await downloadSiddhiJars(releaseData);

        if (downloadedJars.length === 0) {
            console.error('Error: No Siddhi language server JARs were downloaded');
            process.exit(1);
        }

        console.log(`\n✓ Successfully downloaded ${downloadedJars.length}/${LS_JARS.length} Siddhi language server JARs:`);
        downloadedJars.forEach(jar => console.log(`  - ${jar}`));

        if (downloadedJars.length < LS_JARS.length) {
            console.log(`\n⚠ Warning: Only ${downloadedJars.length} out of ${LS_JARS.length} expected JARs were downloaded`);
        }

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { main, checkExistingJars };
