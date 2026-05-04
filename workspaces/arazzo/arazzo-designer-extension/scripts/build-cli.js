/**
 * Builds the Arazzo Designer CLI for all platforms shipped in the VSIX.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const cliProjectDir = path.join(__dirname, '..', '..', 'arazzo-designer-cli');
const outputDir = path.join(__dirname, '..', 'cli');

const targets = [
    ['darwin', 'arm64', 'arazzo-designer-cli-darwin-arm64'],
    ['darwin', 'amd64', 'arazzo-designer-cli-darwin-amd64'],
    ['linux', 'amd64', 'arazzo-designer-cli-linux-amd64'],
    ['linux', 'arm64', 'arazzo-designer-cli-linux-arm64'],
    ['windows', 'amd64', 'arazzo-designer-cli.exe']
];

if (!fs.existsSync(path.join(cliProjectDir, 'go.mod'))) {
    console.error(`Arazzo Designer CLI project not found: ${cliProjectDir}`);
    process.exit(1);
}

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

for (const [goos, goarch, outputName] of targets) {
    const outputPath = path.join(outputDir, outputName);
    console.log(`Building Arazzo Designer CLI for ${goos}/${goarch} -> ${outputName}`);

    const result = spawnSync('go', ['build', '-o', outputPath, './cmd/'], {
        cwd: cliProjectDir,
        env: {
            ...process.env,
            CGO_ENABLED: '0',
            GOOS: goos,
            GOARCH: goarch
        },
        stdio: 'inherit'
    });

    if (result.error) {
        console.error(`Failed to spawn go build: ${result.error.message}`);
        process.exit(1);
    }

    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }

    if (goos !== 'windows') {
        fs.chmodSync(outputPath, 0o755);
    }
}

console.log(`Arazzo Designer CLI binaries are ready at: ${outputDir}`);
