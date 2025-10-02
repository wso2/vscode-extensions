#!/bin/bash

# =============================================================================
# WSO2 BI Extension Code-Server Setup Script
# =============================================================================
# This script automates the setup of code-server with WSO2 BI extensions
# 
# Features:
# 1. Installs code-server if not present
# 2. Prompts for VSIX file paths
# 3. Installs extensions to code-server
# 4. Starts code-server with proper configuration
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
DEFAULT_PORT=8080
DEFAULT_HOST="127.0.0.1"
WORKSPACE_PATH=""

# =============================================================================
# Utility Functions
# =============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}  WSO2 BI Extension Code-Server Setup${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""
}

print_step() {
    echo -e "${YELLOW}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# =============================================================================
# Step 1: Check and Install Code-Server
# =============================================================================

check_and_install_code_server() {
    print_step "Checking if code-server is installed..."
    
    if command -v code-server &> /dev/null; then
        print_success "Code-server is already installed!"
        code-server --version
        return 0
    fi
    
    print_info "Code-server not found. Installing..."
    
    # Detect OS and install accordingly
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            print_info "Installing code-server using Homebrew..."
            brew install code-server
        else
            print_error "Homebrew not found. Please install Homebrew first or install code-server manually."
            echo "Visit: https://github.com/coder/code-server#install"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        print_info "Installing code-server using curl..."
        curl -fsSL https://code-server.dev/install.sh | sh
    else
        print_error "Unsupported operating system: $OSTYPE"
        echo "Please install code-server manually: https://github.com/coder/code-server#install"
        exit 1
    fi
    
    # Verify installation
    if command -v code-server &> /dev/null; then
        print_success "Code-server installed successfully!"
        code-server --version
    else
        print_error "Failed to install code-server!"
        exit 1
    fi
}

# =============================================================================
# Step 2: Get VSIX File Paths
# =============================================================================

get_vsix_paths() {
    print_step "Getting VSIX file paths..."
    
    # Get Ballerina VSIX path
    while true; do
        echo ""
        read -p "Enter the path to the Ballerina VSIX file: " BALLERINA_VSIX_PATH
        
        if [[ -z "$BALLERINA_VSIX_PATH" ]]; then
            print_error "Path cannot be empty!"
            continue
        fi
        
        # Expand tilde to home directory
        BALLERINA_VSIX_PATH="${BALLERINA_VSIX_PATH/#\~/$HOME}"
        
        if [[ -f "$BALLERINA_VSIX_PATH" ]] && [[ "$BALLERINA_VSIX_PATH" == *.vsix ]]; then
            print_success "Ballerina VSIX file found: $BALLERINA_VSIX_PATH"
            break
        else
            print_error "File not found or not a .vsix file: $BALLERINA_VSIX_PATH"
        fi
    done
    
    # Get Ballerina Integrator VSIX path
    while true; do
        echo ""
        read -p "Enter the path to the Ballerina Integrator VSIX file: " BI_VSIX_PATH
        
        if [[ -z "$BI_VSIX_PATH" ]]; then
            print_error "Path cannot be empty!"
            continue
        fi
        
        # Expand tilde to home directory
        BI_VSIX_PATH="${BI_VSIX_PATH/#\~/$HOME}"
        
        if [[ -f "$BI_VSIX_PATH" ]] && [[ "$BI_VSIX_PATH" == *.vsix ]]; then
            print_success "Ballerina Integrator VSIX file found: $BI_VSIX_PATH"
            break
        else
            print_error "File not found or not a .vsix file: $BI_VSIX_PATH"
        fi
    done
}

# =============================================================================
# Step 3: Uninstall Existing Extensions
# =============================================================================

uninstall_existing_extensions() {
    print_step "Uninstalling existing Ballerina and Ballerina Integrator extensions (if any)..."
    code-server --uninstall-extension "ballerina.ballerina" || true
    code-server --uninstall-extension "wso2.ballerina-integrator" || true
    print_success "Uninstallation step completed."
}

# =============================================================================
# Step 4: Install Extensions
# =============================================================================

install_extensions() {
    print_step "Installing extensions to code-server..."
    
    # Install Ballerina extension first (dependency)
    print_info "Installing Ballerina extension..."
    if code-server --install-extension "$BALLERINA_VSIX_PATH"; then
        print_success "Ballerina extension installed successfully!"
    else
        print_error "Failed to install Ballerina extension!"
        exit 1
    fi
    
    # Install Ballerina Integrator extension
    print_info "Installing Ballerina Integrator extension..."
    if code-server --install-extension "$BI_VSIX_PATH"; then
        print_success "Ballerina Integrator extension installed successfully!"
    else
        print_error "Failed to install Ballerina Integrator extension!"
        exit 1
    fi
    
    # List installed extensions for verification
    echo ""
    print_info "Installed extensions:"
    code-server --list-extensions | grep -E "(ballerina|wso2)" || true
}

# =============================================================================
# Step 4: Get Workspace and Server Configuration
# =============================================================================

get_server_config() {
    print_step "Configuring server settings..."
    
    # Get workspace path
    echo ""
    print_info "Current directory: $(pwd)"
    read -p "Enter workspace path (leave empty for current directory): " WORKSPACE_INPUT
    
    if [[ -z "$WORKSPACE_INPUT" ]]; then
        WORKSPACE_PATH="$(pwd)"
        print_info "Using current directory as workspace"
    else
        # Expand tilde to home directory
        WORKSPACE_PATH="${WORKSPACE_INPUT/#\~/$HOME}"
        
        # Convert to absolute path if it's relative
        if [[ ! "$WORKSPACE_PATH" = /* ]]; then
            WORKSPACE_PATH="$(cd "$WORKSPACE_PATH" 2>/dev/null && pwd)" || {
                print_error "Cannot resolve relative path: $WORKSPACE_INPUT"
                print_info "Please use an absolute path or ensure the directory exists"
                exit 1
            }
        fi
        
        print_info "Processed workspace path: $WORKSPACE_PATH"
    fi
    
    # Verify workspace exists
    if [[ ! -d "$WORKSPACE_PATH" ]]; then
        print_error "Workspace directory does not exist: $WORKSPACE_PATH"
        print_info "Please check the path and try again"
        exit 1
    fi
    
    # Get the absolute path to avoid any issues
    WORKSPACE_PATH="$(cd "$WORKSPACE_PATH" && pwd)"
    print_success "Workspace set to: $WORKSPACE_PATH"
    
    # Get port (optional)
    echo ""
    read -p "Enter port number (default: $DEFAULT_PORT): " PORT_INPUT
    if [[ -z "$PORT_INPUT" ]]; then
        SERVER_PORT=$DEFAULT_PORT
    else
        SERVER_PORT=$PORT_INPUT
    fi
    
    # Get host (optional)
    echo ""
    read -p "Enter host address (default: $DEFAULT_HOST): " HOST_INPUT
    if [[ -z "$HOST_INPUT" ]]; then
        SERVER_HOST=$DEFAULT_HOST
    else
        SERVER_HOST=$HOST_INPUT
    fi
    
    print_info "Server will run on: http://$SERVER_HOST:$SERVER_PORT/?folder=$WORKSPACE_PATH"
}

# =============================================================================
# Step 5: Start Code-Server
# =============================================================================

start_code_server() {
    print_step "Starting code-server..."
    
    echo ""
    print_info "Code-server is starting with the following configuration:"
    echo "  - Host: $SERVER_HOST"
    echo "  - Port: $SERVER_PORT"
    echo "  - Workspace: $WORKSPACE_PATH"
    echo ""
    
    # Double-check workspace exists
    if [[ ! -d "$WORKSPACE_PATH" ]]; then
        print_error "CRITICAL: Workspace directory disappeared: $WORKSPACE_PATH"
        exit 1
    fi
    
    print_info "Final workspace verification successful: $(ls -la "$WORKSPACE_PATH" | head -3)"
    
    # Get password from config
    CONFIG_FILE="$HOME/.config/code-server/config.yaml"
    if [[ -f "$CONFIG_FILE" ]]; then
        PASSWORD=$(grep "^password:" "$CONFIG_FILE" | cut -d' ' -f2)
        if [[ -n "$PASSWORD" ]]; then
            print_info "Access URL: http://$SERVER_HOST:$SERVER_PORT/?folder=$WORKSPACE_PATH"
            print_info "Password: $PASSWORD"
        fi
    else
        print_info "Access URL: http://$SERVER_HOST:$SERVER_PORT/?folder=$WORKSPACE_PATH"
    fi
    
    echo ""
    echo -e "${GREEN}🚀 CODE-SERVER READY!${NC}"
    echo -e "${GREEN}===========================================${NC}"
    echo -e "${GREEN}1. Open your web browser${NC}"
    echo -e "${GREEN}2. Navigate to: ${BLUE}http://$SERVER_HOST:$SERVER_PORT/?folder=$WORKSPACE_PATH${NC}"
    if [[ -n "$PASSWORD" ]]; then
        echo -e "${GREEN}3. Enter password: ${YELLOW}$PASSWORD${NC}"
    fi
    echo -e "${GREEN}4. Your WSO2 BI extensions are ready to use!${NC}"
    echo ""
    print_success "Code-server running... Press Ctrl+C to stop."
    echo ""
    
    # Debug: Show the exact command that will be executed
    print_info "Executing command: code-server --bind-addr \"$SERVER_HOST:$SERVER_PORT\" \"$WORKSPACE_PATH\""
    
    # Start code-server
    exec code-server --bind-addr "$SERVER_HOST:$SERVER_PORT" "$WORKSPACE_PATH"
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    print_header
    
    # Step 1: Check and install code-server
    check_and_install_code_server
    
    # Step 2: Get VSIX file paths
    get_vsix_paths

    # Step 3: Uninstall existing extensions to avoid conflicts
    uninstall_existing_extensions

    # Step 4: Install extensions
    install_extensions

    # Step 5: Get server configuration
    get_server_config

    # Step 6: Start code-server
    start_code_server
}

# =============================================================================
# Script Entry Point
# =============================================================================

# Handle Ctrl+C gracefully
trap 'echo -e "\n${YELLOW}Script interrupted by user${NC}"; exit 0' INT

# Check if running as source
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi