# Changelog

All notable changes to the MCP Inspector extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.7.2] - 2025-11-06

### Fixed
- **Intermittent 404 Errors** — Resolved loading issues by fixing static file path resolution, adding startup delay to prevent race conditions, and implementing automatic retry logic with exponential backoff

## [0.7.1] - 2025-11-05

### Added
- **Initial Beta Release** — First public beta release of MCP Inspector for VSCode
- **MCP Integration** — Integration with [@modelcontextprotocol/inspector](https://github.com/modelcontextprotocol/inspector) v0.17.2
- **Connection Monitoring** — Real-time monitoring for MCP servers and clients with detailed request and response inspection
- **Debugging Interface** — Integrated debugging interface for MCP servers without leaving VSCode
- **Server Configuration** — Pre-populated server configuration support via URL command
- **Dark Theme** — Custom dark theme optimized for long debugging sessions
- **Commands** — Added `Open MCP Inspector` and `Open MCP Inspector with URL` commands
- **Transport Support** — Support for multiple MCP transport types (STDIO, SSE, Streamable HTTP)
- **Theme Sync** — Automatic theme synchronization with VSCode theme changes
