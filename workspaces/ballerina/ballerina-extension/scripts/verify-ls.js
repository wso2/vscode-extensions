#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const lsDir = path.join(projectRoot, 'ls');

function getBundledLanguageServerJar() {
    if (!fs.existsSync(lsDir)) {
        return undefined;
    }

    return fs.readdirSync(lsDir).find((file) =>
        /^ballerina-language-server.*\.jar$/.test(file)
    );
}

const jarName = getBundledLanguageServerJar();

if (!jarName) {
    console.error(`Bundled Ballerina language server JAR not found in ${path.relative(projectRoot, lsDir)}.`);
    console.error('Download it before building the VSIX: pnpm run download-ls');
    process.exit(1);
}

console.log(`Using bundled Ballerina language server: ${jarName}`);
