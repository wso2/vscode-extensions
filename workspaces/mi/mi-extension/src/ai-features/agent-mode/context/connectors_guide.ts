/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { CONNECTOR_TOOL_NAME } from "../tools/types";

const CONNECTOR_DOCUMENTATION_BASE = `
When using connectors, follow these guidelines.

### 1) Connector Initialization — Decision Tree
Always fetch connector details with ${CONNECTOR_TOOL_NAME} first, then check the summary fields:

\`\`\`
connectionLocalEntryNeeded?
├─ true  → Local entry init (most connectors: HTTP, Email, DB, etc.)
│         1. Create <localEntry> with <connector.init> inside
│         2. Include <name> param matching the local entry key
│         3. Use configKey="..." in operations
│         4. NEVER call .init again in the sequence
│
├─ false → Inline init (legacy connectors)
│         1. Call <connector.init> in the sequence before operations
│         2. No local entry needed
│
└─ noInitializationNeeded: true → No init at all
          Just call operations directly (e.g., CSV, utility connectors)
\`\`\`

**Local entry example** (\`connectionLocalEntryNeeded: true\`):
\`\`\`xml
<localEntry key="EMAIL_CONN" xmlns="http://ws.apache.org/ns/synapse">
    <email.init>
        <connectionType>IMAP</connectionType>
        <host>gmail.com</host>
        <port>993</port>
        <name>EMAIL_CONN</name>
        <username>joe</username>
    </email.init>
</localEntry>
\`\`\`
\`\`\`xml
<email.delete configKey="EMAIL_CONN"/>
\`\`\`

**No-init example** (\`noInitializationNeeded: true\`):
\`\`\`xml
<CSV.csvToJson>
    <headerPresent>Absent</headerPresent>
    <csvEmptyValues>Null</csvEmptyValues>
</CSV.csvToJson>
\`\`\`

### 2) General rules
1. Only use operations defined in connector JSON signatures (via ${CONNECTOR_TOOL_NAME}).
2. Never use \`<class name="..."/>\`. Use proper connector syntax.
3. No placeholders — include all required parameters.
4. \`configKey\` must exactly match the local entry \`key\`.
5. Connector-specific timeouts (e.g., HTTP \`connectionTimeout\`) override global endpoint timeouts. Set them explicitly for long-running operations.
6. Variables set by \`responseVariable\` are available immediately after the connector operation in the same flow scope.
7. Do not use the utility connector unless absolutely necessary.
`;

const CONNECTOR_DOCUMENTATION_REVAMPED_RESPONSE_HANDLING = `
### 4) Revamped response handling (supported only by certain connectors)
Now some connectors support two additional operation parameters ( ongoing connector improvement by WSO2 team ) :
1. \`responseVariable\`
    - Stores connector response in a named variable.
    - Reference later using Synapse expressions (for example, \`\${vars.my_variable}\`).
    - Prefer this when the response is needed later in the flow.
2. \`overwriteBody\`
    - Replaces the message payload/body directly with connector response.
    - Useful when next operation should consume previous response as \`\${payload}\`.
    - Prefer this when response must be forwarded through the flow.
3. Before using \`responseVariable\` or \`overwriteBody\`, verify the selected operation signature/supported parameters include them.
   - If an operation does not support these parameters, fall back to the older response-handling approach.

For other connectors, use the older response-handling approach instead.

### 5) Connector Response Structure
When a connector stores its response in a variable (via \`responseVariable\`), the variable is a **Map** with these keys:
- \`payload\` — the response body (JSON, XML, or text depending on the connector)
- \`headers\` — response headers as a map
- \`attributes\` — metadata including HTTP status code

Access patterns:
\`\`\`xml
<!-- Access response payload -->
\${vars.myResponse.payload}
\${vars.myResponse.payload.someField}

<!-- Access HTTP status code -->
\${vars.myResponse.attributes.statusCode}

<!-- Access response headers -->
\${vars.myResponse.headers["Content-Type"]}
\`\`\`

### 6) Error Handling with Connectors
- First check for transport errors (e.g. connection timeout, DNS failure) where no HTTP status code exists:
\`\`\`xml
<filter xpath="\${not(exists(vars.myResponse.attributes.statusCode))}">
  <then>
    <log category="ERROR">
      <message>Transport error: no response received (timeout or connection failure)</message>
    </log>
    <payloadFactory media-type="json">
      <format>{"error": "Backend unreachable"}</format>
    </payloadFactory>
    <respond/>
  </then>
</filter>
\`\`\`
- Then check for HTTP 4xx/5xx errors when a status code is present:
\`\`\`xml
<filter xpath="\${vars.myResponse.attributes.statusCode >= 400}">
  <then>
    <log category="ERROR">
      <message>Call failed with status: \${vars.myResponse.attributes.statusCode}</message>
    </log>
    <payloadFactory media-type="json">
      <format>{"error": "Backend call failed", "status": \${vars.myResponse.attributes.statusCode}}</format>
    </payloadFactory>
    <respond/>
  </then>
</filter>
\`\`\`
- Connectors that don't support \`responseVariable\` replace the message body directly. Use a fault sequence for error handling.
`;

export const CONNECTOR_DOCUMENTATION_OLD = CONNECTOR_DOCUMENTATION_BASE;

export const CONNECTOR_DOCUMENTATION = `${CONNECTOR_DOCUMENTATION_BASE}
${CONNECTOR_DOCUMENTATION_REVAMPED_RESPONSE_HANDLING}`;

export const AI_CONNECTOR_DOCUMENTATION = `
<AI_CONNECTOR_DOCUMENTATION>
# Guide: Creating AI-Powered Apps with WSO2 Synapse

WSO2 Micro Integrator now supports low-code AI mediators that allow developers to embed LLMs (such as OpenAI GPT) and implement retrieval-augmented generation (RAG) within integration flows. This guide walks through the key building blocks for creating AI-powered apps using Synapse configuration.

---

## Chat Operation

A basic chat operation requires the following two connection types:

1. **LLM Connection**
2. **Memory Connection**

### Step 1: Define Connections

#### LLM Connection
\`\`\`xml
<localEntry key="OPENAI_CONN" xmlns="http://ws.apache.org/ns/synapse">
  <ai.init>
    <connectionType>OPEN_AI</connectionType>
    <apiKey>apiKey</apiKey>
    <baseUrl>https://api.openai.com/v1</baseUrl>
    <name>OPENAI_CONN</name>
  </ai.init>
</localEntry>
\`\`\`

#### Memory Connection
\`\`\`xml
<localEntry key="FILE_MEMORY_CONN" xmlns="http://ws.apache.org/ns/synapse">
  <ai.init>
    <connectionType>FILE_MEMORY</connectionType>
    <name>FILE_MEMORY_CONN</name>
  </ai.init>
</localEntry>
\`\`\`

### Step 2: Create Chat Operation

\`\`\`xml
<ai.chat>
    <connections>
        <llmConfigKey>OPENAI_CONN</llmConfigKey>
        <memoryConfigKey>FILE_MEMORY_CONN</memoryConfigKey>
    </connections>
    <sessionId>{\${payload.userID}}</sessionId>
    <prompt>\${payload.query}</prompt>
    <outputType>string</outputType>
    <responseVariable>ai_chat_1</responseVariable>
    <overwriteBody>true</overwriteBody>
    <modelName>gpt-4o</modelName>
    <temperature>0.7</temperature>
    <maxTokens>4069</maxTokens>
    <topP>1</topP>
    <frequencyPenalty>0</frequencyPenalty>
    <maxHistory>10</maxHistory>
</ai.chat>
\`\`\`

## RAG Chat Operation

RAG Chat uses additional configurations to retrieve knowledge from a vector store.

Required Connections
    1.  LLM Connection (same as before)
    2.  Memory Connection (same as before)
    3.  Embedding Model Connection (can reuse LLM connection)
    4.  Vector Store Connection

Example: Vector store connection:
\`\`\`xml
<localEntry key="KB_CONN" xmlns="http://ws.apache.org/ns/synapse">
  <ai.init>
    <connectionType>MI_VECTOR_STORE</connectionType>
    <name>KB_CONN</name>
  </ai.init>
</localEntry>
\`\`\`

### Define RAG Chat Operation
\`\`\`xml
<ai.ragChat>
    <connections>
        <llmConfigKey>OPENAI_CONN</llmConfigKey>
        <memoryConfigKey>FILE_MEMORY_CONN</memoryConfigKey>
        <embeddingConfigKey>OPENAI_CONN</embeddingConfigKey>
        <vectorStoreConfigKey>KB_CONN</vectorStoreConfigKey>
    </connections>
    <sessionId>{\${payload.userID}}</sessionId>
    <prompt>\${payload.query}</prompt>
    <outputType>string</outputType>
    <responseVariable>ai_ragChat_1</responseVariable>
    <overwriteBody>true</overwriteBody>
    <embeddingModel>text-embedding-3-small</embeddingModel>
    <maxResults>5</maxResults>
    <minScore>0.75</minScore>
    <modelName>gpt-4o</modelName>
    <temperature>0.7</temperature>
    <maxTokens>4069</maxTokens>
    <topP>1</topP>
    <frequencyPenalty>0</frequencyPenalty>
    <maxHistory>10</maxHistory>
</ai.ragChat>
\`\`\`

## Adding data to vector store

\`\`\`xml
<ai.addToKnowledge>
    <connections>
        <embeddingConfigKey>OPENAI_CONN</embeddingConfigKey>
        <vectorStoreConfigKey>KB_CONN</vectorStoreConfigKey>
    </connections>
    <input>{\${payload.content}}</input>
    <needParse>false</needParse>
    <needSplit>true</needSplit>
    <splitStrategy>Recursive</splitStrategy>
    <maxSegmentSize>1000</maxSegmentSize>
    <maxOverlapSize>200</maxOverlapSize>
    <needEmbedding>true</needEmbedding>
    <embeddingModel>text-embedding-3-small</embeddingModel>
    <responseVariable>ai_addToKnowledge_1</responseVariable>
    <overwriteBody>true</overwriteBody>
</ai.addToKnowledge>
\`\`\`

## Retrieving data from vector store

\`\`\`xml
<ai.getFromKnowledge>
    <connections>
        <embeddingConfigKey>OPENAI_CONN</embeddingConfigKey>
        <vectorStoreConfigKey>KB_CONN</vectorStoreConfigKey>
    </connections>
    <input>{\${payload.content}}</input>
    <needEmbedding>true</needEmbedding>
    <embeddingModel>text-embedding-3-small</embeddingModel>
    <maxResults>5</maxResults>
    <minScore>0.75</minScore>
    <responseVariable>ai_getFromKnowledge_1</responseVariable>
    <overwriteBody>true</overwriteBody>
</ai.getFromKnowledge>
\`\`\`

## Creating an agent with tools

Agents allow LLMs to call custom tools during conversation flow.

### Tool Creation Steps
1.  Define a template using Synapse logic.
2.  Define functionParams as input parameters. (parameters you define in templates will be passed to the tool as functionParams by llm.)
3.  You can use any connector operation or synapse logic within the tool template.

Example: Email tool
\`\`\`xml
<template name="Send" xmlns="http://ws.apache.org/ns/synapse">
    <description>Sends an email message.</description>
    <parameter isMandatory="false" name="personalName" description="The personal name of the message sender"/>
    <sequence>
        <email.send configKey="fsggfs">
            <from>sfgfg</from>
            <personalName>{\${params.functionParams.personalName}}</personalName>
            ...
        </email.send>
    </sequence>
</template>
\`\`\`

Example: Knowledge retrieval tool
\`\`\`xml
<template name="ai_getFromKnowledge_tool_1" xmlns="http://ws.apache.org/ns/synapse">
    <description>Get the PineValley bank documents from the knowledge base</description>
    <parameter isMandatory="true" name="input"/>
    <sequence>
        <ai.getFromKnowledge>
            ...
        </ai.getFromKnowledge>
    </sequence>
</template>
\`\`\`

Example: API call tool
\`\`\`xml
<template name="http_post_tool_1" xmlns="http://ws.apache.org/ns/synapse">
    <description>Get customer information</description>
    <parameter name="requestBodyJson" isMandatory="false"/>
    <sequence>
        <http.post configKey="BankMockAPI_CONN">
            ...
        </http.post>
    </sequence>
</template>
\`\`\`

### Agent Definition Steps

1.  Use <ai.agent> to define your agent.
2.  Add tools in the <tools> block with:
- name: Name of the tool
- template: Name of the template
- resultExpression: Synapse expression to get the result of the tool template
- description: Description of the tool for llm to understand the tool

Tools will be executed automatically by WSO2 MI and results will be send back to the llm.

Example:
\`\`\`xml
<ai.agent>
    <connections>
        <llmConfigKey>OPENAI_CONN</llmConfigKey>
        <memoryConfigKey>FILE_MEMORY_CONN</memoryConfigKey>
    </connections>
    <sessionId>{\${payload.userID}}</sessionId>
    <role>PineValley Bank Customer Assistant</role>
    <instructions>Assist customers with investments, account creation, and document retrieval.</instructions>
    <prompt>\${payload}</prompt>
    <responseVariable>ai_agent_1</responseVariable>
    <overwriteBody>true</overwriteBody>
    <tools>
        <tool name="CustomerInfoTool" template="http_post_tool_1" resultExpression="\${vars.http_post_759.payload}" description="Fetch customer data"/>
        <tool name="GetBankDocumentsTool" template="ai_getFromKnowledge_tool_1" resultExpression="\${vars.ai_getFromKnowledge_571.payload}" description="Retrieve official bank documents"/>
        <tool name="InvestmentCreationTool" template="http_post_tool_2" resultExpression="\${vars.http_post_809.payload}" description="Create investment account"/>
    </tools>
</ai.agent>
\`\`\`
</AI_CONNECTOR_DOCUMENTATION>
`;
