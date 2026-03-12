/**
 * Shared type definitions for the extension
 */

/**
 * MCP transport types supported by the inspector
 */
export type MCPTransport = 'stdio' | 'sse' | 'streamable-http';

/**
 * Parameters for opening the inspector with pre-populated server configuration
 */
export interface ServerParams {
  /** Server URL for SSE/HTTP transport */
  serverUrl?: string;
  /** Command to execute for stdio transport */
  serverCommand?: string;
  /** Arguments for the server command */
  serverArgs?: string;
  /** Transport protocol to use */
  transport?: MCPTransport;
}

/**
 * Process spawn configuration
 */
export interface ProcessSpawnConfig {
  scriptPath: string;
  env: NodeJS.ProcessEnv;
  cwd: string;
  readyMessage: string;
  errorPrefix: string;
  portInUseError: (port: string) => string;
  timeoutError: string;
}
