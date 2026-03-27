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

import * as assert from 'assert';
import { buildSystemReminder } from '../../ai-features/agent-mode/agents/main/prompt_system_reminder';

suite('Agent Prompt', () => {
    test('buildSystemReminder returns edit mode reminder block when modeReminder is empty', () => {
        const reminder = buildSystemReminder('edit', '');
        assert.ok(reminder.includes('<mode>'));
        assert.ok(reminder.includes('EDIT'));
        assert.ok(reminder.includes('</mode>'));
        assert.strictEqual(reminder, '<mode>\nEDIT\n</mode>');
    });

    test('buildSystemReminder appends non-empty modeReminder content', () => {
        const modeReminder = 'Plan mode reminder text.';
        const reminder = buildSystemReminder('plan', modeReminder);
        assert.ok(reminder.includes('<mode>\nPLAN\n</mode>'));
        assert.ok(reminder.includes(modeReminder));
    });
});
