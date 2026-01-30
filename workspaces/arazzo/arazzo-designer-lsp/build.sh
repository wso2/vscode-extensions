#!/bin/bash

# Arazzo Language Server Build Script
# Builds the Go language server for multiple platforms and copies to the extension's ls folder

set -e

echo "Building Arazzo Language Server..."

# Extension ls directory
EXTENSION_LS_DIR="../arazzo-designer-extension/ls"

# Create ls directory if it doesn't exist
mkdir -p "$EXTENSION_LS_DIR"

# Build for current platform (default)
echo "Building for current platform..."
go build -o arazzo-language-server main.go
echo "✓ Built arazzo-language-server"

# Copy to extension's ls folder
cp arazzo-language-server "$EXTENSION_LS_DIR/"
chmod +x "$EXTENSION_LS_DIR/arazzo-language-server"
echo "✓ Copied to $EXTENSION_LS_DIR/"

# Cross-compile for Windows (amd64)
echo ""
echo "Cross-compiling for Windows (amd64)..."
GOOS=windows GOARCH=amd64 go build -o arazzo-language-server.exe main.go
if [ $? -eq 0 ]; then
    cp arazzo-language-server.exe "$EXTENSION_LS_DIR/"
    echo "✓ Built and copied arazzo-language-server.exe for Windows"
else
    echo "⚠ Failed to build for Windows"
fi

# Display file info
echo ""
echo "Language Server Binaries:"
ls -lh "$EXTENSION_LS_DIR/"

echo ""
echo "✓ Build complete! Language servers are ready at:"
echo "  $EXTENSION_LS_DIR/"
echo ""
echo "Available binaries:"
echo "  - arazzo-language-server (macOS/Linux)"
echo "  - arazzo-language-server.exe (Windows)"
