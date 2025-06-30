#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const { promisify } = require('util');
const { createWriteStream } = require('fs');
const { pipeline } = require('stream');
const unzipper = require('unzipper');

const pipelineAsync = promisify(pipeline);

const LS_DIR = './ls';
const GITHUB_REPO_URL = 'https://api.github.com/repos/wso2/mi-language-server';
const TEMP_ZIP = path.join(require('os').tmpdir(), `mi-language-server-${Date.now()}.zip`);

function httpsRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            headers: {
                'User-Agent': 'MI-Extension-Download-Script',
                'Accept': 'application/vnd.github.v3+json',
                ...options.headers
            }
        }, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (error) {
                        reject(new Error(`Failed to parse JSON response: ${error.message}`));
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });
        
        req.on('error', reject);
        req.end();
    });
}

function downloadFile(url, destination) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            headers: {
                'User-Agent': 'MI-Extension-Download-Script',
                'Accept': 'application/octet-stream'
            }
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                downloadFile(res.headers.location, destination)
                    .then(resolve)
                    .catch(reject);
                return;
            }
            
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}: Failed to download file`));
                return;
            }
            
            const fileStream = createWriteStream(destination);
            
            pipelineAsync(res, fileStream)
                .then(() => {
                    const stats = fs.statSync(destination);
                    resolve(stats.size);
                })
                .catch(reject);
        });
        
        req.on('error', reject);
        req.end();
    });
}

async function extractZip(zipPath, destDir) {
    return new Promise((resolve, reject) => {
        fs.createReadStream(zipPath)
            .pipe(unzipper.Parse())
            .on('entry', (entry) => {
                const fileName = path.basename(entry.path);
                const type = entry.type;
                
                if (type === 'File' && fileName.endsWith('.jar')) {
                    const outputPath = path.join(destDir, fileName);
                    entry.pipe(fs.createWriteStream(outputPath));
                } else {
                    entry.autodrain();
                }
            })
            .on('close', resolve)
            .on('error', reject);
    });
}

function directoryHasFiles(dirPath) {
    try {
        if (!fs.existsSync(dirPath)) {
            return false;
        }
        const files = fs.readdirSync(dirPath);
        return files.length > 0;
    } catch (error) {
        return false;
    }
}

async function main() {
    try {
        if (directoryHasFiles(LS_DIR)) {
            console.log(`MI language server files already exist in ${LS_DIR}`);
            process.exit(0);
        }

        console.log('Downloading MI language server...');

        if (!fs.existsSync(LS_DIR)) {
            fs.mkdirSync(LS_DIR, { recursive: true });
        }

        console.log('Fetching latest release information...');
        const releaseInfo = await httpsRequest(`${GITHUB_REPO_URL}/releases/latest`);

        const asset = releaseInfo.assets?.find(asset => 
            asset.name && asset.name.includes('mi-language-server-')
        );

        if (!asset) {
            console.error('Error: Could not find language server ZIP asset');
            console.error('Available assets:');
            releaseInfo.assets?.forEach(asset => {
                console.error(`  - ${asset.name}`);
            });
            process.exit(1);
        }

        console.log(`Found asset ID: ${asset.id}`);
        console.log(`Asset name: ${asset.name}`);

        console.log('Downloading language server ZIP...');
        const downloadUrl = `${GITHUB_REPO_URL}/releases/assets/${asset.id}`;
        const fileSize = await downloadFile(downloadUrl, TEMP_ZIP);
        
        console.log(`Successfully downloaded MI language server ZIP`);
        console.log(`File size: ${fileSize} bytes`);

        console.log('Extracting language server files...');
        await extractZip(TEMP_ZIP, LS_DIR);

        if (fs.existsSync(TEMP_ZIP)) {
            fs.unlinkSync(TEMP_ZIP);
        }

        console.log(`Successfully extracted MI language server files to ${LS_DIR}`);
        console.log('Contents:');
        const files = fs.readdirSync(LS_DIR);
        files.forEach(file => {
            const filePath = path.join(LS_DIR, file);
            const stats = fs.statSync(filePath);
            const sizeStr = stats.isDirectory() ? '<DIR>' : `${stats.size} bytes`;
            console.log(`  ${file} - ${sizeStr}`);
        });

    } catch (error) {
        console.error(`Error: ${error.message}`);
        
        if (fs.existsSync(TEMP_ZIP)) {
            try {
                fs.unlinkSync(TEMP_ZIP);
            } catch (cleanupError) {
                console.error(`Failed to clean up temporary file: ${cleanupError.message}`);
            }
        }
        
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { main }; 
