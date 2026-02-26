import * as assert from 'assert';
import { buildSystemReminder } from '../../ai-features/agent-mode/agents/main/prompt_system_reminder';

const PROMPT_DEBUG_ENV_VAR = 'MI_AGENT_PROMPT_DEBUG';

suite('Agent Prompt', () => {
    const originalPromptDebugValue = process.env[PROMPT_DEBUG_ENV_VAR];

    teardown(() => {
        if (originalPromptDebugValue === undefined) {
            delete process.env[PROMPT_DEBUG_ENV_VAR];
            return;
        }
        process.env[PROMPT_DEBUG_ENV_VAR] = originalPromptDebugValue;
    });

    test('never includes development notice when debug mode is not enabled', () => {
        delete process.env[PROMPT_DEBUG_ENV_VAR];
        const reminder = buildSystemReminder('edit', '');
        assert.ok(!reminder.includes('YOU ARE IN DEVELOPMENT PHASE'));
    });

    test('never includes development notice when debug mode is enabled', () => {
        process.env[PROMPT_DEBUG_ENV_VAR] = 'true';
        const reminder = buildSystemReminder('edit', '');
        assert.ok(!reminder.includes('YOU ARE IN DEVELOPMENT PHASE'));
    });
});
