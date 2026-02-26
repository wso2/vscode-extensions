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

export const SYNAPSE_EXPRESSION_EXAMPLES = `
These are concise usage samples that complement SYNAPSE_EXPRESSIONS_DOCS.
Use SYNAPSE_EXPRESSIONS_DOCS as the source of truth for syntax and constraints.

### Example filter mediator configuration:
\`\`\`xml
<!-- filter xpath must evaluate to a boolean -->
<filter xpath="\${payload.store.book[0].price &lt; 10}">
    <then>
        <log category="INFO">
            <message>Book price is less than 10</message>
        </log>
    </then>
    <else>
        <log category="INFO">
            <message>Book price is greater than or equal to 10</message>
        </log>
    </else>
</filter>

<!-- Checking if filtered results exist -->
<filter xpath="\${length(payload.store.book[?(@.price &lt; 10)]) &gt; 0}">
    <then>
        <log category="INFO">
            <message>Found cheap books</message>
        </log>
    </then>
</filter>
\`\`\`

### Example switch mediator configuration:
\`\`\`xml
<switch source="\${vars.store.book[0].category}">
    <case regex="fiction">
        <log category="INFO">
            <message>Processing fiction book: \${vars.store.book[0].title}</message>
        </log>
    </case>
    <default>
        <log category="INFO">
            <message>Processing other category: \${vars.store.book[0].category}</message>
        </log>
    </default>
</switch>
\`\`\`

### Example of complex filtering using Synapse expressions:
\`\`\`xml
<?xml version="1.0" encoding="UTF-8"?>
<api context="/promotion" name="promotionCheck" xmlns="http://ws.apache.org/ns/synapse">
    <resource methods="POST" uri-template="/new?minimumBillAmount={minimumBillAmount}">
        <inSequence>
            <variable name="customerId" type="STRING" value="CUST123"/>
            <variable name="isEligible" type="STRING" expression="\${length($.orders[?(@.customerID==vars.customerId &amp;&amp; @.total &gt; params.queryParams.minimumBillAmount)]) &gt; configs.promo_bill_count ? 'eligible' : 'not eligible'}"/>
            <log>
                <message>\${vars.isEligible}</message>
            </log>
        </inSequence>
        <faultSequence>
        </faultSequence>
    </resource>
</api>
\`\`\`

### PayloadFactory with Synapse expressions:
- If you select default as the Template Type, you can define the payload using inline synapse expressions as shown below. This example defines a JSON payload.
\`\`\`xml
<payloadFactory description="Construct payload for addition operation" media-type="json">
    <format>
        {
            "AddInteger": {
                "Arg1": \${payload.grocery.arg1},
                "Arg2": \${payload.grocery.arg2}
            }
        }
    </format>
</payloadFactory>
\`\`\`

- Now the Payload mediator supports FreeMarker Templates. If you select freemarker as the Template Type, you can define the payload as a FreeMarker template. The following example defines a JSON payload.
\`\`\`xml
<variable name="customer_id" type="STRING" value="43672343"/>
<payloadFactory media-type="json" template-type="freemarker">
    <format><![CDATA[{
        "name": "\${payload.customer_name}",
        "customer_id" : "\${vars.customer_id}",
        "axis2 property": "\${props.axis2.REST_URL_POSTFIX}",
        "host": "\${headers["Host"]}"
        }]]>
    </format>
</payloadFactory>
\`\`\`

### ForEach mediator (v2 — collection-based):
\`\`\`xml
<!-- Iterate over a JSON array in the payload -->
<foreach collection="\${payload.items}" parallel-execution="false" counter-variable="i">
    <sequence>
        <log category="INFO">
            <message>Processing item \${vars.i}: \${payload}</message>
        </log>
    </sequence>
</foreach>
\`\`\`
- During iteration, \`\${payload}\` refers to the current array element, not the original payload.
- Sequences inside forEach cannot contain call, send, or callout mediators.

### Error handling with fault sequence:
\`\`\`xml
<api context="/orders" name="OrderAPI" xmlns="http://ws.apache.org/ns/synapse">
    <resource methods="POST">
        <inSequence>
            <filter xpath="\${not(exists(payload.orderId))}">
                <then>
                    <throwError type="VALIDATION_ERROR" errorMessage="orderId is required"/>
                </then>
            </filter>
            <log category="INFO">
                <message>Processing order: \${payload.orderId}</message>
            </log>
            <respond/>
        </inSequence>
        <faultSequence>
            <payloadFactory media-type="json">
                <format>{"error": "\${props.synapse.ERROR_MESSAGE}", "code": "\${props.synapse.ERROR_CODE}"}</format>
            </payloadFactory>
            <respond/>
        </faultSequence>
    </resource>
</api>
\`\`\`

### Variable with JSON type:
\`\`\`xml
<!-- Store a JSON object from payload into a variable -->
<variable name="userData" expression="\${payload.user}" type="JSON"/>
<!-- Access nested fields from the JSON variable -->
<log category="INFO">
    <message>User: \${vars.userData.name}, Age: \${vars.userData.age}</message>
</log>
\`\`\`

### Deprecated pattern
- NEVER use <args> with $1/$2 placeholders in payloadFactory. This is a deprecated pattern. Always embed Synapse expressions directly inside <format>. Using <arg expression="\${...}"/> will fail at runtime with an XPath parse error because <args> only accepts XPath, not Synapse expressions.
- Wrong deprecated syntax:
\`\`\`xml
<payloadFactory media-type="xml">
    <format><root><value>$1</value></root></format>
    <args>
        <arg expression="\${vars.myValue}"/>
    </args>
</payloadFactory>
\`\`\`
- Correct syntax:
\`\`\`xml
<payloadFactory media-type="xml">
    <format><root><value>\${vars.myValue}</value></root></format>
</payloadFactory>
\`\`\`
`;
