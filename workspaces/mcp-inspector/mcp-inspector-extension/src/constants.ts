/**
 * Extension constants
 */

export const EXTENSION_ID = 'mcpInspector';
export const EXTENSION_NAME = 'MCP Inspector';

/**
 * Command IDs
 */
export const Commands = {
  OPEN_INSPECTOR: `${EXTENSION_ID}.openInspector`,
  OPEN_INSPECTOR_WITH_URL: `${EXTENSION_ID}.openInspectorWithUrl`,
} as const;

/**
 * View IDs
 */
export const Views = {
  INSPECTOR_VIEW: `${EXTENSION_ID}.inspectorView`,
} as const;

/**
 * Configuration keys
 */
export const Configuration = {
  SECTION: EXTENSION_ID,
} as const;

/**
 * Webview configuration
 */
export const WebviewConfig = {
  RETAIN_CONTEXT: true,
  ENABLE_SCRIPTS: true,
} as const;

/**
 * MCP Inspector port configuration
 */
export const Ports = {
  SERVER: '6277',
  CLIENT: '6274',
} as const;

/**
 * Process configuration
 */
export const ProcessConfig = {
  STARTUP_TIMEOUT_MS: 30000, // 30 seconds
  SERVER_READY_MESSAGE: 'Proxy server listening',
  CLIENT_READY_MESSAGE: 'MCP Inspector is up and running',
  PORT_IN_USE_MESSAGE: 'PORT IS IN USE',
} as const;

/**
 * Error messages
 */
export const ErrorMessages = {
  SERVER_TIMEOUT: 'Server process failed to start within 30 seconds. Please check the logs and try again.',
  CLIENT_TIMEOUT: 'Client process failed to start within 30 seconds. Please check the logs and try again.',
  SERVER_PORT_IN_USE: (port: string) => `Port ${port} is already in use. Please close any other MCP Inspector instances or processes using this port.`,
  CLIENT_PORT_IN_USE: (port: string) => `Port ${port} is already in use. Please close any other MCP Inspector instances or processes using this port.`,
  ACTIVATION_FAILED: (error: string) => `Failed to activate ${EXTENSION_NAME}: ${error}`,
  STARTUP_FAILED: (error: string) => `Failed to start MCP Inspector: ${error}`,
  PANEL_OPEN_FAILED: (error: string) => `Failed to open ${EXTENSION_NAME}: ${error}`,
} as const;

/**
 * User-facing messages
 */
export const UserMessages = {
  PORT_CONFLICT_DETAILS: `MCP Inspector uses ports ${Ports.CLIENT} (client) and ${Ports.SERVER} (server). Please ensure no other processes are using these ports.`,
} as const;
