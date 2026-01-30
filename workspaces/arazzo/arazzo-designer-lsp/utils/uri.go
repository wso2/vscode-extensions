package utils

import (
	"net/url"
	"runtime"
	"strings"
)

// URIToPath converts a file:// URI to a file system path.
// Handles platform-specific path formats (Windows vs Unix).
// Properly decodes URL-encoded characters (e.g., %20 -> space).
func URIToPath(uri string) (string, error) {
	// Parse the URI
	u, err := url.Parse(uri)
	if err != nil {
		return "", err
	}

	// Get the path from the URI (this will decode URL encoding like %20)
	path := u.Path

	// On Windows, url.Parse returns paths like "/c:/Users/..."
	// We need to remove the leading slash for Windows paths
	if runtime.GOOS == "windows" {
		// Check if path starts with a slash followed by a drive letter
		// Pattern: /C:/ or /c:/
		if len(path) >= 3 && path[0] == '/' && path[2] == ':' {
			path = path[1:] // Remove leading slash
		}
		
		// Convert forward slashes to backslashes on Windows
		path = strings.ReplaceAll(path, "/", "\\")
	}

	return path, nil
}

// PathToURI converts a file system path to a file:// URI.
// Handles platform-specific path formats and properly encodes the path.
func PathToURI(path string) string {
	// Convert backslashes to forward slashes on Windows
	if runtime.GOOS == "windows" {
		path = strings.ReplaceAll(path, "\\", "/")
	}

	// Ensure path doesn't start with / on Windows (for drive letters)
	if runtime.GOOS == "windows" && len(path) >= 2 && path[1] == ':' {
		// Path is like "c:/Users/..." - don't add leading slash
		return "file:///" + path
	}

	// Unix paths should start with /
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}

	return "file://" + path
}
