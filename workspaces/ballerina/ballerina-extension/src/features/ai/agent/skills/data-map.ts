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

import { getDataMappingSkillContent } from '../../data-mapper/prompts/mapping-prompt';
import { DIAGNOSTICS_TOOL_NAME } from '../tools/diagnostics';
import { Skill } from './types';

export const dataMapSkill: Skill = {
    name: 'DataMap',
    trigger:
        'Use this skill whenever you are generating Ballerina mapping/transformation expressions between any data types' +
        ' — records, JSON, XML, arrays, or primitive types (e.g. implementing a transform function body, converting' +
        ' JSON to a record, mapping XML elements to fields, or transforming primitive values).',
    content: getDataMappingSkillContent(DIAGNOSTICS_TOOL_NAME),
};
