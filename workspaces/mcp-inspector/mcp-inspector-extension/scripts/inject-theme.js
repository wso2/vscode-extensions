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

      // Remove existing theme styles when updating
      let themeStyleElement = null;

      // Listen for theme color messages from parent
      window.addEventListener('message', (event) => {
        const message = event.data;
        if (message.type === 'vscode-theme-colors') {
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

  // Check if theme is already injected (avoid duplicate injection)
  if (html.includes('Dynamic Theme Injection Placeholder')) {
    console.log('   ℹ️  Theme already injected, skipping...');
    return;
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
