/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * WSO2 MI Registry Resource Guide
 * Comprehensive reference for creating and managing registry resources in MI projects.
 *
 * Section-based exports for granular context loading.
 * Usage: SYNAPSE_REGISTRY_RESOURCE_GUIDE_SECTIONS["artifact_xml"] for artifact.xml patterns.
 *        SYNAPSE_REGISTRY_RESOURCE_GUIDE_FULL for entire reference.
 */

export const SYNAPSE_REGISTRY_RESOURCE_GUIDE_SECTIONS: Record<string, string> = {

overview: `## Registry Resources Overview

Registry resources are supporting files (JSON schemas, XSLT stylesheets, WSDL definitions, scripts, etc.) that are deployed alongside Synapse artifacts and accessible at runtime via the MI registry.

### Project Directory Structure
\`\`\`
src/main/wso2mi/
├── artifacts/          # Synapse artifacts (APIs, sequences, endpoints, etc.)
│   └── artifact.xml    # Synapse artifact manifest
├── resources/          # Registry resources go here
│   ├── artifact.xml    # Registry resource manifest (separate from artifacts/artifact.xml)
│   ├── json/           # JSON files (schemas, configs, templates)
│   ├── xslt/           # XSLT stylesheets
│   ├── scripts/        # Script files (JS, Groovy)
│   ├── wsdl/           # WSDL definitions
│   ├── xsd/            # XML Schema definitions
│   └── datamapper/     # Data mapper configs (managed by create_data_mapper tool)
├── api-definitions/    # Swagger/OpenAPI definitions (NOT registry resources)
├── conf/               # Configuration files (NOT registry resources)
├── connectors/         # Connector ZIPs (NOT registry resources)
└── metadata/           # Metadata files (NOT registry resources)
\`\`\`

### Key Rules
- Only files under \`src/main/wso2mi/resources/\` are registry resources
- Each resource needs an entry in \`src/main/wso2mi/resources/artifact.xml\`
- Files under api-definitions, conf, connectors, and metadata are NOT registry resources
- Data mapper resources are auto-managed by the create_data_mapper tool — do not manually edit their artifact.xml entries`,

artifact_xml: `## artifact.xml Format and Patterns

The registry resource manifest is at \`src/main/wso2mi/resources/artifact.xml\`. It tracks all registry resources for deployment.

### File Resource (single file)
\`\`\`xml
<?xml version="1.0" encoding="UTF-8"?>
<artifacts>
  <artifact name="resources_json_config_json" groupId="com.microintegrator.projects" version="1.0.0" type="registry/resource" serverRole="EnterpriseIntegrator">
    <item>
      <file>config.json</file>
      <path>/_system/governance/mi-resources/json</path>
      <mediaType>application/json</mediaType>
      <properties></properties>
    </item>
  </artifact>
</artifacts>
\`\`\`

### Collection Resource (directory)
\`\`\`xml
<artifact name="resources_schemas" groupId="com.microintegrator.projects" version="1.0.0" type="registry/resource" serverRole="EnterpriseIntegrator">
  <collection>
    <directory>schemas</directory>
    <path>/_system/governance/mi-resources/schemas</path>
    <properties></properties>
  </collection>
</artifact>
\`\`\`

### Multiple Resources in One Manifest
\`\`\`xml
<?xml version="1.0" encoding="UTF-8"?>
<artifacts>
  <artifact name="resources_xslt_transform_xslt" groupId="com.microintegrator.projects" version="1.0.0" type="registry/resource" serverRole="EnterpriseIntegrator">
    <item>
      <file>transform.xslt</file>
      <path>/_system/governance/mi-resources/xslt</path>
      <mediaType>application/xslt+xml</mediaType>
      <properties></properties>
    </item>
  </artifact>
  <artifact name="resources_json_schema_json" groupId="com.microintegrator.projects" version="1.0.0" type="registry/resource" serverRole="EnterpriseIntegrator">
    <item>
      <file>schema.json</file>
      <path>/_system/governance/mi-resources/json</path>
      <mediaType>application/json</mediaType>
      <properties></properties>
    </item>
  </artifact>
</artifacts>
\`\`\`

### Artifact Attributes
| Attribute | Value | Notes |
|-----------|-------|-------|
| name | Unique identifier | Convention: \`resources_<subdir>_<filename_with_ext>\` with dots/hyphens replaced by underscores |
| groupId | From project pom.xml | Typically \`com.microintegrator.projects\` |
| version | From project pom.xml | Typically \`1.0.0\` |
| type | \`registry/resource\` | Always this value |
| serverRole | \`EnterpriseIntegrator\` | Always this value |

### Naming Convention
The artifact name should be unique and derive from the file path under resources/:
- \`resources/json/config.json\` → name: \`resources_json_config_json\`
- \`resources/xslt/transform.xslt\` → name: \`resources_xslt_transform_xslt\`
- \`resources/scripts/validate.js\` → name: \`resources_scripts_validate_js\`
- \`resources/wsdl/service.wsdl\` → name: \`resources_wsdl_service_wsdl\`

Replace path separators, dots, and hyphens with underscores.`,

registry_paths: `## Registry Paths and Access

### Registry Path Prefixes
| Prefix | Full Path | Description |
|--------|-----------|-------------|
| \`gov:/\` | \`/_system/governance/\` | Governance registry — standard location for MI resources |
| \`conf:/\` | \`/_system/config/\` | Configuration registry — for config-level resources |

Resources under \`src/main/wso2mi/resources/\` are deployed to \`/_system/governance/mi-resources/\` by convention.

### Accessing Resources from Synapse Configurations

**In mediator attributes (key-based access):**
\`\`\`xml
<!-- XSLT Mediator: reference an XSLT stylesheet -->
<xslt key="gov:/mi-resources/xslt/transform.xslt"/>

<!-- Script Mediator: reference a script file -->
<script language="js" key="gov:/mi-resources/scripts/validate.js"/>

<!-- Schema Validation: reference an XSD -->
<validate>
  <schema key="gov:/mi-resources/xsd/schema.xsd"/>
</validate>

<!-- Local Entry pointing to registry resource -->
<localEntry key="my_schema" src="gov:/mi-resources/json/schema.json"/>

<!-- WSDL-based endpoint -->
<endpoint>
  <wsdl uri="gov:/mi-resources/wsdl/service.wsdl" service="MyService" port="MyPort"/>
</endpoint>
\`\`\`

**In expressions (dynamic registry access):**
\`\`\`xml
<!-- Read entire resource as string -->
<property name="config" expression="\${registry(&quot;gov:/mi-resources/json/config.json&quot;)}"/>

<!-- Read a property from a resource -->
<property name="url" expression="\${registry(&quot;gov:/mi-resources/json/config.json&quot;).property(&quot;endpoint.url&quot;)}"/>

<!-- Access JSON content via JSONPath -->
<property name="name" expression="\${registry(&quot;gov:/mi-resources/json/data.json&quot;).items[0].name}"/>
\`\`\`

### Path Mapping
The \`<path>\` in artifact.xml determines the runtime registry path:
- File at \`resources/json/config.json\` with path \`/_system/governance/mi-resources/json\`
  → accessible as \`gov:/mi-resources/json/config.json\`
- File at \`resources/xslt/transform.xslt\` with path \`/_system/governance/mi-resources/xslt\`
  → accessible as \`gov:/mi-resources/xslt/transform.xslt\``,

media_types: `## Media Types Reference

Common media types for registry resources:

| File Type | Extension | Media Type |
|-----------|-----------|------------|
| JSON | .json | \`application/json\` |
| XML | .xml | \`application/xml\` |
| XSLT | .xslt, .xsl | \`application/xslt+xml\` |
| XSD | .xsd | \`application/x-xsd+xml\` |
| WSDL | .wsdl | \`application/wsdl+xml\` |
| JavaScript | .js | \`application/javascript\` |
| Groovy | .groovy | \`application/x-groovy\` |
| Text | .txt | \`text/plain\` |
| CSV | .csv | \`text/csv\` |
| HTML | .html | \`text/html\` |
| YAML | .yaml, .yml | \`application/x-yaml\` |
| Properties | .properties | \`text/plain\` |
| WS-Policy | .xml | \`application/wspolicy+xml\` |
| SQL | .sql | \`application/sql\` |`,

properties: `## Resource Properties

Registry resources can have key-value properties attached. These are accessible at runtime via the registry expression property accessor.

### Defining Properties in artifact.xml
\`\`\`xml
<artifact name="resources_json_config_json" groupId="com.microintegrator.projects" version="1.0.0" type="registry/resource" serverRole="EnterpriseIntegrator">
  <item>
    <file>config.json</file>
    <path>/_system/governance/mi-resources/json</path>
    <mediaType>application/json</mediaType>
    <properties>
      <property name="endpoint.url" value="https://api.example.com"/>
      <property name="timeout" value="30000"/>
      <property name="version" value="2.0"/>
    </properties>
  </item>
</artifact>
\`\`\`

### Accessing Properties at Runtime
\`\`\`xml
<!-- Read a property value -->
<property name="url" expression="\${registry(&quot;gov:/mi-resources/json/config.json&quot;).property(&quot;endpoint.url&quot;)}"/>
<property name="timeout" expression="\${registry(&quot;gov:/mi-resources/json/config.json&quot;).property(&quot;timeout&quot;)}"/>
\`\`\`

### Use Cases for Properties
- Externalized configuration (URLs, timeouts, feature flags)
- Environment-specific overrides (properties can be changed without modifying the resource file)
- Metadata about the resource (version, description, owner)`,

common_patterns: `## Common Registry Resource Patterns

### Pattern 1: JSON Configuration File
**File:** \`src/main/wso2mi/resources/json/config.json\`
\`\`\`json
{
  "apiEndpoint": "https://api.example.com/v1",
  "maxRetries": 3,
  "timeout": 30000
}
\`\`\`

**artifact.xml entry:**
\`\`\`xml
<artifact name="resources_json_config_json" groupId="com.microintegrator.projects" version="1.0.0" type="registry/resource" serverRole="EnterpriseIntegrator">
  <item>
    <file>config.json</file>
    <path>/_system/governance/mi-resources/json</path>
    <mediaType>application/json</mediaType>
    <properties></properties>
  </item>
</artifact>
\`\`\`

**Usage in Synapse:**
\`\`\`xml
<property name="endpoint" expression="\${registry(&quot;gov:/mi-resources/json/config.json&quot;).apiEndpoint}" scope="default" type="STRING"/>
\`\`\`

### Pattern 2: XSLT Transformation
**File:** \`src/main/wso2mi/resources/xslt/response-transform.xslt\`

**artifact.xml entry:**
\`\`\`xml
<artifact name="resources_xslt_response_transform_xslt" groupId="com.microintegrator.projects" version="1.0.0" type="registry/resource" serverRole="EnterpriseIntegrator">
  <item>
    <file>response-transform.xslt</file>
    <path>/_system/governance/mi-resources/xslt</path>
    <mediaType>application/xslt+xml</mediaType>
    <properties></properties>
  </item>
</artifact>
\`\`\`

**Usage in Synapse:**
\`\`\`xml
<xslt key="gov:/mi-resources/xslt/response-transform.xslt"/>
\`\`\`

### Pattern 3: Script File
**File:** \`src/main/wso2mi/resources/scripts/validate-payload.js\`

**artifact.xml entry:**
\`\`\`xml
<artifact name="resources_scripts_validate_payload_js" groupId="com.microintegrator.projects" version="1.0.0" type="registry/resource" serverRole="EnterpriseIntegrator">
  <item>
    <file>validate-payload.js</file>
    <path>/_system/governance/mi-resources/scripts</path>
    <mediaType>application/javascript</mediaType>
    <properties></properties>
  </item>
</artifact>
\`\`\`

**Usage in Synapse:**
\`\`\`xml
<script language="js" key="gov:/mi-resources/scripts/validate-payload.js">
  <![CDATA[/* inline script or loaded from registry */]]>
</script>
\`\`\`

### Pattern 4: JSON Schema for Validation
**File:** \`src/main/wso2mi/resources/json/request-schema.json\`

**Usage with Validate mediator (via local entry):**
\`\`\`xml
<localEntry key="request_schema">
  <![CDATA[{ "$schema": "http://json-schema.org/draft-07/schema#", ... }]]>
</localEntry>
<!-- Or reference from registry -->
<validate>
  <schema key="gov:/mi-resources/json/request-schema.json"/>
</validate>
\`\`\`

### Pattern 5: WSDL for SOAP Services
**File:** \`src/main/wso2mi/resources/wsdl/backend-service.wsdl\`

**artifact.xml entry:**
\`\`\`xml
<artifact name="resources_wsdl_backend_service_wsdl" groupId="com.microintegrator.projects" version="1.0.0" type="registry/resource" serverRole="EnterpriseIntegrator">
  <item>
    <file>backend-service.wsdl</file>
    <path>/_system/governance/mi-resources/wsdl</path>
    <mediaType>application/wsdl+xml</mediaType>
    <properties></properties>
  </item>
</artifact>
\`\`\``,

};

// Build full reference by joining all sections
export const SYNAPSE_REGISTRY_RESOURCE_GUIDE_FULL = `# WSO2 MI Registry Resource Guide

${Object.values(SYNAPSE_REGISTRY_RESOURCE_GUIDE_SECTIONS).join('\n\n')}`;
