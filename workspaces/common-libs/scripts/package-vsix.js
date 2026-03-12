const { spawnSync } = require('child_process');

const isPreRelease = process.env.isPreRelease === 'true';
const args = ['vsce', 'package', '--no-dependencies'];

if (isPreRelease) {
  args.push('--pre-release');
}
const baseImagesUrlIndex = process.argv.indexOf('--baseImagesUrl');
if (baseImagesUrlIndex !== -1 && process.argv.length > baseImagesUrlIndex + 1) {
  args.push('--baseImagesUrl', process.argv[baseImagesUrlIndex + 1]);
}

console.log(`Packaging VSIX with args: ${args.join(' ')}`);

const result = spawnSync('npx', args, { stdio: 'inherit', shell: true });

if (result.error) {
  console.error(`Failed to spawn vsce: ${result.error.message}`);
  process.exit(1);
}

if (result.status === null) {
  console.error('vsce process was terminated by a signal');
  process.exit(1);
}

process.exit(result.status);
