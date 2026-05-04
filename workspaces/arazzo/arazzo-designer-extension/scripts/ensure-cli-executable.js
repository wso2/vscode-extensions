/**
 * Ensures shipped Go CLI binaries under cli/ are executable (0o755).
 * Git checkouts and some copy steps leave Unix ELF/Mach-O files as 0644,
 * which causes spawn EACCES when the VSIX is installed.
 */
const fs = require('fs');
const path = require('path');

const cliDir = path.join(__dirname, '..', 'cli');

if (!fs.existsSync(cliDir)) {
    console.error(`CLI directory not found: ${cliDir}`);
    process.exit(1);
}

const mode = 0o755;
let updatedCount = 0;
for (const name of fs.readdirSync(cliDir)) {
    if (!name.startsWith('arazzo-designer-cli')) {
        continue;
    }
    if (name.endsWith('.exe')) {
        continue;
    }
    const full = path.join(cliDir, name);
    const st = fs.statSync(full);
    if (st.isFile()) {
        fs.chmodSync(full, mode);
        updatedCount++;
    }
}

if (updatedCount === 0) {
    console.error(`No Unix Arazzo Designer CLI binaries found in: ${cliDir}`);
    process.exit(1);
}

console.log(`Ensured executable permissions on ${updatedCount} Arazzo Designer CLI binaries.`);
