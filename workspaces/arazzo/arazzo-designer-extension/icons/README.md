# Arazzo File Icon Theme

This directory contains the custom icon theme for Arazzo files.

## Structure

- **arazzo-icon-theme.json** - Icon theme definition file
- References the icon at `../assets/arazzo-language.png`

## Icon Theme Configuration

The icon theme maps Arazzo file extensions to the custom green workflow icon:
- `.arazzo.yaml`
- `.arazzo.yml`
- `.arazzo.json`

## Usage

Users can enable the custom icon theme from VS Code settings:

1. **Via Settings UI:**
   - Open Settings (`Cmd+,` / `Ctrl+,`)
   - Search for "File Icon Theme"
   - Select "Arazzo File Icons"

2. **Via Command Palette:**
   - Press `Cmd+Shift+P` / `Ctrl+Shift+P`
   - Type "Preferences: File Icon Theme"
   - Select "Arazzo File Icons"

## Icon Design

The icon (`arazzo-language.png`) features:
- Green circular nodes representing workflow steps
- Connected structure symbolizing API orchestration
- Size: PNG format suitable for VS Code file explorer

## Supported Themes

The icon theme includes configurations for:
- **Default theme** (dark and light modes)
- **Light theme** (explicit light mode configuration)
- **High contrast** (accessibility support)

## Technical Details

The icon theme uses VS Code's file icon theme contribution point:
- Defined in `package.json` under `contributes.iconThemes`
- Maps file extensions and language IDs to icon definitions
- Uses relative paths to reference icon files
- Empty iconPaths for default files/folders allow VS Code to use its defaults

## Modifying the Icon

To update the Arazzo file icon:

1. Replace `../assets/arazzo-language.png` with your new icon
2. Ensure the icon is:
   - PNG format
   - Recommended size: 16x16 or 32x32 pixels
   - Transparent background
3. Reload VS Code to see changes

## Limitations

**Note:** This icon theme approach in VS Code works by providing a complete icon theme. While we only define icons for Arazzo files and leave others empty (so VS Code uses its defaults), users must explicitly select this theme.

An alternative approach for automatic icons without user action would require:
- Contributing to VS Code's built-in icon themes (not possible via extension)
- Using a different icon contribution mechanism (currently not available in VS Code API)

Therefore, this is an opt-in feature that users enable manually.
