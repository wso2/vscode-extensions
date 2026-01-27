#!/bin/bash

# Arazzo Language Server Build Script
# Builds the Go language server and copies it to the extension's ls folder

set -e

echo "Building Arazzo Language Server..."

# Build the language server binary
go build -o arazzo-language-server main.go

echo "✓ Built arazzo-language-server"

# Copy to extension's ls folder
EXTENSION_LS_DIR="../arazzo-designer-extension/ls"

# Create ls directory if it doesn't exist
mkdir -p "$EXTENSION_LS_DIR"

# Copy the binary
cp arazzo-language-server "$EXTENSION_LS_DIR/"
chmod +x "$EXTENSION_LS_DIR/arazzo-language-server"

echo "✓ Copied to $EXTENSION_LS_DIR/"

# Display file info
echo ""
echo "Language Server Binary:"
ls -lh "$EXTENSION_LS_DIR/arazzo-language-server"

echo ""
echo "✓ Build complete! Language server is ready at:"
echo "  $EXTENSION_LS_DIR/arazzo-language-server"
