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
