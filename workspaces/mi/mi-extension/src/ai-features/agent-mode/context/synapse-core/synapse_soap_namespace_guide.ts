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
 * SOAP Patterns and XML Namespace Handling Guide
 * Extracted from Synapse source code, endpoint factories, mediator implementations, and test patterns.
 *
 * Section-based exports for granular context loading.
 */

export const SYNAPSE_SOAP_NAMESPACE_GUIDE_SECTIONS: Record<string, string> = {

soap_basics: `## SOAP Basics for Synapse

### SOAP 1.1 vs 1.2
| | SOAP 1.1 | SOAP 1.2 |
|---|---|---|
| Namespace | \`http://schemas.xmlsoap.org/soap/envelope/\` | \`http://www.w3.org/2003/05/soap-envelope\` |
| Content-Type | \`text/xml\` | \`application/soap+xml\` |
| SOAPAction | HTTP header: \`SOAPAction: "urn:operation"\` | Content-Type parameter: \`action="urn:operation"\` |
| Endpoint format | \`format="soap11"\` | \`format="soap12"\` |

### SOAP Envelope Structure
\`\`\`xml
<!-- SOAP 1.1 -->
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
    <soapenv:Header>
        <!-- Optional SOAP headers (WS-Addressing, WS-Security, custom) -->
    </soapenv:Header>
    <soapenv:Body>
        <!-- Operation element with service namespace -->
        <ns:OperationName xmlns:ns="http://service.namespace.from.wsdl">
            <ns:Param1>value</ns:Param1>
        </ns:OperationName>
    </soapenv:Body>
</soapenv:Envelope>
\`\`\`

### Key Rule: Operation Namespace Comes from WSDL
- **Never infer** the operation namespace from the service URL.
- **Always use** the WSDL \`targetNamespace\` for the operation element.
- Wrong namespace → silent SOAP fault (empty results, no exception in MI).`,

soap_call_pattern: `## Complete SOAP Call Pattern (MI 4.x)

### Standard REST-to-SOAP Pattern
This is the canonical pattern for calling SOAP services from Synapse:

\`\`\`xml
<!-- 1. Construct SOAP body with correct namespace -->
<payloadFactory media-type="xml">
    <format>
        <ns:OperationName xmlns:ns="http://wsdl.target.namespace">
            <ns:Param1>\${payload.param1}</ns:Param1>
            <ns:Param2>\${vars.param2}</ns:Param2>
        </ns:OperationName>
    </format>
</payloadFactory>

<!-- 2. Set SOAPAction header (WS-Addressing Action) -->
<header name="Action" value="urn:OperationName"/>

<!-- 3. Call with address endpoint using format="soap11" or "soap12" -->
<call>
    <endpoint>
        <address uri="https://service.example.com/Service" format="soap11"/>
    </endpoint>
</call>

<!-- 4. After call, payload is JSON (auto-converted). Use JSON paths. -->
<variable name="result" expression="\${payload.ResponseElement.ResultField}" type="STRING"/>
\`\`\`

### Using Named Endpoints (Recommended)
\`\`\`xml
<!-- Endpoint file: SOAPServiceEP.xml -->
<endpoint name="SOAPServiceEP" xmlns="http://ws.apache.org/ns/synapse">
    <address uri="https://service.example.com/Service" format="soap11">
        <timeout>
            <duration>30000</duration>
            <responseAction>fault</responseAction>
        </timeout>
        <suspendOnFailure>
            <initialDuration>1000</initialDuration>
            <progressionFactor>2.0</progressionFactor>
            <maximumDuration>60000</maximumDuration>
        </suspendOnFailure>
    </address>
</endpoint>

<!-- In sequence -->
<header name="Action" value="urn:OperationName"/>
<call>
    <endpoint key="SOAPServiceEP"/>
</call>
\`\`\`

### Critical Rules
1. **format attribute is required**: Without \`format="soap11"\` or \`format="soap12"\`, the message may not be wrapped in a SOAP envelope.
2. **Action header sets SOAPAction**: \`<header name="Action" value="...">\` sets the WS-Addressing Action which becomes the HTTP SOAPAction header.
3. **After call, payload is JSON**: \`\${payload}\` returns auto-converted JSON. JSON keys match XML local names (namespace prefix stripped).
4. **Don't store response as XML**: \`<variable ... type="XML"/>\` after SOAP call throws \`WstxUnexpectedCharException\` because payload is JSON.`,

soap_response: `## Handling SOAP Responses

### After \`call\` mediator, payload is JSON
The MI runtime auto-converts SOAP/XML responses to JSON. The JSON key names match XML element local names (namespace prefixes are stripped).

\`\`\`xml
<!-- SOAP response:
<m:GetQuoteResponse xmlns:m="http://services.samples">
    <m:return>
        <ax21:symbol xmlns:ax21="http://services.samples/xsd">WSO2</ax21:symbol>
        <ax21:last>120.5</ax21:last>
    </m:return>
</m:GetQuoteResponse>
-->

<!-- After call, access via JSON paths: -->
<variable name="symbol" expression="\${payload.GetQuoteResponse.return.symbol}" type="STRING"/>
<variable name="price" expression="\${payload.GetQuoteResponse.return.last}" type="STRING"/>
\`\`\`

### Accessing raw XML via xpath()
When you need the raw XML body (not JSON-converted), use \`xpath()\` with \`$body\`:
\`\`\`xml
<variable name="rawValue" expression="\${xpath(&quot;string($body//*[local-name()='symbol'])&quot;)}" type="STRING"/>
\`\`\`

### Save payload before call if needed later
\`\`\`xml
<variable name="originalRequest" expression="\${payload}" type="JSON"/>
<call><endpoint key="SOAPServiceEP"/></call>
<!-- payload is now the response. Original is in vars.originalRequest -->
<variable name="result" expression="\${payload.ResponseElement.Value}" type="STRING"/>
\`\`\`

### Call mediator with source/target (preserve original payload)
\`\`\`xml
<!-- Send custom payload, store response in variable, keep original payload intact -->
<call>
    <endpoint key="SOAPServiceEP"/>
    <source type="inline" contentType="application/xml">
        <ns:GetQuote xmlns:ns="http://services.samples">
            <ns:symbol>WSO2</ns:symbol>
        </ns:GetQuote>
    </source>
    <target type="variable">soapResponse</target>
</call>
<!-- Original payload unchanged. Response in vars.soapResponse -->
\`\`\``,

namespace_in_payload: `## Namespace Handling in PayloadFactory

### XML PayloadFactory with Namespaces
Declare namespaces on the root element of the format content:
\`\`\`xml
<payloadFactory media-type="xml">
    <format>
        <ns:GetQuote xmlns:ns="http://services.samples">
            <ns:request>
                <ns:symbol>\${payload.symbol}</ns:symbol>
            </ns:request>
        </ns:GetQuote>
    </format>
</payloadFactory>
\`\`\`

### Multiple Namespaces
\`\`\`xml
<payloadFactory media-type="xml">
    <format>
        <ns:Order xmlns:ns="http://order.namespace"
                  xmlns:cust="http://customer.namespace">
            <ns:item>\${payload.item}</ns:item>
            <cust:customerId>\${payload.customerId}</cust:customerId>
        </ns:Order>
    </format>
</payloadFactory>
\`\`\`

### Full SOAP Envelope Construction
PayloadFactory can produce a complete SOAP envelope. When the output root element is \`<soapenv:Envelope>\` with the correct namespace, the mediator replaces the entire message envelope:
\`\`\`xml
<payloadFactory media-type="xml">
    <format>
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                          xmlns:ns="http://service.namespace">
            <soapenv:Header/>
            <soapenv:Body>
                <ns:Operation>
                    <ns:Param>\${payload.value}</ns:Param>
                </ns:Operation>
            </soapenv:Body>
        </soapenv:Envelope>
    </format>
</payloadFactory>
\`\`\`
This replaces the entire SOAP envelope — use for fine-grained SOAP control.

### FreeMarker with XML Namespaces
FreeMarker templates with XML MUST use CDATA:
\`\`\`xml
<payloadFactory media-type="xml" template-type="freemarker">
    <format><![CDATA[
        <ns:GetQuote xmlns:ns="http://services.samples">
            <ns:request>
                <ns:symbol>\${payload.symbol}</ns:symbol>
            </ns:request>
        </ns:GetQuote>
    ]]></format>
</payloadFactory>
\`\`\`
CDATA prevents the XML parser from interpreting FreeMarker \`\${}\` and \`<#>\` syntax.

### JSON PayloadFactory (no namespace needed)
JSON payloads don't have namespaces. Just embed expressions directly:
\`\`\`xml
<payloadFactory media-type="json">
    <format>{"symbol": "\${payload.symbol}", "price": \${payload.price}}</format>
</payloadFactory>
\`\`\`
Remember: string values in quotes (\`"\${expr}"\`), numbers/booleans/objects without quotes (\`\${expr}\`).`,

namespace_in_xpath: `## Namespace Handling in XPath Expressions

### The local-name() Workaround
When dealing with namespaced XML and you don't want to declare namespace prefixes, use \`local-name()\`:
\`\`\`xml
<variable name="val" expression="\${xpath(&quot;string($body//*[local-name()='ElementName'])&quot;)}" type="STRING"/>
\`\`\`

### XPath with Namespace Context
For namespace-aware XPath, declare namespaces on the mediator element:
\`\`\`xml
<!-- Old-style XPath with namespace declaration (pre-Synapse Expressions) -->
<filter xmlns:ns="http://services.samples"
        xpath="//ns:GetQuoteResponse/ns:return/ns:symbol">
    <then>...</then>
</filter>
\`\`\`

### XPath Quoting in Synapse Expressions
Inside XML attributes, use \`&quot;\` for the outer xpath string and single quotes inside:
\`\`\`xml
<!-- Correct -->
<variable name="val" expression="\${xpath(&quot;string($body//*[local-name()='CustomerId'])&quot;)}" type="STRING"/>

<!-- WRONG: nested double quotes break XML -->
<variable name="val" expression="\${xpath("string($body//Element)")}" type="STRING"/>
\`\`\`

### Don't Nest Functions Around xpath()
\`\`\`xml
<!-- WRONG -->
<variable name="val" expression="\${trim(xpath(&quot;string($body//Element)&quot;))}" type="STRING"/>

<!-- CORRECT: extract first, then transform -->
<variable name="raw" expression="\${xpath(&quot;string($body//Element)&quot;)}" type="STRING"/>
<variable name="val" expression="\${trim(vars.raw)}" type="STRING"/>
\`\`\``,

soap_headers: `## SOAP Headers

### Setting SOAPAction
\`\`\`xml
<!-- SOAPAction via WS-Addressing Action header (recommended) -->
<header name="Action" value="urn:getQuote"/>

<!-- SOAPAction via transport header -->
<header name="SOAPAction" value="urn:getQuote" scope="transport"/>
\`\`\`
The \`<header name="Action">\` approach is preferred — it sets the WS-Addressing Action which becomes the SOAPAction HTTP header automatically.

### Well-Known SOAP/WS-Addressing Headers
These headers are handled specially — no namespace needed:
| Header Name | Sets |
|------------|------|
| \`To\` | Endpoint reference (destination address) |
| \`From\` | Source endpoint reference |
| \`Action\` | WS-Addressing Action / SOAPAction |
| \`FaultTo\` | Fault endpoint reference |
| \`ReplyTo\` | Reply endpoint reference |
| \`RelatesTo\` | Message correlation |

### Custom SOAP Headers
Custom SOAP headers MUST be namespace-qualified:
\`\`\`xml
<!-- Correct: namespace-qualified custom header -->
<header xmlns:ns="http://custom.namespace" name="ns:CustomHeader" value="headerValue"/>

<!-- WRONG: unqualified custom header throws exception -->
<header name="CustomHeader" value="headerValue"/>
<!-- Error: "Invalid SOAP header: CustomHeader. All SOAP headers must be namespace qualified." -->
\`\`\`

### Transport (HTTP) Headers
Transport headers don't need namespace qualification:
\`\`\`xml
<header name="Content-Type" value="application/json" scope="transport"/>
<header name="Authorization" expression="\${'Bearer ' + vars.token}" scope="transport"/>
<!-- Remove a header -->
<header name="X-Custom-Header" action="remove" scope="transport"/>
\`\`\`

### Structured XML in SOAP Headers (type="OM")
Use \`type="OM"\` to parse the value as XML and add as structured content:
\`\`\`xml
<header name="ns:Auth" xmlns:ns="http://auth.namespace"
        value="<ns:Token xmlns:ns='http://auth.namespace'>abc123</ns:Token>"
        type="OM"/>
\`\`\``,

soap_faults: `## Handling SOAP Faults

### SOAP Faults Trigger Fault Sequences
When a SOAP service returns a fault, the call mediator sets error properties and triggers the fault sequence:
\`\`\`xml
<resource methods="POST">
    <inSequence>
        <payloadFactory media-type="xml">
            <format>
                <ns:GetQuote xmlns:ns="http://services.samples">
                    <ns:symbol>\${payload.symbol}</ns:symbol>
                </ns:GetQuote>
            </format>
        </payloadFactory>
        <header name="Action" value="urn:getQuote"/>
        <call><endpoint key="SOAPServiceEP"/></call>
        <respond/>
    </inSequence>
    <faultSequence>
        <log category="ERROR">
            <message>SOAP call failed: \${props.synapse.ERROR_CODE} - \${props.synapse.ERROR_MESSAGE}</message>
        </log>
        <payloadFactory media-type="json">
            <format>{"error": "\${props.synapse.ERROR_MESSAGE}", "code": "\${props.synapse.ERROR_CODE}"}</format>
        </payloadFactory>
        <respond/>
    </faultSequence>
</resource>
\`\`\`

### Error Properties Available in Fault Sequence
| Property | Description |
|----------|-------------|
| \`props.synapse.ERROR_CODE\` | Error code (e.g., transport error codes) |
| \`props.synapse.ERROR_MESSAGE\` | Error message string |
| \`props.synapse.ERROR_DETAIL\` | Detailed error information |
| \`props.synapse.ERROR_EXCEPTION\` | Exception object |

### Silent Failures from Wrong Namespace
If the SOAP body uses the wrong operation namespace:
- The SOAP service may return an empty response or a SOAP fault
- MI may not throw an exception — the call appears to succeed
- The response payload will be empty or contain fault XML auto-converted to JSON
- Always verify the namespace against the WSDL \`targetNamespace\``,

wsdl_to_synapse: `## Translating WSDL to Synapse Configuration

### Step-by-Step WSDL-to-Synapse Translation

Given a WSDL:
\`\`\`xml
<definitions targetNamespace="http://example.com/service"
             xmlns:tns="http://example.com/service">
    <portType name="MyServicePortType">
        <operation name="GetData">
            <input message="tns:GetDataRequest"/>
            <output message="tns:GetDataResponse"/>
        </operation>
    </portType>
    <service name="MyService">
        <port name="MyServicePort" binding="tns:MyServiceBinding">
            <soap:address location="https://example.com/MyService"/>
        </port>
    </service>
</definitions>
\`\`\`

### 1. Create the endpoint
\`\`\`xml
<endpoint name="MyServiceEP" xmlns="http://ws.apache.org/ns/synapse">
    <address uri="https://example.com/MyService" format="soap11"/>
</endpoint>
\`\`\`
- URI from \`<soap:address location="...">\`
- format from the binding (SOAP 1.1 or 1.2)

### 2. Build the SOAP body
\`\`\`xml
<payloadFactory media-type="xml">
    <format>
        <!-- Use targetNamespace from WSDL, NOT the service URL -->
        <tns:GetData xmlns:tns="http://example.com/service">
            <tns:param1>\${payload.param1}</tns:param1>
        </tns:GetData>
    </format>
</payloadFactory>
\`\`\`

### 3. Set SOAPAction
\`\`\`xml
<!-- SOAPAction from WSDL soapAction attribute, or urn:OperationName -->
<header name="Action" value="urn:GetData"/>
\`\`\`

### 4. Call and handle response
\`\`\`xml
<call><endpoint key="MyServiceEP"/></call>
<!-- Response is JSON. Keys match XML local names. -->
<variable name="result" expression="\${payload.GetDataResponse.returnValue}" type="STRING"/>
\`\`\`

### WSDL Endpoint (Alternative)
Instead of address endpoint, you can use a WSDL endpoint that reads the service URL from the WSDL:
\`\`\`xml
<endpoint name="WSDLBasedEP" xmlns="http://ws.apache.org/ns/synapse">
    <wsdl uri="https://example.com/MyService?wsdl"
          service="tns:MyService"
          port="tns:MyServicePort"/>
</endpoint>
\`\`\`
Note: WSDL 2.0 endpoints are NOT supported (throws exception).`,

common_mistakes: `## Common SOAP/Namespace Mistakes

### 1. Wrong operation namespace
\`\`\`xml
<!-- WRONG: using service URL as namespace -->
<payloadFactory media-type="xml">
    <format>
        <ns:GetQuote xmlns:ns="http://example.com/services/StockQuote">...</ns:GetQuote>
    </format>
</payloadFactory>

<!-- CORRECT: using WSDL targetNamespace -->
<payloadFactory media-type="xml">
    <format>
        <ns:GetQuote xmlns:ns="http://services.samples">...</ns:GetQuote>
    </format>
</payloadFactory>
\`\`\`
**Symptom:** Empty response, no error in MI logs.

### 2. Missing format attribute on endpoint
\`\`\`xml
<!-- WRONG: no format → message may not be SOAP-wrapped -->
<address uri="https://soap.service.com/Service"/>

<!-- CORRECT -->
<address uri="https://soap.service.com/Service" format="soap11"/>
\`\`\`

### 3. Missing SOAPAction header
\`\`\`xml
<!-- WRONG: no Action header → service may reject or route incorrectly -->
<call><endpoint key="SOAPServiceEP"/></call>

<!-- CORRECT -->
<header name="Action" value="urn:OperationName"/>
<call><endpoint key="SOAPServiceEP"/></call>
\`\`\`

### 4. Storing SOAP response as XML
\`\`\`xml
<!-- WRONG: payload after call is JSON, not XML -->
<variable name="resp" expression="\${payload}" type="XML"/>
<!-- Throws: WstxUnexpectedCharException: Unexpected character '{' -->

<!-- CORRECT -->
<variable name="resp" expression="\${payload}" type="JSON"/>
\`\`\`

### 5. Using xpath() on JSON-converted response
\`\`\`xml
<!-- WRONG: payload is JSON after call, xpath won't work on it -->
<variable name="val" expression="\${xpath(&quot;//ResponseElement/text()&quot;)}" type="STRING"/>

<!-- CORRECT: use JSON path -->
<variable name="val" expression="\${payload.ResponseElement}" type="STRING"/>

<!-- OR use $body for raw XML access -->
<variable name="val" expression="\${xpath(&quot;string($body//*[local-name()='ResponseElement'])&quot;)}" type="STRING"/>
\`\`\`

### 6. Unqualified custom SOAP header
\`\`\`xml
<!-- WRONG: throws "Invalid SOAP header" -->
<header name="CustomAuth" value="token123"/>

<!-- CORRECT: namespace-qualified -->
<header xmlns:auth="http://auth.example.com" name="auth:CustomAuth" value="token123"/>

<!-- OR use transport scope for HTTP headers (no namespace needed) -->
<header name="Authorization" value="Bearer token123" scope="transport"/>
\`\`\`

### 7. Mixing SOAP versions
\`\`\`xml
<!-- WRONG: SOAP 1.2 envelope namespace with format="soap11" -->
<payloadFactory media-type="xml">
    <format>
        <soapenv:Envelope xmlns:soapenv="http://www.w3.org/2003/05/soap-envelope">...</soapenv:Envelope>
    </format>
</payloadFactory>
<!-- ... then ... -->
<address uri="..." format="soap11"/>
<!-- These conflict. Use matching SOAP version everywhere. -->
\`\`\`

### 8. Forgetting XML escaping in attributes
\`\`\`xml
<!-- WRONG: > and < not escaped in XML attribute -->
<filter xpath="\${payload.count > 0}">

<!-- CORRECT -->
<filter xpath="\${payload.count &gt; 0}">
\`\`\`
Note: Inside text nodes (like \`<message>\`) escaping is NOT needed.`,

};

// Full content composed from all sections
export const SYNAPSE_SOAP_NAMESPACE_GUIDE_FULL = Object.values(SYNAPSE_SOAP_NAMESPACE_GUIDE_SECTIONS).join('\n\n---\n\n');
