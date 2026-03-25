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
 * Updates the existing bal.md content by replacing or removing file sections
 * based on the changed files response from the CodeMap API.
 */
export function updateBalMdWithChanges(
    existingBalMd: string,
    changedFiles: Record<string, { markdown: string }>
): string {
    let updatedBalMd = existingBalMd;

    for (const [filePath, fileData] of Object.entries(changedFiles)) {
        const sectionHeader = `## File Path : ${filePath}`;
        // Match the section from its header to the next `---` delimiter (or end of file)
        const sectionRegex = new RegExp(
            `---\\s*\\n\\n${escapeRegExp(sectionHeader)}[\\s\\S]*?(?=\\n---\\s*(?:\\n|$)|$)`,
            ''
        );

        if (!fileData.markdown || fileData.markdown.trim() === '') {
            // Empty markdown means file was deleted — remove the section
            updatedBalMd = updatedBalMd.replace(sectionRegex, '');
        } else {
            const newSection = `---\n\n${fileData.markdown.trim()}`;
            if (sectionRegex.test(updatedBalMd)) {
                // Replace existing section
                updatedBalMd = updatedBalMd.replace(sectionRegex, newSection);
            } else {
                // New file — append at the end
                updatedBalMd = updatedBalMd.trimEnd() + '\n\n' + newSection + '\n';
            }
        }
    }

    // Clean up any multiple consecutive blank lines
    updatedBalMd = updatedBalMd.replace(/\n{3,}/g, '\n\n');
    return updatedBalMd;
}

function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
