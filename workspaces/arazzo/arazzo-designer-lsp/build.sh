#!/bin/bash

# Arazzo Language Server Build Script
# Builds the Go language server for multiple platforms and copies to the extension's ls folder

set -e

echo "Building Arazzo Language Server..."

# Extension ls directory
EXTENSION_LS_DIR="../arazzo-designer-extension/ls"

# Create ls directory if it doesn't exist
mkdir -p "$EXTENSION_LS_DIR"

# Clean old binaries
rm -f "$EXTENSION_LS_DIR"/arazzo-language-server-*
rm -f "$EXTENSION_LS_DIR"/arazzo-language-server.exe

# Define all target platforms: GOOS/GOARCH/output-name
TARGETS=(
    "darwin/arm64/arazzo-language-server-darwin-arm64"
    "darwin/amd64/arazzo-language-server-darwin-amd64"
    "linux/amd64/arazzo-language-server-linux-amd64"
    "linux/arm64/arazzo-language-server-linux-arm64"
    "windows/amd64/arazzo-language-server.exe"
)

for target in "${TARGETS[@]}"; do
    IFS='/' read -r goos goarch output_name <<< "$target"
    
    echo "Building for ${goos}/${goarch} -> ${output_name}..."
    GOOS=$goos GOARCH=$goarch go build -o "$output_name" main.go
    
    if [ $? -eq 0 ]; then
        cp "$output_name" "$EXTENSION_LS_DIR/"
        chmod +x "$EXTENSION_LS_DIR/$output_name"
        echo "✓ Built and copied ${output_name}"
        # Clean up local build artifact
        rm -f "$output_name"
    else
        echo "⚠ Failed to build for ${goos}/${goarch}"
    fi
done

# Display file info
echo ""
echo "Language Server Binaries in extension ls/ folder:"
ls -lh "$EXTENSION_LS_DIR/"

echo ""
echo "✓ Build complete! Language servers are ready at:"
echo "  $EXTENSION_LS_DIR/"
echo ""
echo "Available binaries:"
echo "  - arazzo-language-server-darwin-arm64  (macOS Apple Silicon)"
echo "  - arazzo-language-server-darwin-amd64  (macOS Intel)"
echo "  - arazzo-language-server-linux-amd64   (Ubuntu/Linux x86_64)"
echo "  - arazzo-language-server-linux-arm64   (Linux ARM64)"
echo "  - arazzo-language-server.exe           (Windows)"
