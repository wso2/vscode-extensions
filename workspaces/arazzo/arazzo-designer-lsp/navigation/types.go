package navigation

import (
	"os"
	"strings"
	"sync"
	"time"
)

// OperationIndex stores the mapping of operationIds to their definitions
type OperationIndex struct {
	Operations map[string]*OperationInfo
	Files      map[string]*OpenAPIFile
	mutex      sync.RWMutex
}

// OperationInfo contains information about an OpenAPI operation
type OperationInfo struct {
	OperationID string
	Method      string   // GET, POST, PUT, DELETE, etc.
	Path        string   // /pets/{petId}
	Summary     string
	Description string
	FileURI     string
	FileName    string   // Base filename for display
	LineNumber  int
	Column      int
	Tags        []string
}

// OpenAPIFile represents a parsed OpenAPI specification file
type OpenAPIFile struct {
	URI        string
	Version    string
	Title      string
	Description string
	Operations []*OperationInfo
	ParsedAt   time.Time
}

// NewOperationIndex creates a new operation index
func NewOperationIndex() *OperationIndex {
	return &OperationIndex{
		Operations: make(map[string]*OperationInfo),
		Files:      make(map[string]*OpenAPIFile),
	}
}

// AddOperation adds an operation to the index (thread-safe)
func (idx *OperationIndex) AddOperation(op *OperationInfo) {
	idx.mutex.Lock()
	defer idx.mutex.Unlock()

	// Check for duplicates
	if existing, exists := idx.Operations[op.OperationID]; exists {
		// Log warning about duplicate
		// For now, we keep the first occurrence
		_ = existing
		return
	}

	idx.Operations[op.OperationID] = op
}

// AddFile adds a parsed OpenAPI file to the index
func (idx *OperationIndex) AddFile(file *OpenAPIFile) {
	idx.mutex.Lock()
	defer idx.mutex.Unlock()

	idx.Files[file.URI] = file
}

// Lookup finds an operation by its operationId (thread-safe)
func (idx *OperationIndex) Lookup(operationID string) (*OperationInfo, bool) {
	idx.mutex.RLock()
	defer idx.mutex.RUnlock()

	op, found := idx.Operations[operationID]
	return op, found
}

// RemoveFile removes all operations from a file (thread-safe)
func (idx *OperationIndex) RemoveFile(fileURI string) {
	idx.mutex.Lock()
	defer idx.mutex.Unlock()

	// Remove file
	delete(idx.Files, fileURI)

	// Remove all operations from this file
	for opID, op := range idx.Operations {
		if op.FileURI == fileURI {
			delete(idx.Operations, opID)
		}
	}
}

// ListAll returns all operations (thread-safe)
func (idx *OperationIndex) ListAll() []*OperationInfo {
	idx.mutex.RLock()
	defer idx.mutex.RUnlock()

	ops := make([]*OperationInfo, 0, len(idx.Operations))
	for _, op := range idx.Operations {
		ops = append(ops, op)
	}

	return ops
}

// Count returns the number of indexed operations
func (idx *OperationIndex) Count() int {
	idx.mutex.RLock()
	defer idx.mutex.RUnlock()

	return len(idx.Operations)
}

// Clear removes all entries from the index
func (idx *OperationIndex) Clear() {
	idx.mutex.Lock()
	defer idx.mutex.Unlock()

	idx.Operations = make(map[string]*OperationInfo)
	idx.Files = make(map[string]*OpenAPIFile)
}

// FileCache provides caching for parsed OpenAPI files with TTL
type FileCache struct {
	entries map[string]*CacheEntry
	mutex   sync.RWMutex
	ttl     time.Duration
}

// CacheEntry represents a cached file with metadata
type CacheEntry struct {
	File      *OpenAPIFile
	ModTime   time.Time
	CachedAt  time.Time
	HitCount  int
}

// NewFileCache creates a new file cache with the given TTL
func NewFileCache(ttl time.Duration) *FileCache {
	return &FileCache{
		entries: make(map[string]*CacheEntry),
		ttl:     ttl,
	}
}

// Get retrieves a file from cache if valid
func (fc *FileCache) Get(fileURI string) (*OpenAPIFile, bool) {
	fc.mutex.RLock()
	defer fc.mutex.RUnlock()

	entry, exists := fc.entries[fileURI]
	if !exists {
		return nil, false
	}

	// Check if cache entry is still valid (TTL not expired)
	if time.Since(entry.CachedAt) > fc.ttl {
		return nil, false
	}

	// Check if file has been modified since caching
	filePath := strings.TrimPrefix(fileURI, "file://")
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		// File might have been deleted
		return nil, false
	}

	if !fileInfo.ModTime().Equal(entry.ModTime) {
		// File has been modified
		return nil, false
	}

	// Cache hit - update hit count
	entry.HitCount++
	return entry.File, true
}

// Put adds or updates a file in the cache
func (fc *FileCache) Put(fileURI string, file *OpenAPIFile) error {
	fc.mutex.Lock()
	defer fc.mutex.Unlock()

	// Get file modification time
	filePath := strings.TrimPrefix(fileURI, "file://")
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		return err
	}

	fc.entries[fileURI] = &CacheEntry{
		File:     file,
		ModTime:  fileInfo.ModTime(),
		CachedAt: time.Now(),
		HitCount: 0,
	}

	return nil
}

// Invalidate removes a file from the cache
func (fc *FileCache) Invalidate(fileURI string) {
	fc.mutex.Lock()
	defer fc.mutex.Unlock()

	delete(fc.entries, fileURI)
}

// Clear removes all entries from the cache
func (fc *FileCache) Clear() {
	fc.mutex.Lock()
	defer fc.mutex.Unlock()

	fc.entries = make(map[string]*CacheEntry)
}

// Stats returns cache statistics
func (fc *FileCache) Stats() (entries int, totalHits int) {
	fc.mutex.RLock()
	defer fc.mutex.RUnlock()

	entries = len(fc.entries)
	for _, entry := range fc.entries {
		totalHits += entry.HitCount
	}

	return entries, totalHits
}

// CleanExpired removes expired entries from the cache
func (fc *FileCache) CleanExpired() int {
	fc.mutex.Lock()
	defer fc.mutex.Unlock()

	removed := 0
	for uri, entry := range fc.entries {
		if time.Since(entry.CachedAt) > fc.ttl {
			delete(fc.entries, uri)
			removed++
		}
	}

	return removed
}
