/**
 * Copyright (c) 2024, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
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
 * Cleans AI response by removing markdown code blocks
 * @param response - Raw AI response string
 * @param format - Expected format ('json', 'yaml', or 'auto')
 * @returns Cleaned response string
 */
export function cleanAIResponse(response: string, format: 'json' | 'yaml' | 'auto' = 'auto'): string {
    let cleaned = response.trim();
    
    // Remove markdown code blocks - handle both single line and multiline
    // Match: ```language\n content \n```
    const codeBlockPattern = /```(?:json|yaml|yml|typescript|javascript|ts|js)?\s*\n?([\s\S]*?)\n?```/g;
    const match = codeBlockPattern.exec(cleaned);
    
    if (match && match[1]) {
        // Found code block, extract the content inside
        cleaned = match[1].trim();
    } else {
        // No code blocks found, try to clean basic markdown syntax
        cleaned = cleaned.replace(/^```(?:json|yaml|yml|typescript|javascript|ts|js)?\s*\n?/gm, '');
        cleaned = cleaned.replace(/\n?```\s*$/gm, '');
    }
    
    // Only try to extract JSON if we're expecting JSON format
    if (format === 'json' || (format === 'auto' && cleaned.trim().startsWith('{'))) {
        // Try to extract JSON from the response if it's embedded
        // Look for content between { } or [ ]
        const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (jsonMatch) {
            cleaned = jsonMatch[1];
        }
    }
    
    // Clean up any remaining whitespace and newlines
    cleaned = cleaned.trim();
    
    return cleaned;
}

/**
 * Attempts to extract and parse JSON from AI response with fallback strategies
 * @param response - Raw AI response string
 * @returns Parsed JSON object or null if parsing fails
 */
export function parseAIJsonResponse(response: string): any | null {
    try {
        // Clean and parse directly
        const cleaned = cleanAIResponse(response);
        return JSON.parse(cleaned);
    } catch (e1) {
        try {
            // Fallback: find the first { or [ and last } or ] and extract content
            const firstBrace = response.indexOf('{');
            const firstBracket = response.indexOf('[');
            const lastBrace = response.lastIndexOf('}');
            const lastBracket = response.lastIndexOf(']');
            
            let start = -1;
            let end = -1;
            
            if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
                start = firstBrace;
                end = lastBrace + 1;
            } else if (firstBracket !== -1) {
                start = firstBracket;
                end = lastBracket + 1;
            }
            
            if (start !== -1 && end > start) {
                const extracted = response.substring(start, end);
                return JSON.parse(extracted);
            }
        } catch (e2) {
            // Error logged via logger if available, otherwise silent
            // Note: This is a utility function, logger may not be available in all contexts
        }
    }
    return null;
}

// Export schema example generator utilities
export * from './schemaExampleGenerator';

// Export AI prompts
export * from './aiPrompts';
