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

export const DMC_TO_TS_PROMPT = `
The TS file whose mapFunction should be completed,
{{ts_file}}

The DMC file with mappings, 
{{dmc_content}}

**CRITICAL INSTRUCTIONS**:
1. Return the ENTIRE TypeScript file including ALL input and output schema interfaces exactly as provided
2. Do NOT modify the input schema interface in any way
3. Make output schema fields optional (using \`?\`) ONLY for fields that are NOT mapped in the DMC file  
4. In the mapFunction, implement ONLY the mappings explicitly defined in the DMC file
5. Do NOT add any mappings that are not present in the DMC file
6. Do NOT include unmapped fields in the mapFunction return object - simply omit them
7. Preserve all existing field names, types, comments, and structure exactly as provided

Start creating your response now.
`;
