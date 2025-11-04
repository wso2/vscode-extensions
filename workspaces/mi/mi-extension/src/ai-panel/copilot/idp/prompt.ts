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

export const IDP_PROMPT = `
{{#if (eq operation "generate")}}
### Task: Generate JSON Schema from Image(s)

You are tasked with generating a JSON schema based on the content of the provided image.

**Instructions:**
- Extract all relevant fields and their data from the image.
- Structure this information into a new JSON schema.
- Adhere strictly to the JSON schema standards and general rules defined in your system prompt.
- Also refer to the sample schema provided in the system prompt for guidance.
- **Return only the generated JSON schema.**

{{else if (eq operation "finetune")}}
### Task: Fine-tune JSON Schema

You are tasked with modifying an existing JSON schema. The modifications should be based on the user's explicit instructions and, if provided, additional information from an image.

**Instructions:**
- **Analyze the \`user_input\`**: Understand the specific changes requested by the user.
{{#if image_provided}}
- **Analyze the provided image**: Extract additional information or context that might inform the schema modifications.
{{/if}}
- **Apply changes to the \`json_schema\`**: Update the provided JSON schema to reflect the user's requirements. This includes adding, removing, or modifying fields and their properties (\`type\`, \`description\`).
- Adhere strictly to the JSON schema standards and general rules defined in your system prompt. Also refer to the sample schema provided in the system prompt for guidance.
- **Return only the modified JSON schema.**

**Current JSON Schema:**
{{json_schema}}

{{#if user_input}}
**User's Modification Request:**
{{user_input}}
{{/if}}
{{/if}}

Start creating your response now.
`;
