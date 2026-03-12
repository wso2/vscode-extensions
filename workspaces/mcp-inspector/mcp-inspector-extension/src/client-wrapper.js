#!/usr/bin/env node

/**
 * Custom wrapper for the MCP Inspector client server
 * This fixes the path resolution issue when the client is bundled by webpack
 */

const open = require("open");
const { join } = require("path");
const handler = require("serve-handler");
const http = require("http");

// Fix: Point to the correct location of static files after webpack bundling
// The static files are copied to ./client-dist by webpack's CopyWebpackPlugin
// __dirname will be preserved by webpack config (node: { __dirname: false })
const distPath = join(__dirname, "client-dist");

const server = http.createServer((request, response) => {
  // Set CORS headers before serve-handler processes the request
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "*");

  const handlerOptions = {
    public: distPath,
    rewrites: [{ source: "/**", destination: "/index.html" }],
    headers: [
      {
        // Ensure index.html is never cached
        source: "index.html",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, max-age=0",
          },
        ],
      },
      {
        // Allow long-term caching for hashed assets
        source: "assets/**",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ],
  };

  return handler(request, response, handlerOptions);
});

const port = parseInt(process.env.CLIENT_PORT || "6274", 10);
const host = process.env.HOST || "localhost";
server.on("listening", () => {
  const url = process.env.INSPECTOR_URL || `http://${host}:${port}`;
  console.log(`\n🚀 MCP Inspector is up and running at:\n   ${url}\n`);
  if (process.env.MCP_AUTO_OPEN_ENABLED !== "false") {
    console.log(`🌐 Opening browser...`);
    open(url);
  }
});
server.on("error", (err) => {
  if (err.message.includes(`EADDRINUSE`)) {
    console.error(
      `❌  MCP Inspector PORT IS IN USE at http://${host}:${port} ❌ `,
    );
  } else {
    throw err;
  }
});
server.listen(port, host);
