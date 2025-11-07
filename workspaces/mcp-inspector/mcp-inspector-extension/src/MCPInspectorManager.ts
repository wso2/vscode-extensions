import * as vscode from 'vscode';
import * as childProcess from 'child_process';
import { randomBytes } from 'crypto';
import { Logger } from './utils/logger';
import { Ports, ProcessConfig, ErrorMessages } from './constants';
import type { ProcessSpawnConfig } from './types';

/**
 * Manages the MCP Inspector server and client processes
 */
export class MCPInspectorManager {
  private authToken: string | null = null;
  private isRunning = false;
  private serverProcess: childProcess.ChildProcess | null = null;
  private clientProcess: childProcess.ChildProcess | null = null;

  constructor(private readonly extensionUri: vscode.Uri) {}

  /**
   * Get the path to the bundled MCP Inspector files
   * Uses webpack-bundled files from out/inspector/
   */
  private getInspectorPath(): vscode.Uri {
    return vscode.Uri.joinPath(this.extensionUri, 'out', 'inspector');
  }

  /**
   * Generate a secure authentication token for the MCP proxy server
   */
  private generateAuthToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Get the current auth token, generating one if it doesn't exist
   */
  public getAuthToken(): string {
    if (!this.authToken) {
      this.authToken = this.generateAuthToken();
    }
    return this.authToken;
  }

  /**
   * Check if the inspector is currently running
   */
  public isInspectorRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Generic method to spawn and monitor a child process
   * Follows DRY principle by eliminating duplicated spawn logic
   */
  private async spawnProcess(
    config: ProcessSpawnConfig,
    processRef: 'serverProcess' | 'clientProcess'
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Spawn the process
      const process = childProcess.spawn('node', [config.scriptPath], {
        env: config.env,
        cwd: config.cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      this[processRef] = process;
      let resolved = false;

      // Set timeout for process startup
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          process.kill();
          this[processRef] = null;
          if (processRef === 'serverProcess') {
            this.isRunning = false;
          }
          reject(new Error(config.timeoutError));
        }
      }, ProcessConfig.STARTUP_TIMEOUT_MS);

      // Handle stdout - look for ready message
      process.stdout?.on('data', (data: Buffer) => {
        const output = data.toString().trim();

        if (!resolved && output.includes(config.readyMessage)) {
          resolved = true;
          clearTimeout(timeout);
          Logger.info(`${config.errorPrefix} started successfully`);
          resolve();
        }
      });

      // Handle stderr - detect port conflicts
      process.stderr?.on('data', (data: Buffer) => {
        const output = data.toString().trim();

        if (!resolved && output.includes(ProcessConfig.PORT_IN_USE_MESSAGE)) {
          resolved = true;
          clearTimeout(timeout);
          process.kill();
          this[processRef] = null;
          if (processRef === 'serverProcess') {
            this.isRunning = false;
          }
          reject(new Error(config.portInUseError(
            processRef === 'serverProcess' ? Ports.SERVER : Ports.CLIENT
          )));
        } else {
          // Log errors for debugging
          Logger.error(`[${config.errorPrefix}] ${output}`);
        }
      });

      // Handle process exit
      process.on('exit', (code) => {
        this[processRef] = null;
        if (processRef === 'serverProcess') {
          this.isRunning = false;
        }
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(new Error(`${config.errorPrefix} process exited unexpectedly (code: ${code})`));
        }
      });

      // Handle process errors
      process.on('error', (error) => {
        Logger.error(`${config.errorPrefix} process error`, error);
        this[processRef] = null;
        if (processRef === 'serverProcess') {
          this.isRunning = false;
        }
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
  }

  /**
   * Spawn the MCP Inspector proxy server process
   */
  private async startServerProcess(): Promise<void> {
    const inspectorPath = this.getInspectorPath();
    const token = this.getAuthToken();

    const config: ProcessSpawnConfig = {
      scriptPath: vscode.Uri.joinPath(inspectorPath, 'server.js').fsPath,
      env: {
        ...process.env,
        MCP_PROXY_AUTH_TOKEN: token,
        SERVER_PORT: Ports.SERVER,
        CLIENT_PORT: Ports.CLIENT,
      },
      cwd: inspectorPath.fsPath,
      readyMessage: ProcessConfig.SERVER_READY_MESSAGE,
      errorPrefix: 'Server',
      portInUseError: ErrorMessages.SERVER_PORT_IN_USE,
      timeoutError: ErrorMessages.SERVER_TIMEOUT,
    };

    return this.spawnProcess(config, 'serverProcess');
  }

  /**
   * Spawn the MCP Inspector client HTTP server process
   */
  private async startClientProcess(): Promise<void> {
    const inspectorPath = this.getInspectorPath();
    const token = this.getAuthToken();
    const inspectorUrl = `http://localhost:${Ports.CLIENT}/?MCP_PROXY_AUTH_TOKEN=${token}`;

    const config: ProcessSpawnConfig = {
      scriptPath: vscode.Uri.joinPath(inspectorPath, 'client.js').fsPath,
      env: {
        ...process.env,
        CLIENT_PORT: Ports.CLIENT,
        INSPECTOR_URL: inspectorUrl,
        MCP_AUTO_OPEN_ENABLED: 'false',
      },
      cwd: inspectorPath.fsPath,
      readyMessage: ProcessConfig.CLIENT_READY_MESSAGE,
      errorPrefix: 'Client',
      portInUseError: ErrorMessages.CLIENT_PORT_IN_USE,
      timeoutError: ErrorMessages.CLIENT_TIMEOUT,
    };

    return this.spawnProcess(config, 'clientProcess');
  }

  /**
   * Start the MCP Inspector (server and client processes)
   */
  public async start(): Promise<void> {
    try {
      Logger.info('Starting MCP Inspector...');

      // Generate auth token
      this.getAuthToken();

      // Start the server process (waits for ready message)
      await this.startServerProcess();

      // Start the client process (waits for ready message)
      await this.startClientProcess();

      // Add a small delay to ensure the HTTP server is fully ready to accept connections
      // This helps prevent race conditions where the iframe loads before the server is ready
      await new Promise(resolve => setTimeout(resolve, 500));

      this.isRunning = true;
      Logger.info('MCP Inspector started successfully');
    } catch (error) {
      Logger.error('Failed to start MCP Inspector', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the MCP Inspector and clean up resources
   */
  public async stop(): Promise<void> {
    try {
      // Kill client process
      if (this.clientProcess) {
        this.clientProcess.kill('SIGTERM');
        this.clientProcess = null;
      }

      // Kill server process
      if (this.serverProcess) {
        this.serverProcess.kill('SIGTERM');
        this.serverProcess = null;
      }

      this.isRunning = false;
      this.authToken = null;

      Logger.info('MCP Inspector stopped');
    } catch (error) {
      Logger.error('Failed to stop MCP Inspector', error);
      throw error;
    }
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.stop().catch((error) => {
      Logger.error('Error during disposal', error);
    });
  }
}
