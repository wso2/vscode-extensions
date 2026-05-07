// Package main provides the CLI entry point for the Arazzo Designer CLI.
// It exposes a "serve" command that starts the MCP server for an Arazzo file.
package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/wso2/arazzo-designer-cli/internal/mcpserver"
	"github.com/wso2/arazzo-designer-cli/internal/models"
	"github.com/wso2/arazzo-designer-cli/internal/telemetry"
)

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	switch os.Args[1] {
	case "serve":
		serveCmd(os.Args[2:])
	case "help", "--help", "-h":
		printUsage()
	default:
		fmt.Fprintf(os.Stderr, "Unknown command: %s\n", os.Args[1])
		printUsage()
		os.Exit(1)
	}
}

func serveCmd(args []string) {
	fs := flag.NewFlagSet("serve", flag.ExitOnError)
	filePath := fs.String("f", "", "Path to the Arazzo YAML file (required)")
	port := fs.Int("p", 8080, "Port to listen on")
	bearerToken := fs.String("bearer-token", "", "Bearer token for API authentication")
	apiKey := fs.String("api-key", "", "API key for authentication")
	apiKeyHeader := fs.String("api-key-header", "X-API-Key", "Header name for API key")
	traceEndpoint := fs.String("trace-endpoint", "", "URL of the local tracer server to receive span events (e.g. http://127.0.0.1:59600/span-events)")
	otlpEndpoint := fs.String("otlp-endpoint", "", "Base URL of an OTLP/HTTP trace backend (e.g. http://localhost:4318 for Jaeger/Honeycomb)")
	disableTLS := fs.Bool("disable-tls", false, "Disable TLS certificate verification for outbound HTTP requests (development only)")

	fs.Parse(args)

	if *filePath == "" {
		fmt.Fprintln(os.Stderr, "Error: -f flag (Arazzo file path) is required")
		fs.Usage()
		os.Exit(1)
	}

	// Check file exists
	if _, err := os.Stat(*filePath); os.IsNotExist(err) {
		fmt.Fprintf(os.Stderr, "Error: file not found: %s\n", *filePath)
		os.Exit(1)
	}

	// Build runtime params
	if *disableTLS {
		log.Println("WARNING: TLS certificate verification is disabled")
	}
	runtimeParams := &models.RuntimeParams{
		BearerToken:            *bearerToken,
		APIKey:                 *apiKey,
		APIKeyHeader:           *apiKeyHeader,
		AuthHeaders:            make(map[string]string),
		DisableTLSVerification: *disableTLS,
	}

	// Create trace sink — combine whichever endpoints are configured.
	// VS Code plugin always passes --trace-endpoint (local custom JSON sink).
	// Standalone users can pass --otlp-endpoint to reach Jaeger, Honeycomb, etc.
	// Both flags may be provided simultaneously.
	var sink telemetry.SpanEventSink
	var sinks []telemetry.SpanEventSink
	if *traceEndpoint != "" {
		log.Printf("Local tracing enabled → %s", *traceEndpoint)
		sinks = append(sinks, telemetry.NewHTTPSink(*traceEndpoint))
	}
	if *otlpEndpoint != "" {
		log.Printf("OTLP tracing enabled → %s/v1/traces", *otlpEndpoint)
		sinks = append(sinks, telemetry.NewOTLPSink(*otlpEndpoint))
	}
	switch len(sinks) {
	case 0:
		sink = &telemetry.NoopSink{}
	case 1:
		sink = sinks[0]
	default:
		sink = telemetry.NewMultiSink(sinks...)
	}
	defer sink.Shutdown()

	// Create and start MCP server
	srv, err := mcpserver.NewMCPServer(*filePath, *port, runtimeParams, sink)
	if err != nil {
		log.Fatalf("Failed to create MCP server: %v", err)
	}

	log.Printf("Starting Arazzo MCP server for: %s", *filePath)
	if err := srv.Start(); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}

func printUsage() {
	fmt.Println(`Arazzo Designer CLI - Arazzo Workflow Runner & MCP Server

Usage:
  arazzo-designer-cli <command> [flags]

Commands:
  serve    Start the MCP server for an Arazzo file
  help     Show this help message

Flags (serve):
  -f                Path to the Arazzo YAML file (required)
  -p                Port to listen on (default 8080)
  --trace-endpoint  Local tracer server URL (used by the VS Code extension)
  --otlp-endpoint   OTLP/HTTP base URL for external tracing (e.g. http://localhost:4318)
  --bearer-token    Bearer token for API auth
  --api-key         API key for API auth
  --disable-tls     Disable TLS certificate verification for outbound requests (development only)

Examples:
  # VS Code plugin (automatic)
  arazzo-designer-cli serve -f workflow.arazzo.yaml --trace-endpoint http://127.0.0.1:59600/span-events

  # Standalone with Jaeger
  arazzo-designer-cli serve -f workflow.arazzo.yaml -p 8080 --otlp-endpoint http://localhost:4318

  # Both simultaneously
  arazzo-designer-cli serve -f workflow.arazzo.yaml --trace-endpoint http://127.0.0.1:59600/span-events --otlp-endpoint http://localhost:4318`)
}
