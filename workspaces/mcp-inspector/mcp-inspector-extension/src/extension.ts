import * as vscode from 'vscode';
import { MCPInspectorViewProvider } from './MCPInspectorViewProvider';
import { MCPInspectorManager } from './MCPInspectorManager';
import { Commands, WebviewConfig, EXTENSION_NAME, ErrorMessages, UserMessages } from './constants';
import { Logger } from './utils/logger';
import type { ServerParams } from './types';

/**
 * Singleton reference to the current webview panel
 */
let currentPanel: vscode.WebviewPanel | undefined;

/**
 * Singleton reference to the MCP Inspector manager
 */
let inspectorManager: MCPInspectorManager | undefined;

/**
 * Extension activation function
 * Called when the extension is first activated
 */
export function activate(context: vscode.ExtensionContext): void {
  try {
    Logger.info(`${EXTENSION_NAME} activating...`);

    // Create MCP Inspector manager (starts on-demand when panel opens)
    inspectorManager = new MCPInspectorManager(context.extensionUri);
    context.subscriptions.push({
      dispose: () => inspectorManager?.dispose(),
    });

    // Register the webview provider for view container support
    const provider = new MCPInspectorViewProvider(inspectorManager);
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        MCPInspectorViewProvider.viewType,
        provider,
        {
          webviewOptions: {
            retainContextWhenHidden: WebviewConfig.RETAIN_CONTEXT,
          },
        }
      )
    );

    // Register command to open the inspector as a webview panel
    context.subscriptions.push(
      vscode.commands.registerCommand(Commands.OPEN_INSPECTOR, () => {
        openInspectorPanel(context, provider);
      })
    );

    // Register command to open inspector with pre-populated server URL/command
    context.subscriptions.push(
      vscode.commands.registerCommand(
        Commands.OPEN_INSPECTOR_WITH_URL,
        (params: ServerParams) => {
          openInspectorPanel(context, provider, params);
        }
      )
    );

    Logger.info(`${EXTENSION_NAME} activated successfully`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    Logger.error('Failed to activate extension', error);
    vscode.window.showErrorMessage(ErrorMessages.ACTIVATION_FAILED(errorMessage));
  }
}

/**
 * Extension deactivation function
 * Called when the extension is deactivated
 */
export function deactivate(): void {
  try {
    if (currentPanel) {
      currentPanel.dispose();
      currentPanel = undefined;
    }

    Logger.info(`${EXTENSION_NAME} deactivated`);
  } catch (error) {
    console.error('Error during deactivation:', error);
  }
}

/**
 * Open or reveal the inspector webview panel
 */
function openInspectorPanel(
  context: vscode.ExtensionContext,
  provider: MCPInspectorViewProvider,
  serverParams?: ServerParams
): void {
  try {
    const column = vscode.ViewColumn.One;

    if (currentPanel) {
      // Panel already exists, just reveal it
      currentPanel.reveal(column);
      return;
    }

    // Create new webview panel first with loading state
    currentPanel = vscode.window.createWebviewPanel(
      'mcpInspector',
      EXTENSION_NAME,
      column,
      {
        enableScripts: WebviewConfig.ENABLE_SCRIPTS,
        retainContextWhenHidden: WebviewConfig.RETAIN_CONTEXT,
      }
    );

    // Set the panel icon
    currentPanel.iconPath = {
      light: vscode.Uri.joinPath(context.extensionUri, 'resources', 'icon-dark.svg'),
      dark: vscode.Uri.joinPath(context.extensionUri, 'resources', 'icon-light.svg'),
    };

    // Set initial loading content
    currentPanel.webview.html = provider.getLoadingHtml();

    // Start the MCP Inspector processes if not already running
    if (inspectorManager && !inspectorManager.isInspectorRunning()) {
      inspectorManager.start().then(
        () => {
          // Update webview with inspector iframe once processes are ready
          if (currentPanel) {
            currentPanel.webview.html = provider.getHtmlForWebview(currentPanel.webview, serverParams);
          }
        },
        (error) => {
          Logger.error('Failed to start MCP Inspector processes', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          // Check if it's a port conflict error
          if (errorMessage.includes('already in use')) {
            vscode.window.showErrorMessage(
              errorMessage,
              'Show Details',
              'Retry'
            ).then((selection) => {
              if (selection === 'Show Details') {
                vscode.window.showInformationMessage(UserMessages.PORT_CONFLICT_DETAILS, 'OK');
              } else if (selection === 'Retry') {
                // Close the current panel and reopen to retry
                if (currentPanel) {
                  currentPanel.dispose();
                }
                vscode.commands.executeCommand(Commands.OPEN_INSPECTOR);
              }
            });
          } else {
            vscode.window.showErrorMessage(ErrorMessages.STARTUP_FAILED(errorMessage));
          }

          // Show error in webview
          if (currentPanel) {
            currentPanel.webview.html = provider.getErrorHtml(errorMessage);
          }
        }
      );
    } else {
      // Processes already running, show inspector immediately
      currentPanel.webview.html = provider.getHtmlForWebview(currentPanel.webview, serverParams);
    }

    // Handle panel disposal
    currentPanel.onDidDispose(
      () => {
        currentPanel = undefined;

        // Stop the MCP Inspector processes when panel is closed
        if (inspectorManager && inspectorManager.isInspectorRunning()) {
          inspectorManager.stop().catch((error) => {
            Logger.error('Failed to stop MCP Inspector', error);
          });
        }
      },
      null,
      context.subscriptions
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    Logger.error('Failed to open inspector panel', error);
    vscode.window.showErrorMessage(ErrorMessages.PANEL_OPEN_FAILED(errorMessage));
  }
}
