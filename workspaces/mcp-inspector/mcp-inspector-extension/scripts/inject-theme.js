#!/usr/bin/env node

/**
 * Injects custom CSS theme into the MCP Inspector client's index.html
 * This modifies the npm package directly so the theme is applied when served
 */

const fs = require('fs');
const path = require('path');

// Target the actual npm package location that gets served
const INDEX_HTML_PATH = path.join(
  __dirname,
  '..',
  'node_modules',
  '@modelcontextprotocol',
  'inspector',
  'client',
  'dist',
  'index.html'
);

// Placeholder CSS - will be replaced by dynamic theme injection at runtime
const CUSTOM_CSS = `    <!-- Dynamic Theme Injection Placeholder -->
    <script>
      // === Clipboard paste bridge ===
      // Cross-origin iframes inside VS Code webviews cannot use the Clipboard API
      // (microsoft/vscode#129178, #182642). We intercept Cmd/Ctrl+V over paste-capable
      // fields and ask the parent webview for the clipboard text, then insert it ourselves.
      (function () {
        var pasteRequestId = 0;
        var pendingPasteRequests = new Map();

        function isPasteableInput(el) {
          if (!el) return false;
          if (el.isContentEditable) return true;
          if (el.tagName === 'TEXTAREA') return !el.disabled && !el.readOnly;
          if (el.tagName === 'INPUT') {
            var t = (el.type || 'text').toLowerCase();
            var pasteableTypes = ['text', 'search', 'url', 'email', 'password', 'tel', 'number'];
            return pasteableTypes.indexOf(t) !== -1 && !el.disabled && !el.readOnly;
          }
          return false;
        }

        function insertTextAt(el, text) {
          if (!el || !text) return;
          if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            // input[type="number"] (and a few others) don't support selection APIs;
            // setSelectionRange throws InvalidStateError, which would skip the input event.
            var canSelect = el.tagName === 'TEXTAREA' ||
              ['text', 'search', 'url', 'email', 'password', 'tel'].indexOf((el.type || 'text').toLowerCase()) !== -1;
            var start = canSelect && el.selectionStart != null ? el.selectionStart : el.value.length;
            var end = canSelect && el.selectionEnd != null ? el.selectionEnd : el.value.length;
            var nativeSetter = Object.getOwnPropertyDescriptor(
              el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
              'value'
            ).set;
            // Use the native setter so React's onChange fires (React tracks the prior value)
            nativeSetter.call(el, el.value.slice(0, start) + text + el.value.slice(end));
            if (canSelect) {
              var caret = start + text.length;
              el.setSelectionRange(caret, caret);
            }
            el.dispatchEvent(new Event('input', { bubbles: true }));
          } else if (el.isContentEditable) {
            document.execCommand('insertText', false, text);
          }
        }

        function selectAll(el) {
          if (!el) return;
          if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            try { el.select(); } catch (_) { /* ignore */ }
          } else if (el.isContentEditable) {
            var range = document.createRange();
            range.selectNodeContents(el);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }

        function getSelectionContext() {
          var ae = document.activeElement;
          if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) {
            var s = ae.selectionStart;
            var en = ae.selectionEnd;
            if (s != null && en != null && s !== en) {
              return { text: ae.value.slice(s, en), inInput: true, el: ae, start: s, end: en };
            }
          }
          var sel = window.getSelection();
          var selText = sel ? sel.toString() : '';
          if (selText) return { text: selText, inInput: false };
          return null;
        }

        function deleteSelection(ctx) {
          if (!ctx) return;
          if (ctx.inInput && ctx.el && !ctx.el.disabled && !ctx.el.readOnly) {
            var nativeSetter = Object.getOwnPropertyDescriptor(
              ctx.el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
              'value'
            ).set;
            nativeSetter.call(ctx.el, ctx.el.value.slice(0, ctx.start) + ctx.el.value.slice(ctx.end));
            ctx.el.setSelectionRange(ctx.start, ctx.start);
            ctx.el.dispatchEvent(new Event('input', { bubbles: true }));
          } else {
            try { document.execCommand('delete'); } catch (_) { /* ignore */ }
          }
        }

        document.addEventListener('keydown', function (e) {
          if (!(e.metaKey || e.ctrlKey)) return;
          if (e.shiftKey || e.altKey) return;
          var k = e.key && e.key.toLowerCase();

          // Copy / Cut: work on any selection in the document (form field or UI text).
          if (k === 'c' || k === 'x') {
            var ctx = getSelectionContext();
            if (!ctx || !ctx.text) return;
            e.preventDefault();
            e.stopPropagation();
            if (typeof window.__mcpInspectorWriteClipboard === 'function') {
              var write = window.__mcpInspectorWriteClipboard(ctx.text);
              if (k === 'x') {
                // Defer the delete until after the write resolves to avoid silent data loss.
                write.then(function () { deleteSelection(ctx); }, function () { /* keep selection on failure */ });
              } else {
                write.catch(function () { /* swallow */ });
              }
            }
            return;
          }

          // Paste / Select-all: only meaningful when a paste-capable field is focused.
          var ae = document.activeElement;
          if (!isPasteableInput(ae)) return;
          if (k === 'v') {
            // Prevent the (broken) native paste path; do our own via the parent webview.
            e.preventDefault();
            e.stopPropagation();
            var id = ++pasteRequestId;
            pendingPasteRequests.set(id, ae);
            setTimeout(function () {
              pendingPasteRequests.delete(id);
            }, 10000);
            window.parent.postMessage({ type: 'mcp-inspector-request-paste', requestId: id }, '*');
          } else if (k === 'a') {
            // VS Code's webview swallows the native Select All; do it manually.
            e.preventDefault();
            e.stopPropagation();
            selectAll(ae);
          }
        }, true);

        // Bridge for writing to the system clipboard (copy direction).
        // Cross-origin iframes can't use navigator.clipboard.writeText() either,
        // so we ask the extension host to do it via vscode.env.clipboard.writeText().
        var copyRequestId = 0;
        var pendingCopyRequests = new Map();
        window.__mcpInspectorWriteClipboard = function (text) {
          return new Promise(function (resolve, reject) {
            var id = ++copyRequestId;
            pendingCopyRequests.set(id, { resolve: resolve, reject: reject });
            window.parent.postMessage({
              type: 'mcp-inspector-request-clipboard-write',
              requestId: id,
              text: text == null ? '' : String(text)
            }, '*');
            setTimeout(function () {
              if (pendingCopyRequests.has(id)) {
                pendingCopyRequests.delete(id);
                reject(new Error('Clipboard write timed out'));
              }
            }, 5000);
          });
        };

        window.addEventListener('message', function (e) {
          // Only honour clipboard responses from the parent webview shell.
          if (e.source !== window.parent) return;
          var msg = e.data;
          if (!msg) return;
          if (msg.type === 'mcp-inspector-paste-response') {
            var target = pendingPasteRequests.get(msg.requestId);
            pendingPasteRequests.delete(msg.requestId);
            if (target && msg.text) insertTextAt(target, msg.text);
          } else if (msg.type === 'mcp-inspector-clipboard-write-result') {
            var pending = pendingCopyRequests.get(msg.requestId);
            if (!pending) return;
            pendingCopyRequests.delete(msg.requestId);
            if (msg.ok) pending.resolve();
            else pending.reject(new Error(msg.error || 'Clipboard write failed'));
          }
        });
      })();

      // Function to convert color (hex or rgb/rgba) to HSL format
      function colorToHsl(color) {
        let r, g, b;

        // Handle HEX format (#ffffff or #fff)
        if (color.startsWith('#')) {
          let hex = color.replace('#', '');
          if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
          }
          r = parseInt(hex.substr(0, 2), 16) / 255;
          g = parseInt(hex.substr(2, 2), 16) / 255;
          b = parseInt(hex.substr(4, 2), 16) / 255;
        }
        // Handle rgb() and rgba() formats
        else if (color.startsWith('rgb')) {
          const match = color.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
          if (!match) {
            return '0 0% 50%';
          }
          r = parseInt(match[1]) / 255;
          g = parseInt(match[2]) / 255;
          b = parseInt(match[3]) / 255;
        } else {
          return '0 0% 50%';
        }

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
          h = s = 0;
        } else {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
          }
        }

        return Math.round(h * 360) + ' ' + Math.round(s * 100) + '% ' + Math.round(l * 100) + '%';
      }

      // Fallback to execCommand when webview blocks navigator.clipboard.writeText.
      (function patchClipboard() {
        const execCopy = (text) => {
          const ta = document.createElement('textarea');
          ta.value = text == null ? '' : String(text);
          ta.setAttribute('readonly', '');
          ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
          document.body.appendChild(ta);
          const sel = document.getSelection();
          const prevRange = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
          ta.select();
          ta.setSelectionRange(0, ta.value.length);
          let ok = false;
          try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
          document.body.removeChild(ta);
          if (prevRange && sel) { sel.removeAllRanges(); sel.addRange(prevRange); }
          return ok;
        };
        const native = navigator.clipboard && navigator.clipboard.writeText
          ? navigator.clipboard.writeText.bind(navigator.clipboard)
          : null;
        const writeText = async (text) => {
          if (native) {
            try { return await native(text); } catch (_) {}
          }
          // VS Code webview path: ask the extension host to write the clipboard.
          if (typeof window.__mcpInspectorWriteClipboard === 'function') {
            try { await window.__mcpInspectorWriteClipboard(text); return; } catch (_) {}
          }
          if (execCopy(text)) return;
          throw new Error('Clipboard copy failed');
        };
        if (!navigator.clipboard) {
          Object.defineProperty(navigator, 'clipboard', { value: {}, configurable: true });
        }
        try { navigator.clipboard.writeText = writeText; } catch (_) {}
      })();

      let themeStyleElement = null;

      // Listen for theme color messages from parent
      window.addEventListener('message', (event) => {
        if (event.source !== window.parent) return;
        const message = event.data;
        if (message && message.type === 'vscode-theme-colors') {
          // Sync the inspector's dark-mode class with VSCode's theme so its
          // own theme tokens (:root for light, .dark for dark) align with our overrides.
          if (typeof message.isDark === 'boolean') {
            document.documentElement.classList.toggle('dark', message.isDark);
          }

          // Remove old theme style if exists
          if (themeStyleElement) {
            themeStyleElement.remove();
          }

          // Create new style element
          themeStyleElement = document.createElement('style');
          themeStyleElement.id = 'vscode-theme-override';
          themeStyleElement.textContent = \`
            /* Override both :root and .dark to ensure VSCode theme is always applied */
            :root,
            .dark {
              /* Main colors */
              --background: \${colorToHsl(message.colors.background)} !important;
              --foreground: \${colorToHsl(message.colors.foreground)} !important;

              /* Card colors */
              --card: \${colorToHsl(message.colors.card)} !important;
              --card-foreground: \${colorToHsl(message.colors.cardForeground)} !important;

              /* Popover colors */
              --popover: \${colorToHsl(message.colors.popover)} !important;
              --popover-foreground: \${colorToHsl(message.colors.popoverForeground)} !important;

              /* Primary colors */
              --primary: \${colorToHsl(message.colors.primary)} !important;
              --primary-foreground: \${colorToHsl(message.colors.primaryForeground)} !important;

              /* Secondary colors */
              --secondary: \${colorToHsl(message.colors.secondary)} !important;
              --secondary-foreground: \${colorToHsl(message.colors.secondaryForeground)} !important;

              /* Muted colors */
              --muted: \${colorToHsl(message.colors.muted)} !important;
              --muted-foreground: \${colorToHsl(message.colors.mutedForeground)} !important;

              /* Accent colors */
              --accent: \${colorToHsl(message.colors.accent)} !important;
              --accent-foreground: \${colorToHsl(message.colors.accentForeground)} !important;

              /* Destructive colors */
              --destructive: \${colorToHsl(message.colors.destructive)} !important;
              --destructive-foreground: \${colorToHsl(message.colors.destructiveForeground)} !important;

              /* Input/Border/Ring */
              --border: \${colorToHsl(message.colors.border)} !important;
              --input: \${colorToHsl(message.colors.input)} !important;
              --ring: \${colorToHsl(message.colors.ring)} !important;
            }

            /* Override body styles */
            body {
              background-color: \${message.colors.bodyBg} !important;
              color: \${message.colors.bodyColor} !important;
            }

            /* Override the hardcoded :root colors */
            :root {
              color: \${message.colors.bodyColor} !important;
              background-color: \${message.colors.bodyBg} !important;
            }

            /* Override @media (prefers-color-scheme: light) */
            @media (prefers-color-scheme: light) {
              :root {
                color: \${message.colors.bodyColor} !important;
                background-color: \${message.colors.bodyBg} !important;
              }
            }

            /* Hide the inspector's theme switcher — VSCode owns the theme. */
            #theme-select { display: none !important; }
          \`;
          document.head.appendChild(themeStyleElement);
        }
      });
    </script>`;

function injectTheme() {
  console.log('🎨 Injecting custom CSS theme into MCP Inspector npm package...');

  // Check if index.html exists
  if (!fs.existsSync(INDEX_HTML_PATH)) {
    console.error(`   ❌ Error: index.html not found at ${INDEX_HTML_PATH}`);
    console.error('   💡 Try running: pnpm install');
    process.exit(1);
  }

  // Read index.html
  let html = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  // If a previous injection exists, strip it so we can replace with the latest version.
  const existing = /\s*<!-- Dynamic Theme Injection Placeholder -->[\s\S]*?<\/script>\s*/;
  if (existing.test(html)) {
    html = html.replace(existing, '\n    ');
    console.log('   ♻️  Replacing existing theme injection...');
  }

  // Inject custom CSS before </head> tag
  html = html.replace('</head>', `${CUSTOM_CSS}\n  </head>`);

  // Write back to file
  fs.writeFileSync(INDEX_HTML_PATH, html, 'utf8');

  console.log('   ✅ Custom CSS theme injected successfully!');
  console.log(`   📍 Location: ${INDEX_HTML_PATH}`);
  console.log('   💡 Theme will be applied when MCP Inspector client server starts');
}

// Run the injection
try {
  injectTheme();
} catch (error) {
  console.error('   ❌ Failed to inject theme:', error.message);
  process.exit(1);
}
