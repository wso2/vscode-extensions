# build-binaries.ps1

Write-Host "Starting cross-compilation for Arazzo Go Runner..." -ForegroundColor Cyan

# Ensure the local cli folder exists
if (-Not (Test-Path "cli")) {
    New-Item -ItemType Directory -Path "cli" | Out-Null
}

# --- 1. WINDOWS (x64) ---
Write-Host "Building for Windows (x64)..."
$env:GOOS='windows'
$env:GOARCH='amd64'
go build -o cli/arazzo-designer-cli.exe ./cmd/

# --- 2. MACOS (Intel) ---
Write-Host "Building for macOS (Intel amd64)..."
$env:GOOS='darwin'
$env:GOARCH='amd64'
go build -o cli/arazzo-designer-cli-darwin-amd64 ./cmd/

# --- 3. MACOS (Apple Silicon) ---
Write-Host "Building for macOS (Apple Silicon arm64)..."
$env:GOOS='darwin'
$env:GOARCH='arm64'
go build -o cli/arazzo-designer-cli-darwin-arm64 ./cmd/

# --- 4. LINUX (x64) ---
Write-Host "Building for Linux (x64 amd64)..."
$env:GOOS='linux'
$env:GOARCH='amd64'
go build -o cli/arazzo-designer-cli-linux-amd64 ./cmd/

# --- 5. LINUX (ARM64) ---
Write-Host "Building for Linux (ARM64)..."
$env:GOOS='linux'
$env:GOARCH='arm64'
go build -o cli/arazzo-designer-cli-linux-arm64 ./cmd/

# --- RESET ENVIRONMENT ---
Write-Host "Resetting environment variables back to Windows..."
$env:GOOS='windows'
$env:GOARCH='amd64'

# --- COPY TO EXTENSION FOLDER ---
$destination = "..\arazzo-designer-extension\cli"

Write-Host "Copying binaries to the extension folder ($destination)..."
if (-Not (Test-Path $destination)) {
    New-Item -ItemType Directory -Path $destination | Out-Null
}

Copy-Item -Path "cli\*" -Destination $destination -Force

Write-Host "All done! Binaries are built and copied." -ForegroundColor Green