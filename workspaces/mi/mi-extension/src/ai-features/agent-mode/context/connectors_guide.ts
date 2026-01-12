export const CONNECTOR_DOCUMENTATION = `
<CONNECTORS_DOCUMENTATION>
When using connectors, follow these rules:
1. Only use operations defined in the connector JSON signatures.
2. For connectors with \`connectionLocalEntryNeeded\`: true
   - You must define a local entry for each connection type.
   - Always include the name parameter in the init operation.
   - Pass the key of the local entry via configKey in the connector operation for using the connection.
   - If a connector connection has been initialized via a local entry, do not initialize it again elsewhere.
Example: Defining and using a connector with connectionBasedSupport
\`\`\`xml
<localEntry key="EMAIL_CONNECTION_1" xmlns="http://ws.apache.org/ns/synapse">
    <email.init>
        <connectionType>IMAP</connectionType>
        <host>gmail.com</host>
        <enableOAuth2>false</enableOAuth2>
        <port>8899</port>
        <name>EMAIL_CONNECTION_1</name>
        <username>joe</username>
    </email.init>
</localEntry>
\`\`\`
\`\`\`xml
<email.delete configKey="EMAIL_CONNECTION_1"/>
\`\`\`
3. For connectors with \`connectionLocalEntryNeeded\`: false
   - You must initialize the connection via the init operation everytime you use a connector operation in the synaose seqence itself.

4. For connectors with \`noInitializationNeeded\`: true
  - You do not need to initialize the connection via the init operation or a local entry.
  - You can directly use the connector operation.
Example:
\`\`\`xml
  <CSV.csvToJson>
      <headerPresent>Absent</headerPresent>
      <valueSeparator></valueSeparator>
      <columnsToSkip></columnsToSkip>
      <dataRowsToSkip></dataRowsToSkip>
      <csvEmptyValues>Null</csvEmptyValues>
      <jsonKeys></jsonKeys>
      <dataTypes></dataTypes>
      <rootJsonKey></rootJsonKey>
  </CSV.csvToJson>
\`\`\`

5. Never use <class name="..."/> in connector definitions—use the proper connector syntax instead.
6. Implement a complete and functional solution without placeholder comments or partial implementations.
7. Ensure all required parameters for each operation are explicitly included.
8. Do not use the utility connector unless absolutely necessary.

##### Revamped Connector operation response handling:
With the latest updates to **certain connectors**, operations now support two additional parameters:
1. \`responseVariable\` – Use this to store the connector operation response into a named variable.
    - This variable can be referenced later using Synapse expressions. ( \${vars.variable_name_you_defined} )
    - For operations where the response is required later, prefer responseVariable.
2. \`overwriteBody\` – Use this to directly replace the message body/payload with the connector's response.
    - This is useful when you want to pass the response from one connector operation as the request payload for the next. ( \${payload} )
    - For flows where the response must be forwarded, use overwriteBody.

**This connector update is an ongoing effort. So if you get validation errors with some connectors just don't use \`responseVariable\` or \`overwriteBody\` parameters for those connectors. Instead use the old way of handling the response.**
</CONNECTORS_DOCUMENTATION>
`;

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
