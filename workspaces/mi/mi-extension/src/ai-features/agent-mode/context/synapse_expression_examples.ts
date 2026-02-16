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
- Example filter mediator configuration:
\`\`\`xml
<filter xpath="\${payload.store.book[?(@.price < 10)]}">
    <then>
        <log category="INFO">
            <message>Book price is less than 10</message>
        </log>
    </then>
    <else>
        <log category="INFO">
            <message>Book price is greater than 10</message>
        </log>
    </else>
</filter>
\`\`\`

- Example switch mediator configuration:
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

- Example of complex filtering using Synapse expressions:
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

- You can use Synapse expressions to provide dynamic values to any connector operation or mediator.
- Example of using Synapse expressions in the new HTTP connector to provide query parameters dynamically.
\`\`\`xml
   <http.get configKey="SimpleStockQuoteService">
      <relativePath>/getQuote?userId=\${vars.userId}</relativePath>
      <headers>[]</headers>
      <requestBodyType>XML</requestBodyType>
      <requestBodyXml>{\${xpath('$body/node()')}}</requestBodyXml>
      <forceScAccepted>false</forceScAccepted>
      <disableChunking>false</disableChunking>
      <forceHttp10>false</forceHttp10>
      <noKeepAlive>false</noKeepAlive>
      <forcePostPutNobody>false</forcePostPutNobody>
      <forceHttpContentLength>false</forceHttpContentLength>
   </http.get>
\`\`\`

- Do not use the old payloadFactory mediator. Use the new payloadFactory mediator which supports Synapse expressions.
- Example of using synapse expressions inside the new PayloadFactory.
\`\`\`xml
<payloadFactory media-type="json">
    <format>
        {
            "coordinates": null,
            "id_str": "\${payload.entities.hashtags[0].text}"
        }
    </format>
</payloadFactory>
\`\`\`
`;
