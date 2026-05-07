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

      const clipboardBridge = MCPInspectorViewProvider.attachClipboardBridge(webviewView.webview);
      webviewView.onDidDispose(() => clipboardBridge.dispose());
      webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    } catch (error) {
      Logger.error('Failed to resolve webview view', error);
      throw error;
    }
  }

  /**
   * Wires up the parent-webview side of the clipboard paste bridge.
   * The iframe cannot read the system clipboard directly because it's cross-origin
   * to the VS Code webview shell; we relay the request through the extension host.
   */
  public static attachClipboardBridge(webview: vscode.Webview): vscode.Disposable {
    return webview.onDidReceiveMessage(async (msg) => {
      if (!msg) return;
      if (msg.type === 'mcp-inspector-request-clipboard-text') {
        try {
          const text = await vscode.env.clipboard.readText();
          webview.postMessage({
            type: 'mcp-inspector-clipboard-text',
            requestId: msg.requestId,
            text,
          });
        } catch (error) {
          Logger.error('Failed to read clipboard for inspector paste', error);
          webview.postMessage({
            type: 'mcp-inspector-clipboard-text',
            requestId: msg.requestId,
            text: '',
          });
        }
      } else if (msg.type === 'mcp-inspector-request-clipboard-write') {
        try {
          await vscode.env.clipboard.writeText(typeof msg.text === 'string' ? msg.text : '');
          webview.postMessage({
            type: 'mcp-inspector-clipboard-write-result',
            requestId: msg.requestId,
            ok: true,
          });
        } catch (error) {
          Logger.error('Failed to write clipboard for inspector copy', error);
          webview.postMessage({
            type: 'mcp-inspector-clipboard-write-result',
            requestId: msg.requestId,
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    });
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
  <iframe id="inspector-iframe" src="${inspectorUrl}" sandbox="allow-scripts allow-forms allow-same-origin" allow="clipboard-read; clipboard-write"></iframe>
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
        const fg = computedStyle.getPropertyValue('--vscode-foreground').trim() || editorFg;
        const buttonBg = computedStyle.getPropertyValue('--vscode-button-background').trim();
        const buttonFg = computedStyle.getPropertyValue('--vscode-button-foreground').trim() || fg;
        const buttonSecBg = computedStyle.getPropertyValue('--vscode-button-secondaryBackground').trim();
        const buttonSecFg = computedStyle.getPropertyValue('--vscode-button-secondaryForeground').trim() || fg;
        const descriptionFg = computedStyle.getPropertyValue('--vscode-descriptionForeground').trim() || fg;
        const panelBorder = computedStyle.getPropertyValue('--vscode-panel-border').trim();
        const widgetBorder = computedStyle.getPropertyValue('--vscode-widget-border').trim();
        const contrastBorder = computedStyle.getPropertyValue('--vscode-contrastBorder').trim();
        const activityBarBorder = computedStyle.getPropertyValue('--vscode-activityBar-border').trim();
        const inputBorder = computedStyle.getPropertyValue('--vscode-input-border').trim();

        const bodyClass = document.body.className || '';
        const isHighContrast = bodyClass.includes('vscode-high-contrast');
        const isDark = bodyClass.includes('vscode-dark') || (isHighContrast && !bodyClass.includes('vscode-high-contrast-light'));

        // Prefer contrastBorder in HC: surfaces blend with body there, so the border carries differentiation.
        const border = isHighContrast
          ? (contrastBorder || panelBorder || widgetBorder || activityBarBorder)
          : (panelBorder || widgetBorder || contrastBorder || activityBarBorder);
        const inputBorderResolved = inputBorder || border;
        const errorBg = computedStyle.getPropertyValue('--vscode-inputValidation-errorBackground').trim();
        const errorFg = computedStyle.getPropertyValue('--vscode-inputValidation-errorForeground').trim() || fg;
        const inactiveTabBg = computedStyle.getPropertyValue('--vscode-tab-inactiveBackground').trim();
        // Drop transparent / low-alpha values so they don't degrade to gray in colorToHsl.
        const opaque = (c) => {
          if (!c) return '';
          if (/^\\s*transparent\\s*$/i.test(c)) return '';
          let m = c.match(/^#[0-9a-f]{6}([0-9a-f]{2})$/i);
          if (m && parseInt(m[1], 16) < 128) return '';
          m = c.match(/^[a-z]+\\(\\s*[\\d.]+%?\\s*,\\s*[\\d.]+%?\\s*,\\s*[\\d.]+%?\\s*,\\s*([\\d.]+)\\s*\\)\\s*$/i);
          if (m && parseFloat(m[1]) < 0.5) return '';
          m = c.match(/^[a-z]+\\([^)]*\\/\\s*([\\d.]+)\\s*\\)\\s*$/i);
          if (m && parseFloat(m[1]) < 0.5) return '';
          return c;
        };
        const widgetBg = opaque(computedStyle.getPropertyValue('--vscode-editorWidget-background').trim());
        const listHoverBg = opaque(computedStyle.getPropertyValue('--vscode-list-hoverBackground').trim());

        // In HC themes, surfaces should blend with the editor and rely on borders (contrastBorder)
        // for differentiation — coloured fills wash out or render invisible.
        let subtleSurface;
        let subtleSurfaceFg = fg;
        if (isHighContrast) {
          subtleSurface = editorBg;
        } else if (widgetBg) {
          subtleSurface = widgetBg;
        } else if (listHoverBg) {
          subtleSurface = listHoverBg;
        } else if (buttonSecBg) {
          subtleSurface = buttonSecBg;
          subtleSurfaceFg = buttonSecFg;
        } else {
          subtleSurface = inactiveTabBg;
        }
        const subtleSurfaceMuted = isHighContrast ? editorBg : (widgetBg || listHoverBg || inactiveTabBg);

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
          primary: buttonBg,
          primaryForeground: buttonFg,

          // Secondary colors
          secondary: subtleSurface,
          secondaryForeground: subtleSurfaceFg,

          // Muted colors
          muted: subtleSurfaceMuted,
          mutedForeground: descriptionFg,

          // Accent colors
          accent: subtleSurface,
          accentForeground: subtleSurfaceFg,

          // Destructive colors
          destructive: errorBg,
          destructiveForeground: errorFg,

          // Input/Border/Ring
          border: border,
          input: inputBorderResolved,
          ring: editorFg,

          // Body styles
          bodyBg: editorBg,
          bodyColor: editorFg
        };

        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            type: 'vscode-theme-colors',
            colors: themeColors,
            isDark: isDark
          }, 'http://localhost:${Ports.CLIENT}');
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

      // === Clipboard bridge (parent webview side) ===
      // Iframe asks us for clipboard read/write -> we ask the extension -> we forward back to iframe.
      const vscodeApi = acquireVsCodeApi();
      window.addEventListener('message', function(e) {
        const msg = e.data;
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'mcp-inspector-request-paste' && e.source === iframe.contentWindow) {
          vscodeApi.postMessage({ type: 'mcp-inspector-request-clipboard-text', requestId: msg.requestId });
        } else if (msg.type === 'mcp-inspector-request-clipboard-write' && e.source === iframe.contentWindow) {
          vscodeApi.postMessage({ type: 'mcp-inspector-request-clipboard-write', requestId: msg.requestId, text: msg.text });
        } else if (msg.type === 'mcp-inspector-clipboard-text' && iframe.contentWindow) {
          iframe.contentWindow.postMessage({ type: 'mcp-inspector-paste-response', requestId: msg.requestId, text: msg.text }, 'http://localhost:${Ports.CLIENT}');
        } else if (msg.type === 'mcp-inspector-clipboard-write-result' && iframe.contentWindow) {
          iframe.contentWindow.postMessage({ type: 'mcp-inspector-clipboard-write-result', requestId: msg.requestId, ok: msg.ok, error: msg.error }, 'http://localhost:${Ports.CLIENT}');
        }
      });

      // Listen for VSCode theme changes
      const observer = new MutationObserver((mutations) => {
        sendThemeColors();
      });

      // Observe both <html> (CSS variable updates) and <body> (theme class flips).
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['style', 'class']
      });
      if (document.body) {
        observer.observe(document.body, {
          attributes: true,
          attributeFilter: ['class']
        });
      }

    })();
  </script>
</body>
</html>`;
  }
}
