// server_processor.go replicates Python arazzo-runner's ServerProcessor class.
// It resolves server URLs from OpenAPI source descriptions, applying variable
// substitution from runtime params, environment variables, or defaults.
package executor

import (
	"fmt"
	"log"
	"net/url"
	"os"
	"strings"

	"github.com/wso2/arazzo-designer-cli/internal/models"
)

// ServerProcessor resolves server URLs for API operations.
type ServerProcessor struct {
	SourceDescriptions map[string]interface{}
}

// NewServerProcessor creates a new ServerProcessor.
func NewServerProcessor(sourceDescs map[string]interface{}) *ServerProcessor {
	return &ServerProcessor{SourceDescriptions: sourceDescs}
}

// ResolveServerURL resolves the server URL for a given source description.
// It checks runtime params for server configuration, falls back to OpenAPI servers,
// and applies variable substitution.
func (sp *ServerProcessor) ResolveServerURL(sourceDescName string, runtimeParams *models.RuntimeParams) string {
	log.Printf("Resolving server URL for source description: %s", sourceDescName)

	// Check runtime params for explicit server configuration
	if runtimeParams != nil && runtimeParams.ServerConfig != nil {
		sc := runtimeParams.ServerConfig
		if sc.URL != "" {
			url := sc.URL
			url = sp.applyServerVariables(url, sc.Variables)
			log.Printf("Using runtime server config URL: %s", url)
			return url
		}
	}

	// Get server URL from source description's OpenAPI spec
	sourceDesc := sp.getSourceDescription(sourceDescName)
	if sourceDesc == nil {
		log.Printf("Source description %s not found", sourceDescName)
		return ""
	}

	servers := sp.getServers(sourceDesc)
	if len(servers) == 0 {
		log.Printf("No servers found in source description %s", sourceDescName)
		return ""
	}

	// Use the first server by default or check runtime params for server index
	serverIndex := 0
	if runtimeParams != nil && runtimeParams.ServerConfig != nil && runtimeParams.ServerConfig.ServerIndex >= 0 {
		serverIndex = runtimeParams.ServerConfig.ServerIndex
		if serverIndex >= len(servers) {
			log.Printf("Server index %d out of range, using 0", serverIndex)
			serverIndex = 0
		}
	}

	server := servers[serverIndex]
	serverURL, _ := server["url"].(string)
	if serverURL == "" {
		log.Printf("Server URL is empty for index %d", serverIndex)
		return ""
	}

	// Apply variable substitution
	serverURL = sp.resolveServerVariables(serverURL, server, runtimeParams)

	// Resolve relative server URLs against the source description URL
	if !strings.HasPrefix(serverURL, "http://") && !strings.HasPrefix(serverURL, "https://") {
		sourceURL, _ := sourceDesc["_source_url"].(string)
		if sourceURL != "" && (strings.HasPrefix(sourceURL, "http://") || strings.HasPrefix(sourceURL, "https://")) {
			if parsed, err := url.Parse(sourceURL); err == nil {
				resolved := fmt.Sprintf("%s://%s%s", parsed.Scheme, parsed.Host, serverURL)
				log.Printf("Resolved relative server URL %s to %s (from source %s)", serverURL, resolved, sourceURL)
				serverURL = resolved
			}
		}
	}

	log.Printf("Resolved server URL: %s", serverURL)
	return strings.TrimRight(serverURL, "/")
}

// resolveServerVariables resolves variables in a server URL template.
// Priority: runtime params > environment variables > defaults from spec.
func (sp *ServerProcessor) resolveServerVariables(url string, server map[string]interface{}, runtimeParams *models.RuntimeParams) string {
	variables := toMap(server["variables"])
	if variables == nil {
		return url
	}

	for varName, varDefRaw := range variables {
		varDef := toMap(varDefRaw)
		if varDef == nil {
			continue
		}

		placeholder := fmt.Sprintf("{%s}", varName)
		if !strings.Contains(url, placeholder) {
			continue
		}

		var value string
		resolved := false

		// 1. Check runtime params
		if runtimeParams != nil && runtimeParams.ServerConfig != nil {
			for _, sv := range runtimeParams.ServerConfig.Variables {
				if sv.Name == varName {
					value = sv.Value
					resolved = true
					break
				}
			}
		}

		// 2. Check environment variables (SERVER_VAR_<NAME> pattern)
		if !resolved {
			envKey := fmt.Sprintf("SERVER_VAR_%s", strings.ToUpper(varName))
			if envVal := os.Getenv(envKey); envVal != "" {
				value = envVal
				resolved = true
				log.Printf("Using env var %s for server variable %s", envKey, varName)
			}
		}

		// 3. Fall back to default
		if !resolved {
			if defaultVal, ok := varDef["default"].(string); ok {
				value = defaultVal
				log.Printf("Using default value for server variable %s: %s", varName, value)
			} else {
				log.Printf("No value found for server variable %s", varName)
				continue
			}
		}

		url = strings.ReplaceAll(url, placeholder, value)
	}

	return url
}

// applyServerVariables applies explicit variable values to a URL template.
func (sp *ServerProcessor) applyServerVariables(url string, variables []models.ServerVariable) string {
	for _, sv := range variables {
		placeholder := fmt.Sprintf("{%s}", sv.Name)
		url = strings.ReplaceAll(url, placeholder, sv.Value)
	}
	return url
}

// getSourceDescription retrieves the parsed OpenAPI spec for a source description name.
func (sp *ServerProcessor) getSourceDescription(name string) map[string]interface{} {
	if sp.SourceDescriptions == nil {
		return nil
	}
	if desc, ok := sp.SourceDescriptions[name]; ok {
		return toMap(desc)
	}
	return nil
}

// getServers extracts the servers array from an OpenAPI spec.
func (sp *ServerProcessor) getServers(spec map[string]interface{}) []map[string]interface{} {
	serversRaw := toSlice(spec["servers"])
	var servers []map[string]interface{}
	for _, s := range serversRaw {
		if sm := toMap(s); sm != nil {
			servers = append(servers, sm)
		}
	}
	return servers
}
