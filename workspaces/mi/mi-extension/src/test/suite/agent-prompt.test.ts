import * as assert from 'assert';
import { buildSystemReminder } from '../../ai-features/agent-mode/agents/main/prompt_system_reminder';

suite('Agent Prompt', () => {
    test('system reminder does not include development notice text', () => {
        const reminder = buildSystemReminder('edit', '');
        assert.ok(!reminder.includes('YOU ARE IN DEVELOPMENT PHASE'));
    });
});
