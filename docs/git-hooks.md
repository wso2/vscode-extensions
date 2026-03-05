# Git Pre-Commit Hooks

This repository uses [Husky](https://typicode.github.io/husky/) to manage git hooks and enforce code quality standards before commits.

## Current Checks

### Strict Version Validation

All `package.json` files must use **strict versioning** for npm dependencies. This means:

- ❌ **Not allowed**: `^1.2.3`, `~1.2.3` (caret and tilde prefixes)
- ✅ **Allowed**: `1.2.3` (exact version)

Special version formats that are allowed:
- `workspace:*`, `workspace:^`, `workspace:~` (pnpm workspace protocol)
- `file:../path/to/package` (local file dependencies)
- `link:../path/to/package` (symlinked packages)
- `npm:package@version` (npm alias)
- `git+https://...` (git URLs)
- `http://...`, `https://...` (tarball URLs)
- `*`, `latest` (special version keywords)

### How It Works

When you attempt to commit changes that include modifications to any `package.json` file, the pre-commit hook will:

1. Identify all staged `package.json` files
2. Validate that all dependency versions use strict versioning
3. Block the commit if non-strict versions are found
4. Display which files and dependencies need to be fixed

## Example

### ❌ This will be blocked:

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "lodash": "~4.17.21"
  }
}
```

### ✅ This will pass:

```json
{
  "dependencies": {
    "express": "4.18.0",
    "lodash": "4.17.21"
  }
}
```

## Manual Validation

You can manually run the validation script at any time:

```bash
node common/scripts/validate-package-versions.js path/to/package.json
```

Or validate multiple files:

```bash
node common/scripts/validate-package-versions.js workspaces/*/package.json
```

## Bypassing the Hook (Not Recommended)

In exceptional circumstances, you can bypass the pre-commit hook:

```bash
git commit --no-verify -m "your message"
```

**Warning**: Bypassing hooks should only be done when absolutely necessary and with good reason.

## Setup for Contributors

The hooks are automatically installed when you run:

```bash
pnpm install
```

This triggers the `prepare` script which initializes Husky.

## Troubleshooting

### Hook not running

If the pre-commit hook isn't running:

1. Ensure you're in a git repository: `git status`
2. Check that Husky is installed: `ls .husky`
3. Reinstall hooks: `pnpm run prepare`
4. Verify git hooks are enabled: `git config core.hooksPath`

### Permission issues

If you get permission errors:

```bash
chmod +x .husky/pre-commit
chmod +x common/scripts/validate-package-versions.js
```

## Adding More Checks

To add additional pre-commit checks:

1. Edit `.husky/pre-commit`
2. Add your validation logic
3. Ensure the script exits with code 1 on failure, 0 on success

Example:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Existing validation...

# Add new validation
echo "🔍 Running lint checks..."
pnpm run lint
if [ $? -ne 0 ]; then
  echo "❌ Lint failed"
  exit 1
fi
```

## Related Tools

- [Husky](https://typicode.github.io/husky/) - Git hooks management
- [Rush](https://rushjs.io/) - Monorepo build orchestrator
- [pnpm](https://pnpm.io/) - Package manager
