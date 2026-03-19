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
 * Mediator Expression Examples — Correct XML Patterns
 *
 * These examples exist because models consistently hallucinate wrong
 * attribute names for mediators (e.g., expression= instead of xpath=
 * for filter, expression= instead of source= for switch). These are
 * the authoritative correct patterns.
 */
export const SYNAPSE_EXPRESSION_EXAMPLES = `
### Correct Mediator Attribute Names for Synapse Expressions
These are the EXACT attribute names — do not substitute.

#### log mediator — uses \`<message>\` (NOT \`<property>\` children)
\`\`\`xml
<log category="INFO">
    <message>Order \${payload.orderId} from \${vars.customerName}</message>
</log>
\`\`\`

#### filter mediator — uses \`xpath=\` attribute (must evaluate to boolean)
\`\`\`xml
<filter xpath="\${payload.price &lt; 10 and payload.stock &gt; 0}">
    <then>
        <log category="INFO"><message>In stock and affordable</message></log>
    </then>
    <else>
        <log category="INFO"><message>Not eligible</message></log>
    </else>
</filter>
\`\`\`

#### switch mediator — uses \`source=\` attribute
\`\`\`xml
<switch source="\${payload.category}">
    <case regex="electronics">
        <log category="INFO"><message>Electronics order</message></log>
    </case>
    <case regex="books">
        <log category="INFO"><message>Books order</message></log>
    </case>
    <default>
        <log category="INFO"><message>Other: \${payload.category}</message></log>
    </default>
</switch>
\`\`\`

#### variable mediator — uses \`expression=\` attribute
\`\`\`xml
<variable name="discountedPrice" type="DOUBLE" expression="\${payload.price * 0.9}"/>
<variable name="userData" type="JSON" expression="\${payload.user}"/>
<variable name="isEligible" type="BOOLEAN" expression="\${payload.age &gt;= 18 and exists(payload.email)}"/>
\`\`\`

#### payloadFactory — inline \`\${}\` in \`<format>\`, NO \`<args>\`
\`\`\`xml
<payloadFactory media-type="json">
    <format>
        {
            "greeting": "Hello \${payload.name}",
            "total": \${vars.computedTotal},
            "status": "processed"
        }
    </format>
</payloadFactory>
\`\`\`

#### forEach (collection-based, MI 4.6.0+) — uses \`collection=\` attribute
\`\`\`xml
<foreach collection="\${payload.items}" parallel-execution="false" counter-variable="i">
    <sequence>
        <log category="INFO"><message>Item \${vars.i}: \${payload}</message></log>
    </sequence>
</foreach>
\`\`\`
During iteration, \`\${payload}\` refers to the current element, not the original payload.
**Legacy forEach** (\`expression="..."\`): call, send, callout mediators NOT allowed inside. **Collection-based forEach** (\`collection="..."\`, MI 4.6.0+): call, send, callout ARE allowed.

#### Error handling with fault sequence
\`\`\`xml
<faultSequence>
    <payloadFactory media-type="json">
        <format>{"error": "\${properties.synapse.ERROR_MESSAGE}", "code": "\${properties.synapse.ERROR_CODE}"}</format>
    </payloadFactory>
    <respond/>
</faultSequence>
\`\`\`

#### Complex filtering with JSONPath + ternary
\`\`\`xml
<variable name="isEligible" type="STRING"
    expression="\${length($.orders[?(@.total &gt; params.queryParams.minAmount)]) &gt; 0 ? 'eligible' : 'not eligible'}"/>
\`\`\`

#### Sequence template with function parameters
\`\`\`xml
<template name="WelcomeTemplate" xmlns="http://ws.apache.org/ns/synapse">
    <parameter isMandatory="true" name="firstName"/>
    <parameter isMandatory="true" name="lastName"/>
    <sequence>
        <log><message>Welcome \${params.functionParams.firstName} \${params.functionParams.lastName}</message></log>
    </sequence>
</template>
\`\`\`

#### PayloadFactory with FreeMarker template
\`\`\`xml
<payloadFactory media-type="json" template-type="freemarker">
    <format><![CDATA[{
        "name": "\${payload.customer_name}",
        "customer_id": "\${vars.customer_id}",
        "host": "\${headers["Host"]}"
    }]]></format>
</payloadFactory>
\`\`\`

#### Deprecated pattern — NEVER do this
\`\`\`xml
<!-- WRONG: <args> with Synapse Expressions fails at runtime -->
<payloadFactory media-type="xml">
    <format><root><value>$1</value></root></format>
    <args><arg expression="\${vars.myValue}"/></args>
</payloadFactory>

<!-- CORRECT: embed directly in <format> -->
<payloadFactory media-type="xml">
    <format><root><value>\${vars.myValue}</value></root></format>
</payloadFactory>
\`\`\`
`;
