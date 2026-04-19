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
	traceEndpoint := fs.String("trace-endpoint", "", "URL of the tracer server to receive span events (e.g. http://127.0.0.1:59600/span-events)")

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
	runtimeParams := &models.RuntimeParams{
		BearerToken:  *bearerToken,
		APIKey:       *apiKey,
		APIKeyHeader: *apiKeyHeader,
		AuthHeaders:  make(map[string]string),
	}

	// Create trace sink
	var sink telemetry.SpanEventSink
	if *traceEndpoint != "" {
		log.Printf("Tracing enabled → %s", *traceEndpoint)
		sink = telemetry.NewHTTPSink(*traceEndpoint)
	} else {
		sink = &telemetry.NoopSink{}
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

Example:
  arazzo-designer-cli serve -f my-workflow.arazzo.yaml -p 8080`)
}
