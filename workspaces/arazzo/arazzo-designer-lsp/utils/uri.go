package utils

import (
	"fmt"
	"net/url"
	"runtime"
	"strings"
)

// URIToPath converts a file:// URI to a file system path.
// Handles platform-specific path formats (Windows vs Unix).
// Properly decodes URL-encoded characters (e.g., %20 -> space).
// Also handles cases where a file path is passed instead of a URI.
func URIToPath(uri string) (string, error) {
	// Validate input
	if uri == "" {
		return "", fmt.Errorf("empty URI provided")
	}

	// Check if it's already a file path (not a URI)
	// On Windows: starts with drive letter (e.g., "C:\..." or "c:\...")
	// On Unix: starts with "/" and doesn't contain "://"
	if runtime.GOOS == "windows" {
		// Check if it looks like a Windows path: "C:\" or "c:\"
		if len(uri) >= 3 && uri[1] == ':' && (uri[2] == '\\' || uri[2] == '/') {
			// It's already a Windows file path, just normalize slashes
			return strings.ReplaceAll(uri, "/", "\\"), nil
		}
	} else {
		// On Unix, check if it's already a path (starts with / but no scheme)
		if strings.HasPrefix(uri, "/") && !strings.Contains(uri, "://") {
			return uri, nil
		}
	}

	// If it doesn't start with file://, it might still be a relative path
	// or malformed - try to detect and handle
	if !strings.HasPrefix(uri, "file://") {
		// Not a proper URI, but also not a recognized file path
		return "", fmt.Errorf("invalid URI or file path: '%s' (expected file:// URI or absolute path)", uri)
	}

	// Parse the URI
	u, err := url.Parse(uri)
	if err != nil {
		return "", fmt.Errorf("failed to parse URI '%s': %w", uri, err)
	}

	// Get the path from the URI (this will decode URL encoding like %20)
	path := u.Path

	// Validate we got a path
	if path == "" {
		return "", fmt.Errorf("URI '%s' has no path component", uri)
	}

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
		
		// Final validation: path should start with a drive letter on Windows
		if len(path) < 3 || path[1] != ':' {
			return "", fmt.Errorf("invalid Windows path format in URI '%s': got '%s'", uri, path)
		}
	} else {
		// On Unix, path should start with /
		if !strings.HasPrefix(path, "/") {
			return "", fmt.Errorf("invalid Unix path format in URI '%s': got '%s'", uri, path)
		}
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
