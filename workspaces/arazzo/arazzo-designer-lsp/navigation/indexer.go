package navigation

import (
	"fmt"
	"time"

	"github.com/arazzo/lsp/utils"
)

// Indexer builds and maintains the operation index
type Indexer struct {
	index *OperationIndex
	cache *FileCache
}

// NewIndexer creates a new indexer with the given operation index
func NewIndexer(index *OperationIndex) *Indexer {
	// Default TTL: 5 minutes
	cache := NewFileCache(5 * time.Minute)
	return &Indexer{
		index: index,
		cache: cache,
	}
}

// NewIndexerWithCache creates a new indexer with custom cache settings
func NewIndexerWithCache(index *OperationIndex, cacheTTL time.Duration) *Indexer {
	cache := NewFileCache(cacheTTL)
	return &Indexer{
		index: index,
		cache: cache,
	}
}

// BuildIndex discovers and indexes OpenAPI files for the given Arazzo file
func (idx *Indexer) BuildIndex(arazzoFileURI string) error {
	utils.LogInfo("Building operation index for: %s", arazzoFileURI)
	startTime := time.Now()

	// Discover OpenAPI files
	files, err := DiscoverOpenAPIFiles(arazzoFileURI)
	if err != nil {
		return fmt.Errorf("failed to discover OpenAPI files: %w", err)
	}

	if len(files) == 0 {
		utils.LogWarning("No OpenAPI files found")
		return nil
	}

	utils.LogInfo("Found %d OpenAPI files to index", len(files))

	// Parse and index each file
	totalOperations := 0
	successfulFiles := 0
	failedFiles := 0

	for _, fileURI := range files {
		err := idx.IndexFile(fileURI)
		if err != nil {
			utils.LogError("Failed to index file %s: %v", fileURI, err)
			failedFiles++
			continue
		}
		successfulFiles++
	}

	// Get total operation count
	totalOperations = idx.index.Count()

	// Get cache stats
	cacheEntries, cacheHits := idx.cache.Stats()

	elapsed := time.Since(startTime)
	utils.LogInfo("Index built: %d operations from %d files (success: %d, failed: %d) in %v",
		totalOperations, len(files), successfulFiles, failedFiles, elapsed)
	utils.LogDebug("Cache stats: %d entries, %d total hits", cacheEntries, cacheHits)

	return nil
}

// IndexFile parses and indexes a single OpenAPI file
func (idx *Indexer) IndexFile(fileURI string) error {
	utils.LogDebug("Indexing file: %s", fileURI)

	var openAPIFile *OpenAPIFile
	var err error

	// Try to get from cache first
	cachedFile, cacheHit := idx.cache.Get(fileURI)
	if cacheHit {
		utils.LogDebug("Cache hit for file: %s", fileURI)
		openAPIFile = cachedFile
	} else {
		utils.LogDebug("Cache miss, parsing file: %s", fileURI)

		// Parse the OpenAPI file
		openAPIFile, err = ParseOpenAPIFile(fileURI)
		if err != nil {
			return fmt.Errorf("failed to parse OpenAPI file: %w", err)
		}

		// Add to cache
		err = idx.cache.Put(fileURI, openAPIFile)
		if err != nil {
			utils.LogWarning("Failed to cache file: %v", err)
		}
	}

	// Add file to index
	openAPIFile.ParsedAt = time.Now()
	idx.index.AddFile(openAPIFile)

	// Add all operations to index
	for _, operation := range openAPIFile.Operations {
		idx.index.AddOperation(operation)
	}

	utils.LogDebug("Indexed %d operations from %s", len(openAPIFile.Operations), fileURI)
	return nil
}

// ReindexFile removes and re-indexes a single file
func (idx *Indexer) ReindexFile(fileURI string) error {
	utils.LogDebug("Re-indexing file: %s", fileURI)

	// Remove existing entries
	idx.index.RemoveFile(fileURI)

	// Invalidate cache
	idx.cache.Invalidate(fileURI)

	// Re-index
	return idx.IndexFile(fileURI)
}

// InvalidateFile removes all operations from a file
func (idx *Indexer) InvalidateFile(fileURI string) {
	utils.LogDebug("Invalidating file: %s", fileURI)
	idx.index.RemoveFile(fileURI)
	idx.cache.Invalidate(fileURI)
}

// GetIndex returns the underlying operation index (read-only access)
func (idx *Indexer) GetIndex() *OperationIndex {
	return idx.index
}

// GetCache returns the file cache (read-only access)
func (idx *Indexer) GetCache() *FileCache {
	return idx.cache
}

// GetCacheStats returns cache statistics
func (idx *Indexer) GetCacheStats() (entries int, totalHits int) {
	return idx.cache.Stats()
}

// CleanExpiredCache removes expired entries from the cache
func (idx *Indexer) CleanExpiredCache() int {
	removed := idx.cache.CleanExpired()
	utils.LogDebug("Cleaned %d expired cache entries", removed)
	return removed
}
