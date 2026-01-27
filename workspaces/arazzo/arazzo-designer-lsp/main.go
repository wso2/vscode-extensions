package main

import (
	"context"
	"flag"
	"fmt"
	"os"

	"github.com/arazzo/lsp/server"
	"github.com/arazzo/lsp/utils"
	"go.lsp.dev/jsonrpc2"
	"go.lsp.dev/protocol"
	"go.uber.org/zap"
)

func main() {
	// Parse command-line flags
	debugMode := flag.Bool("debug", false, "Enable debug logging")
	version := flag.Bool("version", false, "Print version information")
	_ = flag.Bool("stdio", false, "Use stdio for communication (default)")
	flag.Parse()

	// Print version and exit if requested
	if *version {
		fmt.Println("Arazzo Language Server v0.1.0")
		fmt.Println("Supports Arazzo Specification 1.0.0, 1.0.1 (backward compatible)")
		fmt.Println("Spec: https://spec.openapis.org/arazzo/v1.0.1.html")
		os.Exit(0)
	}

	// Initialize logger
	if err := utils.InitLogger(*debugMode); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to initialize logger: %v\n", err)
		os.Exit(1)
	}
	defer utils.CloseLogger()

	utils.LogInfo("Arazzo Language Server starting...")
	utils.LogInfo("Debug mode: %v", *debugMode)
	utils.LogInfo("Supported Arazzo versions: 1.0.0, 1.0.1")

	// Create LSP server
	lspServer := server.NewServer()

	// Create JSON-RPC 2.0 stream using stdin/stdout
	ctx := context.Background()
	stream := jsonrpc2.NewStream(&stdioReadWriteCloser{
		in:  os.Stdin,
		out: os.Stdout,
	})

	// Create custom handler
	handler := jsonrpc2.AsyncHandler(func(ctx context.Context, reply jsonrpc2.Replier, req jsonrpc2.Request) error {
		result, err := lspServer.Handle(ctx, nil, req)
		if err != nil {
			utils.LogError(">>> Error response for %s: %v", req.Method(), err)
			return reply(ctx, nil, err)
		}
		utils.LogInfo(">>> Success response for %s", req.Method())
		utils.LogDebug("Response data: %+v", result)
		return reply(ctx, result, nil)
	})

	// Create JSON-RPC connection
	conn := jsonrpc2.NewConn(stream)

	// Create a no-op logger for the protocol client
	// (we use our own logging system in utils/logger.go)
	zapLogger, _ := zap.NewDevelopment()
	if !*debugMode {
		zapLogger = zap.NewNop()
	}

	// Create protocol client to send notifications back to the client
	client := protocol.ClientDispatcher(conn, zapLogger)
	lspServer.SetClient(client)

	// Start serving
	conn.Go(ctx, handler)

	utils.LogInfo("Arazzo LSP Server started on stdio")

	// Wait for connection to close
	<-conn.Done()

	utils.LogInfo("Arazzo LSP Server shutting down")
}

// stdioReadWriteCloser implements io.ReadWriteCloser for stdin/stdout
type stdioReadWriteCloser struct {
	in  *os.File
	out *os.File
}

func (s *stdioReadWriteCloser) Read(p []byte) (int, error) {
	return s.in.Read(p)
}

func (s *stdioReadWriteCloser) Write(p []byte) (int, error) {
	return s.out.Write(p)
}

func (s *stdioReadWriteCloser) Close() error {
	// Don't actually close stdin/stdout
	return nil
}
