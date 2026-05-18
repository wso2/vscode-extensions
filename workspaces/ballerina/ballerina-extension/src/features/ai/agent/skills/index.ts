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

import { Skill } from './types';
import { dataMapSkill } from './data-map';

export type { Skill };

/** All registered skills, in the order they appear in the system prompt. */
const REGISTERED_SKILLS: Skill[] = [
    dataMapSkill,
];

/** Returns the names of all registered skills. Used by the agent to show active skills in the UI. */
export function getRegisteredSkillNames(): string[] {
    return REGISTERED_SKILLS.map(s => s.name);
}

function formatSkill(skill: Skill): string {
    return `## Skill: ${skill.name}

**Trigger**: ${skill.trigger}

**Content**:
${skill.content}`;
}

/**
 * Builds the # Skills section of the agent system prompt.
 * All registered skills are rendered here in order.
 */
export function getSkillsSection(): string {
    console.debug(`[Skills] Loaded ${REGISTERED_SKILLS.length} skill(s) into system prompt: ${REGISTERED_SKILLS.map(s => s.name).join(', ')}`);

    return `# Skills

Skills are specialised rule sets for specific tasks. When a skill's trigger condition is met, apply its content exactly — do not improvise outside those rules.

${REGISTERED_SKILLS.map(formatSkill).join('\n\n')}`;
}
