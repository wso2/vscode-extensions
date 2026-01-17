/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
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
 * User prompt template for conversation summarization
 *
 * Template variables:
 * - conversation: The formatted conversation history
 */
export const SUMMARIZATION_USER_PROMPT = `
Please analyze and summarize the following conversation history.

Follow the exact structure specified in the system prompt.

**CONVERSATION:**
{{conversation}}

**END OF CONVERSATION**

Now generate the summary following the required format (Analysis section followed by Summary section with 9 numbered subsections).`;
