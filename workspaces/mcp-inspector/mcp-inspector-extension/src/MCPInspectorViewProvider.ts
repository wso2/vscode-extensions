import * as vscode from 'vscode';
import { Views, WebviewConfig, Ports } from './constants';
import { Logger } from './utils/logger';
import type { MCPInspectorManager } from './MCPInspectorManager';
import type { ServerParams } from './types';

/**
 * Provides the webview content for the MCP Inspector
 */
export class MCPInspectorViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = Views.INSPECTOR_VIEW;

  constructor(private readonly _inspectorManager?: MCPInspectorManager) {}

  /**
   * Resolves the webview view when it's shown
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    try {
      webviewView.webview.options = {
        enableScripts: WebviewConfig.ENABLE_SCRIPTS,
      };

      webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    } catch (error) {
      Logger.error('Failed to resolve webview view', error);
      throw error;
    }
  }

  /**
   * Get HTML content for the webview
   */
  public getHtmlForWebview(webview: vscode.Webview, serverParams?: ServerParams): string {
    return this._getHtmlForWebview(webview, serverParams);
  }

  /**
   * Get loading HTML while processes are starting
   */
  public getLoadingHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCP Inspector - Loading</title>
  <style>
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: var(--vscode-editor-background);
    }
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      gap: 20px;
    }
    .spinner {
      width: 50px;
      height: 50px;
      border: 5px solid var(--vscode-button-background);
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .status {
      font-size: 16px;
      opacity: 0.8;
    }
  </style>
</head>
<body>
  <div class="loading-container">
    <div class="spinner"></div>
    <div class="status">Starting MCP Inspector...</div>
    <div style="font-size: 12px; opacity: 0.6;">This may take a few seconds</div>
  </div>
</body>
</html>`;
  }

  /**
   * Get error HTML when startup fails
   */
  public getErrorHtml(errorMessage: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCP Inspector - Error</title>
  <style>
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: var(--vscode-editor-background);
    }
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      gap: 16px;
      padding: 20px;
      text-align: center;
    }
    .error-icon {
      font-size: 48px;
      color: var(--vscode-errorForeground);
    }
    .error-message {
      font-size: 14px;
      max-width: 500px;
    }
  </style>
</head>
<body>
  <div class="error-container">
    <div class="error-icon">⚠️</div>
    <div style="font-size: 18px;">Failed to Start MCP Inspector</div>
    <div class="error-message">${errorMessage}</div>
    <div style="font-size: 12px; opacity: 0.6;">Try closing and reopening the panel</div>
  </div>
</body>
</html>`;
  }

  /**
   * Generate HTML for the webview
   */
  private _getHtmlForWebview(_webview: vscode.Webview, serverParams?: ServerParams): string {
    // Get auth token from inspector manager
    const authToken = this._inspectorManager?.getAuthToken() || '';

    // Build URL with auth token and optional server parameters
    const urlParams = new URLSearchParams({ MCP_PROXY_AUTH_TOKEN: authToken });
    if (serverParams?.serverUrl) {
      urlParams.set('serverUrl', serverParams.serverUrl);
    }
    if (serverParams?.serverCommand) {
      urlParams.set('serverCommand', serverParams.serverCommand);
    }
    if (serverParams?.serverArgs) {
      urlParams.set('serverArgs', serverParams.serverArgs);
    }
    if (serverParams?.transport) {
      urlParams.set('transport', serverParams.transport);
    }

    const inspectorUrl = `http://localhost:${Ports.CLIENT}/?${urlParams.toString()}`;

    // CSP policy that allows iframe to localhost
    const csp = [
      `default-src 'none'`,
      `frame-src http://localhost:${Ports.CLIENT}`,
      `style-src 'unsafe-inline'`,
      `script-src 'unsafe-inline'`,
    ].join('; ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <title>MCP Inspector</title>
  <style>
    html, body, iframe {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      border: none;
      overflow: hidden;
      background: var(--vscode-editor-background);
    }
  </style>
</head>
<body>
  <iframe id="inspector-iframe" src="${inspectorUrl}" sandbox="allow-scripts allow-forms allow-same-origin"></iframe>
  <script>
    (function() {
      const iframe = document.getElementById('inspector-iframe');
      let retryCount = 0;
      const maxRetries = 3;

      // Function to send theme colors to iframe
      function sendThemeColors() {

        // Get VSCode theme colors
        const computedStyle = getComputedStyle(document.documentElement);
        const editorBg = computedStyle.getPropertyValue('--vscode-editor-background').trim();
        const editorFg = computedStyle.getPropertyValue('--vscode-editor-foreground').trim();
        const buttonBg = computedStyle.getPropertyValue('--vscode-button-secondaryBackground').trim();
        const border = computedStyle.getPropertyValue('--vscode-activityBar-border').trim();
        const errorBg = computedStyle.getPropertyValue('--vscode-inputValidation-errorBackground').trim();
        const activityBarBg = computedStyle.getPropertyValue('--vscode-activityBar-background').trim();
        const inactiveTabBg = computedStyle.getPropertyValue('--vscode-tab-inactiveBackground').trim();

        // Send all theme colors (in same order as inject-theme.js uses them)
        const themeColors = {
          // Main colors
          background: editorBg,
          foreground: editorFg,

          // Card colors
          card: editorBg,
          cardForeground: editorFg,

          // Popover colors
          popover: editorBg,
          popoverForeground: editorFg,

          // Primary colors
          primary: activityBarBg,
          primaryForeground: inactiveTabBg,

          // Secondary colors
          secondary: inactiveTabBg,
          secondaryForeground: activityBarBg,

          // Muted colors
          muted: inactiveTabBg,
          mutedForeground: activityBarBg,

          // Accent colors
          accent: inactiveTabBg,
          accentForeground: activityBarBg,

          // Destructive colors
          destructive: errorBg,
          destructiveForeground: inactiveTabBg,

          // Input/Border/Ring
          border: border,
          input: border,
          ring: editorFg,

          // Body styles
          bodyBg: editorBg,
          bodyColor: editorFg
        };


        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            type: 'vscode-theme-colors',
            colors: themeColors
          }, '*');
        }
      }

      // Handle iframe errors and implement retry logic
      iframe.onerror = function(error) {
        console.error('MCP Inspector iframe error:', error);
        if (retryCount < maxRetries) {
          retryCount++;
          console.log('Retrying to load iframe... Attempt ' + retryCount + '/' + maxRetries);
          setTimeout(function() {
            iframe.src = iframe.src; // Reload the iframe
          }, 1000 * retryCount); // Exponential backoff
        }
      };

      // Wait for iframe to load then send theme colors immediately
      iframe.onload = function() {
        retryCount = 0; // Reset retry count on successful load
        // Send immediately and retry after a short delay to ensure it's applied
        sendThemeColors();
        setTimeout(sendThemeColors, 50);
        setTimeout(sendThemeColors, 200);
      };

      // Listen for VSCode theme changes
      const observer = new MutationObserver((mutations) => {
        sendThemeColors();
      });

      // Observe changes to the document element's style attribute
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['style', 'class']
      });

    })();
  </script>
</body>
</html>`;
  }
}
