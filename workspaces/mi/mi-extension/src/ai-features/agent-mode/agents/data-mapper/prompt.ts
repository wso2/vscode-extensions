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
 * Enhanced user prompt template for data mapper sub-agent
 *
 * This Handlebars template accepts:
 * - ts_file: The TypeScript file content with input/output interfaces and mapFunction
 * - instructions: Optional additional mapping instructions from the user (optional)
 */

export const DATA_MAPPER_PROMPT = `
Below is a TypeScript data mapper file that needs to be completed. The file contains:
- Input schema interface (\`InputRoot\`)
- Output schema interface (\`OutputRoot\`)
- A \`mapFunction\` that transforms input to output (needs to be completed)
- Import for \`dmUtils\` utility functions

**Your Task:**
Complete the \`mapFunction\` to map all fields from InputRoot to OutputRoot. Follow these rules:
1. Use explicit returns in arrow functions: \`map(x => { return {...}; })\`
2. Use dmUtils functions for string concatenation, arithmetic, and type conversions
3. Include all OutputRoot fields (use defaults for unmappable fields)
4. Preserve any existing mappings
5. Return ONLY the complete \`mapFunction\` code, wrapped in a single fenced TypeScript code block (\`\`\`typescript ... \`\`\` or \`\`\`ts ... \`\`\`)

{{#if instructions}}
**Additional Instructions:**
{{instructions}}

{{/if}}
**TypeScript File:**
\`\`\`typescript
{{ts_file}}
\`\`\`

Now generate the complete \`mapFunction\`. Output only one fenced TypeScript code block containing the function and nothing else:
`;
