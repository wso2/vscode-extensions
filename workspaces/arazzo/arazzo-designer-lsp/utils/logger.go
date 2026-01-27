package utils

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
)

var (
	logFile *os.File
	logger  *log.Logger
)

// InitLogger initializes the logger to write to a file
func InitLogger(debugMode bool) error {
	if !debugMode {
		// Disable logging in non-debug mode
		logger = log.New(os.Stderr, "", 0)
		logger.SetOutput(os.Stderr)
		return nil
	}

	// Create log directory in temp folder
	logDir := filepath.Join(os.TempDir(), "arazzo-lsp")
	if err := os.MkdirAll(logDir, 0755); err != nil {
		return fmt.Errorf("failed to create log directory: %w", err)
	}

	// Open log file
	logPath := filepath.Join(logDir, "arazzo-lsp.log")
	var err error
	logFile, err = os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		return fmt.Errorf("failed to open log file: %w", err)
	}

	// Create logger
	logger = log.New(logFile, "[ARAZZO-LSP] ", log.Ldate|log.Ltime|log.Lshortfile)
	logger.Printf("Arazzo LSP Server started. Log file: %s", logPath)

	return nil
}

// CloseLogger closes the log file
func CloseLogger() {
	if logFile != nil {
		logFile.Close()
	}
}

// LogInfo logs an informational message
func LogInfo(format string, v ...interface{}) {
	if logger != nil {
		logger.Printf("[INFO] "+format, v...)
	}
}

// LogError logs an error message
func LogError(format string, v ...interface{}) {
	if logger != nil {
		logger.Printf("[ERROR] "+format, v...)
	}
}

// LogDebug logs a debug message
func LogDebug(format string, v ...interface{}) {
	if logger != nil {
		logger.Printf("[DEBUG] "+format, v...)
	}
}

// LogWarning logs a warning message
func LogWarning(format string, v ...interface{}) {
	if logger != nil {
		logger.Printf("[WARN] "+format, v...)
	}
}
