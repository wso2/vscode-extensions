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

import { tool } from 'ai';
import { z } from 'zod';
import { AI_CONNECTOR_DOCUMENTATION } from '../context/connectors_guide';
import { logDebug } from '../../copilot/logger';
import { SkillExecuteFn, ToolResult } from './types';

interface SkillDefinition {
    name: string;
    description: string;
    content: string;
}

const SKILLS: SkillDefinition[] = [
    {
        name: 'ai_connector_app_development',
        description: 'Developing AI-powered apps with AI connector (chat, RAG, knowledge base, and agent tools).',
        content: AI_CONNECTOR_DOCUMENTATION,
    },
];

function normalizeSkillName(value: string): string {
    return value.trim().toLowerCase();
}

export function getAvailableSkills(): Array<{ name: string; description: string }> {
    return SKILLS.map((skill) => ({
        name: skill.name,
        description: skill.description,
    }));
}

function findSkill(skillName: string): SkillDefinition | undefined {
    const target = normalizeSkillName(skillName);
    return SKILLS.find((skill) => normalizeSkillName(skill.name) === target);
}

export function createSkillExecute(): SkillExecuteFn {
    return async (args: { skill_name: string }): Promise<ToolResult> => {
        const { skill_name } = args;
        const skill = findSkill(skill_name);
        if (!skill) {
            const available = SKILLS.map((item) => item.name).join(', ');
            return {
                success: false,
                message: `Unknown skill '${skill_name}'. Available skills: ${available}`,
                error: 'Error: Unknown skill',
            };
        }

        logDebug(`[SkillTool] Loaded skill context: ${skill.name}`);

        return {
            success: true,
            message: [
                `Loaded skill context '${skill.name}'.`,
                `Description: ${skill.description}`,
                '',
                '<SKILL_CONTEXT>',
                skill.content,
                '</SKILL_CONTEXT>',
            ].join('\n'),
        };
    };
}

const skillInputSchema = z.object({
    skill_name: z.string().describe('Skill name to load (see <available_skills> in prompt).'),
});

export function createSkillTool(execute: SkillExecuteFn) {
    return (tool as any)({
        description: `Loads specialized domain guidance on demand to avoid unnecessary context usage.
            Use only when the task requires a specific skill context from <available_skills>.`,
        inputSchema: skillInputSchema,
        execute,
    });
}
