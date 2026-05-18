// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

/**
 * A Skill is a specialised rule set embedded in the agent system prompt.
 * Claude reads the trigger condition and applies the content rules directly
 * using its existing tools — no sub-LLM call is involved.
 *
 * To add a new skill: create a new file in this folder that exports a `Skill`
 * constant, then add it to the `skills` array in `getSkillsSection()` in index.ts.
 */
export interface Skill {
    name: string;
    /** One-sentence condition that tells Claude when to activate this skill. */
    trigger: string;
    /** The full rule set Claude must follow when the skill is active. */
    content: string;
}
