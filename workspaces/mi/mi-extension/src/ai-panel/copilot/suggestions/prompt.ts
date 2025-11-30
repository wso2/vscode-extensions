/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

export const PROMPT_TEMPLATE = `
{{#if chat_history}}
You have an ongoing conversation with MI Copilot. Here's your current chat history:
<CHAT_HISTORY>
{{{chat_history}}}
</CHAT_HISTORY>
{{/if}}

{{#if context}}
You are currently working on the following integration project:
<INTEGRATION_PROJECT>
{{#each context}}
{{this}}
{{/each}}
</INTEGRATION_PROJECT>

Now ask MI Copilot to enhance your integration by adding new artifacts (such as APIs, Sequences, Endpoints, etc.), features, or improvements.
{{else}}
You are starting a new integration project. Describe an integration challenge or requirement for MI Copilot to solve.
{{/if}}

Your output should be a single line of query you ask from MI Copilot. Nothing else.
Start creating your response now.
`;
