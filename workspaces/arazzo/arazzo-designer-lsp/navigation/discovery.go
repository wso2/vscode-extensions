package navigation

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/arazzo/lsp/utils"
)

// DiscoverOpenAPIFiles finds OpenAPI specification files near the Arazzo file
// Phase 2: Searches same directory, subdirectories, and parent directory
func DiscoverOpenAPIFiles(arazzoFileURI string) ([]string, error) {
	utils.LogInfo("Discovering OpenAPI files for: %s", arazzoFileURI)

	// Convert URI to file path
	filePath, err := utils.URIToPath(arazzoFileURI)
	if err != nil {
		utils.LogError("Failed to convert URI to path - URI: '%s', Error: %v", arazzoFileURI, err)
		return nil, fmt.Errorf("invalid URI %s: %w", arazzoFileURI, err)
	}
	
	utils.LogDebug("Converted Arazzo URI to path: '%s' -> '%s'", arazzoFileURI, filePath)

	// Get directory of Arazzo file
	dir := filepath.Dir(filePath)
	utils.LogDebug("Searching in directory: %s", dir)

	allFiles := make([]string, 0)

	// 1. Search same directory (non-recursive)
	utils.LogDebug("Searching same directory...")
	sameDirFiles, err := findFilesInDirectory(dir, false)
	if err != nil {
		utils.LogError("Error finding files in same directory: %v", err)
	} else {
		allFiles = append(allFiles, sameDirFiles...)
		utils.LogDebug("Found %d files in same directory", len(sameDirFiles))
	}

	// 2. Search subdirectories (recursive, max depth 2)
	utils.LogDebug("Searching subdirectories...")
	subDirFiles, err := findFilesInSubdirectories(dir, 2)
	if err != nil {
		utils.LogWarning("Error searching subdirectories: %v", err)
	} else {
		allFiles = append(allFiles, subDirFiles...)
		utils.LogDebug("Found %d files in subdirectories", len(subDirFiles))
	}

	// 3. Search parent directory (one level up)
	utils.LogDebug("Searching parent directory...")
	parentDir := filepath.Dir(dir)
	if parentDir != dir { // Ensure we're not at root
		parentFiles, err := findFilesInDirectory(parentDir, false)
		if err != nil {
			utils.LogWarning("Error searching parent directory: %v", err)
		} else {
			allFiles = append(allFiles, parentFiles...)
			utils.LogDebug("Found %d files in parent directory", len(parentFiles))
		}
	}

	utils.LogDebug("Total files found: %d", len(allFiles))

	// Filter to only OpenAPI files
	openAPIFiles := make([]string, 0)
	for _, file := range allFiles {
		// Skip the Arazzo file itself
		if file == filePath {
			continue
		}

		isOpenAPI, err := isOpenAPIFile(file)
		if err != nil {
			utils.LogWarning("Error checking file %s: %v", file, err)
			continue
		}

		if isOpenAPI {
			utils.LogDebug("Found OpenAPI file: %s", file)
			openAPIFiles = append(openAPIFiles, utils.PathToURI(file))
		}
	}

	utils.LogInfo("Discovered %d OpenAPI files", len(openAPIFiles))
	return openAPIFiles, nil
}

// findFilesInDirectory finds all YAML and JSON files in a directory
func findFilesInDirectory(dir string, recursive bool) ([]string, error) {
	files := make([]string, 0)

	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	for _, entry := range entries {
		// Skip directories unless recursive
		if entry.IsDir() {
			if recursive {
				subDir := filepath.Join(dir, entry.Name())
				subFiles, err := findFilesInDirectory(subDir, true)
				if err != nil {
					utils.LogWarning("Error reading subdirectory %s: %v", subDir, err)
					continue
				}
				files = append(files, subFiles...)
			}
			continue
		}

		// Only process YAML and JSON files
		name := entry.Name()
		if !isYAMLorJSON(name) {
			continue
		}

		fullPath := filepath.Join(dir, name)
		files = append(files, fullPath)
	}

	return files, nil
}

// findFilesInSubdirectories finds YAML/JSON files in subdirectories with depth limit
func findFilesInSubdirectories(dir string, maxDepth int) ([]string, error) {
	if maxDepth <= 0 {
		return []string{}, nil
	}

	files := make([]string, 0)

	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		subDir := filepath.Join(dir, entry.Name())

		// Skip hidden directories and common non-relevant directories
		dirName := entry.Name()
		if strings.HasPrefix(dirName, ".") ||
		   dirName == "node_modules" ||
		   dirName == "vendor" ||
		   dirName == "dist" ||
		   dirName == "build" {
			continue
		}

		// Find files in this subdirectory
		subFiles, err := findFilesInDirectory(subDir, false)
		if err != nil {
			utils.LogWarning("Error reading subdirectory %s: %v", subDir, err)
			continue
		}
		files = append(files, subFiles...)

		// Recursively search deeper subdirectories
		if maxDepth > 1 {
			deeperFiles, err := findFilesInSubdirectories(subDir, maxDepth-1)
			if err != nil {
				utils.LogWarning("Error searching deeper in %s: %v", subDir, err)
				continue
			}
			files = append(files, deeperFiles...)
		}
	}

	return files, nil
}

// isYAMLorJSON checks if a filename has a YAML or JSON extension
func isYAMLorJSON(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	return ext == ".yaml" || ext == ".yml" || ext == ".json"
}

// isOpenAPIFile checks if a file contains an OpenAPI specification
func isOpenAPIFile(filePath string) (bool, error) {
	// Read first 1KB of file (enough to detect "openapi:" marker)
	file, err := os.Open(filePath)
	if err != nil {
		return false, err
	}
	defer file.Close()

	// Read first 1024 bytes
	buf := make([]byte, 1024)
	n, err := file.Read(buf)
	if err != nil && n == 0 {
		return false, err
	}

	content := string(buf[:n])

	// Check for OpenAPI marker
	// YAML: "openapi:"
	// JSON: "openapi"
	hasOpenAPI := strings.Contains(content, "openapi:") ||
		strings.Contains(content, `"openapi"`)

	return hasOpenAPI, nil
}
