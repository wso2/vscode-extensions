# Changelog

All notable changes to the MCP Inspector extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.7.4] - 2026-04-30

### Fixed
- **Theme and Accessibility Improvements** — Fixed MCP Inspector styling issues by improving VS Code theme color mapping, synchronizing dark/high-contrast mode behavior, and addressing text visibility problems in the Try It editor
- **Clipboard Support** — Fixed copy, cut, and paste in the MCP Inspector by bridging clipboard access through the extension host so cross-origin iframe inputs and the Server Files / Server Entries copy buttons work reliably

## [0.7.3] - 2026-04-23

### Fixed
- **Inspector Startup and Cross-Platform Reliability** — Fixed MCP Inspector launch issues by improving process spawning, resolving browser auto-open path handling (including Windows-specific build/runtime path mismatches), and tightening client loading behavior

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
