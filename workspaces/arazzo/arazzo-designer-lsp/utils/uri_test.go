package utils

import (
	"runtime"
	"testing"
)

func TestURIToPath(t *testing.T) {
	tests := []struct {
		name     string
		uri      string
		expected string
		os       string // "windows" or "unix"
	}{
		{
			name:     "Windows URI with spaces",
			uri:      "file:///c:/Users/Himeth%20Walgampaya/Important/test.yaml",
			expected: "c:\\Users\\Himeth Walgampaya\\Important\\test.yaml",
			os:       "windows",
		},
		{
			name:     "Windows URI without spaces",
			uri:      "file:///c:/Users/test/file.yaml",
			expected: "c:\\Users\\test\\file.yaml",
			os:       "windows",
		},
		{
			name:     "Windows URI with uppercase drive",
			uri:      "file:///C:/Users/test/file.yaml",
			expected: "C:\\Users\\test\\file.yaml",
			os:       "windows",
		},
		{
			name:     "Unix URI",
			uri:      "file:///home/user/test.yaml",
			expected: "/home/user/test.yaml",
			os:       "unix",
		},
		{
			name:     "Unix URI with spaces",
			uri:      "file:///home/user/my%20files/test.yaml",
			expected: "/home/user/my files/test.yaml",
			os:       "unix",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Skip test if it's for a different OS
			if (tt.os == "windows" && runtime.GOOS != "windows") ||
				(tt.os == "unix" && runtime.GOOS == "windows") {
				t.Skip("Skipping test for different OS")
			}

			result, err := URIToPath(tt.uri)
			if err != nil {
				t.Fatalf("URIToPath() error = %v", err)
			}
			if result != tt.expected {
				t.Errorf("URIToPath() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestPathToURI(t *testing.T) {
	tests := []struct {
		name     string
		path     string
		expected string
		os       string // "windows" or "unix"
	}{
		{
			name:     "Windows path",
			path:     "c:\\Users\\test\\file.yaml",
			expected: "file:///c:/Users/test/file.yaml",
			os:       "windows",
		},
		{
			name:     "Windows path with forward slashes",
			path:     "c:/Users/test/file.yaml",
			expected: "file:///c:/Users/test/file.yaml",
			os:       "windows",
		},
		{
			name:     "Unix path",
			path:     "/home/user/test.yaml",
			expected: "file:///home/user/test.yaml",
			os:       "unix",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Skip test if it's for a different OS
			if (tt.os == "windows" && runtime.GOOS != "windows") ||
				(tt.os == "unix" && runtime.GOOS == "windows") {
				t.Skip("Skipping test for different OS")
			}

			result := PathToURI(tt.path)
			if result != tt.expected {
				t.Errorf("PathToURI() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestURIToPathRoundTrip(t *testing.T) {
	var testPaths []string
	
	if runtime.GOOS == "windows" {
		testPaths = []string{
			"c:\\Users\\test\\file.yaml",
			"c:\\Program Files\\test\\file.yaml",
		}
	} else {
		testPaths = []string{
			"/home/user/test.yaml",
			"/tmp/my files/test.yaml",
		}
	}

	for _, originalPath := range testPaths {
		t.Run(originalPath, func(t *testing.T) {
			// Convert to URI and back
			uri := PathToURI(originalPath)
			resultPath, err := URIToPath(uri)
			if err != nil {
				t.Fatalf("URIToPath() error = %v", err)
			}

			// Normalize paths for comparison (handle forward/back slashes on Windows)
			if runtime.GOOS == "windows" {
				// On Windows, convert forward slashes to backslashes for comparison
				if resultPath != originalPath {
					t.Errorf("Round trip failed: original = %v, result = %v", originalPath, resultPath)
				}
			} else {
				if resultPath != originalPath {
					t.Errorf("Round trip failed: original = %v, result = %v", originalPath, resultPath)
				}
			}
		})
	}
}
