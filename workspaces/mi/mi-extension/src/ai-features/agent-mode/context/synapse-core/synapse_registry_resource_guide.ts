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
\`\`\`

### Common Mistake: Local Entries Are NOT Registry Resources
\`\${registry("conf:/KEY")}\` and \`\${registry("gov:/...")}\` only resolve files registered as \`type="registry/resource"\` in artifact.xml. A \`<localEntry key="FOO">\` lives in the Synapse config (deployed via the .car) — it is **not** a registry resource, and \`\${registry(...)}\` will not see it.

To read a local entry, use the legacy \`get-property('local-entry', ...)\` XPath inside a \`<property>\` mediator:
\`\`\`xml
<localEntry key="FOO"><![CDATA[some inline value]]></localEntry>

<property name="myVar" expression="get-property('local-entry', 'FOO')" scope="default"/>
\`\`\`
Read the bound property in scripts/expressions as \`mc.getProperty('myVar')\` or \`\${props.synapse.myVar}\`. Do NOT use \`\${registry(...)}\` for local entries.`,

secure_vault: `## Secure Vault — Secret Resolution

Synapse resolves \`{wso2:vault-lookup('alias')}\` at deploy time (for local entries / connection init) or at mediation time (for property values). Use it for any credential that would otherwise be committed as plaintext.

### Defining an alias
1. Edit \`repository/conf/security/cipher-tool.properties\` (or equivalent deployment.toml entry): map the alias to the plaintext property key.
2. Put the plaintext in \`repository/conf/security/cipher-text.properties\` (it will be encrypted after running the cipher tool).
3. Run the cipher tool (\`./bin/ciphertool.sh\`) — it encrypts the values in place.
4. At runtime, \`{wso2:vault-lookup('alias')}\` returns the decrypted plaintext.

In deployment.toml-driven projects (MI 4.x default), the vault is usually configured under \`[secrets]\`:
\`\`\`toml
[secrets]
backend.user = "[admin]"
backend.password = "[alias:encryptedValue]"
\`\`\`
This produces aliases \`backend.user\` and \`backend.password\`.

### Usage in XML
\`\`\`xml
<!-- In a connection local entry (resolved at deploy) -->
<localEntry key="BackendConn">
  <http.init>
    <baseUrl>https://api.example.com</baseUrl>
    <authType>Basic</authType>
    <basicCredentialsUsername>{wso2:vault-lookup('backend.user')}</basicCredentialsUsername>
    <basicCredentialsPassword>{wso2:vault-lookup('backend.password')}</basicCredentialsPassword>
  </http.init>
</localEntry>

<!-- In a property mediator (resolved each time) -->
<property name="dbPassword" value="{wso2:vault-lookup('db.password')}" scope="default" type="STRING"/>
\`\`\`

### Pitfalls
- The \`wso2:\` prefix is literal — not a namespace you import. The expression must appear exactly as \`{wso2:vault-lookup('alias')}\`, quotes included.
- Aliases are case-sensitive and must be registered before the artifact that references them is deployed; otherwise you get "Error occurred when resolving value: {wso2:vault-lookup(...)}" and the literal string is used.
- Do not use vault lookups inside \`payload.\` or JSON-path expressions — the substitution runs on the XML text, not JSON values.`,

config_properties: `## config.properties and \`configs.*\` Access

\`config.properties\` in \`src/main/wso2mi/resources/conf/\` is **NOT** automatically loaded by the runtime. Values placed there are only surfaced via the \`\${configs.*}\` expression accessor when the file is registered as a \`config/property\` artifact in \`artifact.xml\`.

### File placement
\`\`\`
src/main/wso2mi/
└── resources/
    └── conf/
        └── config.properties
\`\`\`

\`\`\`properties
# src/main/wso2mi/resources/conf/config.properties
backend.base.url=https://api.example.com
backend.timeout.ms=5000
feature.flag.new_routing=true
\`\`\`

### Registering in artifact.xml
Add a \`config/property\` artifact entry to \`src/main/wso2mi/resources/artifact.xml\` so the CAR build packages the file:

\`\`\`xml
<artifact name="resources_conf_config_properties"
          groupId="com.microintegrator.projects"
          version="1.0.0"
          type="config/property"
          serverRole="EnterpriseIntegrator">
  <item>
    <file>config.properties</file>
    <path>/_system/governance/mi-resources/conf</path>
    <mediaType>text/plain</mediaType>
    <properties></properties>
  </item>
</artifact>
\`\`\`

### Consuming the values
Use the \`configs.*\` expression accessor (see synapse-variable-resolution:configs):
\`\`\`xml
<property name="baseUrl" expression="\${configs.backend.base.url}" scope="default" type="STRING"/>
<property name="timeout" expression="\${configs.backend.timeout.ms}" scope="default" type="INTEGER"/>
\`\`\`

### Startup log noise (non-fatal)
Even with the \`artifact.xml\` entry, the \`ConfigDeployer\` can log messages like:
\`\`\`
value of key 'backend.base.url' not found
\`\`\`
at startup when the property file is processed before the CAR is fully deployed. These are **non-fatal** — the properties resolve correctly once the CAR finishes deploying. Do NOT treat these startup messages as a failure signal unless the runtime actually rejects a \`\${configs.*}\` lookup later at request time.

### When \`configs.*\` is not a good fit
If startup ordering or deployment-environment management is painful, keep the artifact portable — do NOT bake production values into a \`<localEntry>\`. Instead:
- Provide documented **defaults/placeholders** in a \`<localEntry>\` (clearly labelled as examples) and keep the real value injectable per environment, or
- Read from environment/system properties via \`\${sys.env.<VAR>}\` / \`\${vars.envValue}\` patterns (optionally hydrated by a bootstrap sequence).
Hardcoding values in \`<localEntry>\` couples each deploy to a specific environment and defeats the per-environment configuration story that \`configs.*\` is meant to solve.`,

};

// Build full reference by joining all sections
export const SYNAPSE_REGISTRY_RESOURCE_GUIDE_FULL = `# WSO2 MI Registry Resource Guide

${Object.values(SYNAPSE_REGISTRY_RESOURCE_GUIDE_SECTIONS).join('\n\n')}`;
