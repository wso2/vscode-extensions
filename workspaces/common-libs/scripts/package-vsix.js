const { spawnSync } = require('child_process');

const isPreRelease = process.env.isPreRelease === 'true';
const args = ['vsce', 'package', '--no-dependencies'];

if (isPreRelease) {
  args.push('--pre-release');
}

console.log(`Packaging VSIX with args: ${args.join(' ')}`);

const result = spawnSync('npx', args, { stdio: 'inherit' });
process.exit(result.status);
