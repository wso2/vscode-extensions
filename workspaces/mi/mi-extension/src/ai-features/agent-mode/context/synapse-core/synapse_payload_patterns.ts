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

/**
 * Payload Transformation Cookbook for WSO2 Synapse
 * Practical patterns for common payload transformations.
 *
 * Section-based exports for granular context loading.
 */

export const SYNAPSE_PAYLOAD_PATTERNS_SECTIONS: Record<string, string> = {

json_construction: `## JSON Payload Construction

### Basic JSON with PayloadFactory
\`\`\`xml
<payloadFactory media-type="json">
  <format>{
    "name": "\${payload.firstName}",
    "age": \${payload.age},
    "active": \${payload.isActive},
    "address": \${payload.address},
    "tags": \${payload.tags}
  }</format>
</payloadFactory>
\`\`\`

### Quoting Rules
| Value Type | Quote? | Example |
|-----------|--------|---------|
| String | YES — double quotes | \`"name": "\${payload.name}"\` |
| Number | NO | \`"count": \${payload.count}\` |
| Boolean | NO | \`"active": \${payload.active}\` |
| Null | NO | \`"value": null\` or \`\${exists(payload.x) ? payload.x : null}\` |
| Object | NO | \`"data": \${payload.nested}\` |
| Array | NO | \`"items": \${payload.items}\` |

### Dynamic Null Handling
\`\`\`xml
<payloadFactory media-type="json">
  <format>{
    "name": "\${payload.name}",
    "email": \${exists(payload.email) ? payload.email : null}
  }</format>
</payloadFactory>
\`\`\`
Note: For string fields that might be null, you need: \`\${exists(payload.email) ? '"' + payload.email + '"' : "null"}\`

### Constructing Arrays
\`\`\`xml
<!-- Pass through an existing array -->
<payloadFactory media-type="json">
  <format>{"items": \${payload.orderItems}}</format>
</payloadFactory>

<!-- Build a new array from individual values -->
<payloadFactory media-type="json">
  <format>{"ids": [\${vars.id1}, \${vars.id2}, \${vars.id3}]}</format>
</payloadFactory>
\`\`\`
`,

xml_construction: `## XML Payload Construction

### Basic XML with PayloadFactory
\`\`\`xml
<payloadFactory media-type="xml">
  <format>
    <Order xmlns="http://example.com/orders">
      <OrderId>\${payload.orderId}</OrderId>
      <Customer>\${payload.customerName}</Customer>
      <Amount>\${payload.amount}</Amount>
    </Order>
  </format>
</payloadFactory>
\`\`\`

### Multiple Namespaces
\`\`\`xml
<payloadFactory media-type="xml">
  <format>
    <ord:Order xmlns:ord="http://example.com/orders"
               xmlns:cust="http://example.com/customers">
      <ord:Id>\${payload.orderId}</ord:Id>
      <cust:Customer>
        <cust:Name>\${payload.customerName}</cust:Name>
      </cust:Customer>
    </ord:Order>
  </format>
</payloadFactory>
\`\`\`

### Special Characters in XML Values
Use XML escaping inside the format element:
- \`&amp;amp;\` for \`&\` in values
- \`&amp;lt;\` for \`<\` in values
- \`&amp;gt;\` for \`>\` in values

Or use CDATA for text content:
\`\`\`xml
<payloadFactory media-type="xml">
  <format>
    <Data><![CDATA[\${payload.rawContent}]]></Data>
  </format>
</payloadFactory>
\`\`\`

### Full SOAP Envelope Construction
When the root element is \`Envelope\` with a SOAP namespace, payloadFactory replaces the **entire message envelope** (not just the body):
\`\`\`xml
<payloadFactory media-type="xml">
  <format>
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                      xmlns:ser="http://example.com/service">
      <soapenv:Header/>
      <soapenv:Body>
        <ser:GetCustomer>
          <ser:CustomerId>\${vars.customerId}</ser:CustomerId>
        </ser:GetCustomer>
      </soapenv:Body>
    </soapenv:Envelope>
  </format>
</payloadFactory>
\`\`\`
`,

json_to_xml: `## JSON to XML Conversion

### Using PayloadFactory
The simplest approach — read JSON fields, output XML:
\`\`\`xml
<!-- Input: {"name": "John", "age": 30} -->
<payloadFactory media-type="xml">
  <format>
    <Person xmlns="http://example.com/person">
      <Name>\${payload.name}</Name>
      <Age>\${payload.age}</Age>
    </Person>
  </format>
</payloadFactory>
\`\`\`

### JSON Array to XML
\`\`\`xml
<!-- Store original payload -->
<variable name="items" type="JSON" expression="\${payload.items}"/>

<!-- Build XML wrapper, iterate items with forEach -->
<payloadFactory media-type="xml">
  <format><Items xmlns="http://example.com"/></format>
</payloadFactory>

<foreach collection="\${vars.items}">
  <sequence>
    <!-- Each iteration: payload = current array element -->
    <enrich>
      <source type="inline"><Item xmlns="http://example.com"><Name/><Price/></Item></source>
      <target type="body" action="child"/>
    </enrich>
  </sequence>
</foreach>
\`\`\`

### Property-Based Approach for Simple Cases
\`\`\`xml
<variable name="name" type="STRING" expression="\${payload.name}"/>
<variable name="age" type="STRING" expression="\${string(payload.age)}"/>
<payloadFactory media-type="xml">
  <format>
    <Person>
      <Name>\${vars.name}</Name>
      <Age>\${vars.age}</Age>
    </Person>
  </format>
</payloadFactory>
\`\`\`
`,

xml_to_json: `## XML to JSON Conversion

### Auto-Conversion After SOAP Call
After a \`<call>\` to a SOAP endpoint (format="soap11" or "soap12"), the response payload is **automatically converted to JSON**. JSON keys match XML local names (namespace prefixes stripped).

\`\`\`xml
<!-- SOAP response XML (internal):
  <ns:GetCustomerResponse xmlns:ns="http://example.com">
    <ns:Name>John</ns:Name>
    <ns:Age>30</ns:Age>
  </ns:GetCustomerResponse>
-->

<!-- After call, access as JSON: -->
<log><message>\${payload.GetCustomerResponse.Name}</message></log>
\`\`\`

### Manual Conversion with PayloadFactory
Extract XML values using xpath(), then construct JSON:
\`\`\`xml
<variable name="custName" expression="\${xpath(&quot;string($body//*[local-name()='Name'])&quot;)}" type="STRING"/>
<variable name="custAge" expression="\${xpath(&quot;string($body//*[local-name()='Age'])&quot;)}" type="STRING"/>

<payloadFactory media-type="json">
  <format>{"name": "\${vars.custName}", "age": \${vars.custAge}}</format>
</payloadFactory>
\`\`\`

### Important: Don't Store SOAP Response as XML Variable
\`\`\`xml
<!-- WRONG — throws WstxUnexpectedCharException -->
<variable name="resp" type="XML" expression="\${payload}"/>

<!-- CORRECT — store as STRING or JSON -->
<variable name="resp" type="JSON" expression="\${payload}"/>
\`\`\`
`,

enrich_patterns: `## Enrich Mediator Patterns

### Add Child to JSON Array
\`\`\`xml
<enrich>
  <source type="inline" clone="true">{"newItem": "value"}</source>
  <target type="custom" action="child" xpath="$.items"/>
</enrich>
\`\`\`

### Replace Entire Body with Variable
\`\`\`xml
<enrich>
  <source type="variable">savedPayload</source>
  <target type="body"/>
</enrich>
\`\`\`

### Save Body to Variable
\`\`\`xml
<variable name="originalPayload" type="JSON" expression="\${payload}"/>
<!-- Or using enrich: -->
<enrich>
  <source type="body" clone="true"/>
  <target type="variable">originalPayload</target>
</enrich>
\`\`\`

### Replace a Specific JSON Field
\`\`\`xml
<enrich>
  <source type="inline" clone="true">"updated_value"</source>
  <target type="custom" action="replace" xpath="$.data.status"/>
</enrich>
\`\`\`

### Merge JSON Objects
\`\`\`xml
<!-- Add fields from one object into another -->
<enrich>
  <source type="custom" xpath="\${vars.additionalData}"/>
  <target type="custom" action="child" xpath="$.response"/>
</enrich>
\`\`\`

### Remove a JSON Field
\`\`\`xml
<enrich>
  <source type="custom" xpath="$.sensitiveField"/>
  <target type="body" action="remove"/>
</enrich>
\`\`\`

### Rename a JSON Key
\`\`\`xml
<enrich>
  <source type="inline" clone="true">newKeyName</source>
  <target type="key" xpath="$.oldKeyName"/>
</enrich>
\`\`\`
`,

freemarker_patterns: `## FreeMarker Template Patterns

FreeMarker templates offer full programming constructs (conditionals, loops, etc.) inside payloadFactory.

### Basic FreeMarker JSON
\`\`\`xml
<payloadFactory media-type="json" template-type="FREEMARKER">
  <format><![CDATA[{
    "name": "\${payload.customer_name}",
    "id": "\${vars.customer_id}",
    "host": "\${headers["Host"]}"
  }]]></format>
</payloadFactory>
\`\`\`

### Conditional Fields
\`\`\`xml
<payloadFactory media-type="json" template-type="FREEMARKER">
  <format><![CDATA[{
    "name": "\${payload.name}"
    <#if payload.email??>
    , "email": "\${payload.email}"
    </#if>
    <#if payload.age?? && (payload.age > 18)>
    , "isAdult": true
    </#if>
  }]]></format>
</payloadFactory>
\`\`\`

### Iterating Arrays
\`\`\`xml
<payloadFactory media-type="json" template-type="FREEMARKER">
  <format><![CDATA[{
    "items": [
      <#list payload.orders as order>
      {
        "id": "\${order.id}",
        "total": \${order.total}
      }<#if order?has_next>,</#if>
      </#list>
    ]
  }]]></format>
</payloadFactory>
\`\`\`

### FreeMarker Available Variables
| Variable | Maps To |
|----------|---------|
| \`payload\` | Current message payload |
| \`vars\` | Synapse variables |
| \`ctx\` | Synapse (default scope) properties |
| \`axis2\` | Axis2 scope properties |
| \`trp\` | Transport scope properties |
| \`headers\` | Transport headers |

### When to Use FreeMarker vs Default Templates
| Use Default Templates When | Use FreeMarker When |
|---------------------------|-------------------|
| Simple field substitution | Complex conditionals |
| Static structure | Dynamic array generation |
| Few expressions | Loops over data |
| No null checking needed | Null-safe operations (\`??\`) |
`,

datamapper_vs_payload: `## Choosing the Right Transformation Approach

### PayloadFactory (Default Template)
**Best for:** Simple field mapping, constructing new payloads from known fields.
\`\`\`xml
<payloadFactory media-type="json">
  <format>{"output": "\${payload.input}"}</format>
</payloadFactory>
\`\`\`
- Pros: Simple, readable, no external files
- Cons: No conditionals, no loops, manual null handling

### PayloadFactory (FreeMarker)
**Best for:** Complex transformations with conditionals and loops.
- Pros: Full programming constructs, null-safe operators
- Cons: More verbose, CDATA required, different syntax

### Enrich Mediator
**Best for:** Targeted modifications — adding, removing, or replacing specific parts of the payload.
\`\`\`xml
<enrich>
  <source type="inline" clone="true">{"newField": "value"}</source>
  <target type="custom" action="child" xpath="$.data"/>
</enrich>
\`\`\`
- Pros: Surgical precision, preserves existing payload
- Cons: One operation at a time, complex for multi-field changes

### Variable + PayloadFactory Pattern
**Best for:** Multi-step transformations or combining data from multiple sources.
\`\`\`xml
<!-- Save data from different sources -->
<variable name="userId" type="STRING" expression="\${payload.id}"/>
<variable name="userName" type="STRING" expression="\${payload.name}"/>

<!-- Call another service -->
<call><endpoint key="OrderServiceEP"/></call>

<!-- Combine original data with response -->
<payloadFactory media-type="json">
  <format>{
    "user": {"id": "\${vars.userId}", "name": "\${vars.userName}"},
    "orders": \${payload.orders}
  }</format>
</payloadFactory>
\`\`\`

### Decision Matrix
| Need | Approach |
|------|----------|
| Build new JSON/XML from scratch | PayloadFactory (default) |
| Complex conditionals/loops | PayloadFactory (FreeMarker) |
| Add/remove/replace one field | Enrich |
| Rename a JSON key | Enrich (target type=key) |
| Combine data from multiple calls | Variable + PayloadFactory |
| Replace entire body with stored data | Enrich (source=variable, target=body) |
| Construct full SOAP envelope | PayloadFactory media-type=xml (SOAP envelope detection) |
`,

array_patterns: `## Array Transformation Patterns

### Iterate and Transform Array Elements
\`\`\`xml
<!-- Save original array -->
<variable name="inputItems" type="JSON" expression="\${payload.items}"/>

<!-- Initialize result array -->
<payloadFactory media-type="json">
  <format>{"results": []}</format>
</payloadFactory>

<!-- Process each item -->
<foreach collection="\${vars.inputItems}" counter-variable="i">
  <sequence>
    <!-- payload = current element during iteration -->
    <payloadFactory media-type="json">
      <format>{
        "id": \${payload.id},
        "name": "\${toUpper(payload.name)}",
        "processed": true
      }</format>
    </payloadFactory>
  </sequence>
</foreach>
\`\`\`

### Filter Array with JSONPath
\`\`\`xml
<!-- Get only active items -->
<variable name="activeItems" type="JSON" expression="\${payload.items[?(@.active == true)]}"/>
\`\`\`

### Check if Array is Empty
\`\`\`xml
<filter xpath="\${length(payload.items) == 0}">
  <then>
    <payloadFactory media-type="json">
      <format>{"error": "No items found"}</format>
    </payloadFactory>
    <respond/>
  </then>
</filter>
\`\`\`

### Aggregate Results from Parallel Calls
Use scatter-gather to call multiple services and aggregate results:
\`\`\`xml
<scatter-gather parallel-execution="true" result-content-type="JSON" target="body">
  <aggregation expression="$"/>
  <sequence>
    <call><endpoint key="ServiceA"/></call>
  </sequence>
  <sequence>
    <call><endpoint key="ServiceB"/></call>
  </sequence>
</scatter-gather>
<!-- Result: array of responses from both services -->
\`\`\`
`,

};

export const SYNAPSE_PAYLOAD_PATTERNS_FULL = Object.values(SYNAPSE_PAYLOAD_PATTERNS_SECTIONS).join('\n\n---\n\n');
