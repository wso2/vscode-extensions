# Setting Up Custom Arazzo File Icons

This guide helps you enable and test the custom Arazzo file icons.

## Quick Setup

### 1. Enable the Icon Theme

**Option A: Via Settings**
```
1. Press Cmd+, (Mac) or Ctrl+, (Windows/Linux)
2. Type "file icon theme" in search
3. Click on "File Icon Theme" dropdown
4. Select "Arazzo File Icons"
```

**Option B: Via Command Palette**
```
1. Press Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows/Linux)
2. Type "Preferences: File Icon Theme"
3. Select "Arazzo File Icons"
```

### 2. Verify It's Working

Create a test file to see the icon:

**Test File: `test-workflow.arazzo.yaml`**
```yaml
arazzo: 1.0.1
info:
  title: Test Workflow
  version: 1.0.0
workflows:
  - workflowId: test
    steps:
      - stepId: step1
        operationId: testOp
```

Save this file and check the file explorer - it should display the green Arazzo workflow icon!

## What You Should See

### In File Explorer
- `.arazzo.yaml` files → Green workflow icon
- `.arazzo.yml` files → Green workflow icon
- `.arazzo.json` files → Green workflow icon
- Other files → VS Code default icons

### Icon Appearance
The Arazzo icon features:
- 🟢 Green circular nodes
- 🔗 Connected structure
- 📊 Workflow visualization pattern

## Troubleshooting

### Icon Not Showing?

1. **Reload VS Code**
   - Press `Cmd+Shift+P` / `Ctrl+Shift+P`
   - Type "Developer: Reload Window"
   - Press Enter

2. **Verify Icon Theme is Selected**
   - Open Settings
   - Search for "file icon theme"
   - Ensure "Arazzo File Icons" is selected

3. **Check File Extension**
   - File must end with `.arazzo.yaml`, `.arazzo.yml`, or `.arazzo.json`
   - Not just `.yaml` - must have `.arazzo` before the extension

4. **Check Icon File Exists**
   ```bash
   ls assets/arazzo-language.png
   ```
   Should show: `-rw-r--r-- ... 8.9K ... arazzo-language.png`

### Switching Back to Default Icons

To revert to your previous icon theme:
1. Open Settings → "File Icon Theme"
2. Select your preferred theme (e.g., "Seti", "Minimal", etc.)

## Technical Details

### File Extension Matching

The icon theme uses these patterns:
- **File Extension**: `*.arazzo.yaml`, `*.arazzo.yml`, `*.arazzo.json`
- **Language ID**: `arazzo-yaml`, `arazzo-json`

Both patterns are checked, so the icon will appear based on:
1. The file name (if it matches the pattern)
2. The detected language mode (if VS Code recognizes it as Arazzo)

### Icon Theme Structure

Location: `icons/arazzo-icon-theme.json`

```json
{
  "iconDefinitions": {
    "arazzo-file": {
      "iconPath": "../assets/arazzo-language.png"
    }
  },
  "fileExtensions": {
    "arazzo.yaml": "arazzo-file",
    "arazzo.yml": "arazzo-file",
    "arazzo.json": "arazzo-file"
  }
}
```

### Theme Modes Supported

- ✅ Dark mode
- ✅ Light mode
- ✅ High contrast mode

All modes use the same icon, which has been designed to work well in any VS Code theme.

## FAQ

### Q: Will this change icons for all my files?
**A:** No. The theme only defines icons for Arazzo files. Other files use VS Code's default icons.

### Q: Can I use this with my existing icon theme?
**A:** The Arazzo icon theme replaces your current theme. However, it only customizes Arazzo files and leaves everything else as default, so the experience should be similar.

### Q: Do I have to enable this?
**A:** No, it's optional. The extension works perfectly without the custom icons. This is just a visual enhancement.

### Q: Can I change the icon?
**A:** Yes! Replace `assets/arazzo-language.png` with your own icon (16x16 or 32x32 PNG recommended).

## Examples

### Before Enabling Icon Theme
```
📄 workflow.arazzo.yaml  (default file icon)
📄 api.arazzo.json       (default file icon)
```

### After Enabling Icon Theme
```
🟢 workflow.arazzo.yaml  (Arazzo workflow icon)
🟢 api.arazzo.json       (Arazzo workflow icon)
```

## Support

If icons aren't working:
1. Check that extension is installed and enabled
2. Verify VS Code version (requires 1.81.0+)
3. Try reloading the window
4. Check extension output logs

For more help, see the main README or file an issue.
