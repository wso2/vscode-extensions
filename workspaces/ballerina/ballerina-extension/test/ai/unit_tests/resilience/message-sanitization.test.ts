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

import * as assert from "assert";
import {
    repairToolCallInputs,
    sanitizeMessages,
} from "../../../../src/features/ai/agent/resilience/messageSanitization";

// The real bug shape: `"new_string">` (should be `":`) makes the input unparseable, so the SDK
// keeps it as a string on the tool-call part.
const MALFORMED_INPUT =
    '{"file_path": "types.bal", "edits": [{"old_string": "a", "new_string">"b"}]}';

const assistantWithMalformedCall = () => ({
    role: "assistant",
    content: [
        { type: "text", text: "Editing the file." },
        {
            type: "tool-call",
            toolCallId: "call_1",
            toolName: "file_batch_edit",
            input: MALFORMED_INPUT, // string — the bug
        },
    ],
});

suite("resilience/messageSanitization", () => {
    suite("repairToolCallInputs", () => {
        test("coerces an unparseable string input to an empty object", () => {
            const messages = [assistantWithMalformedCall()];
            const repaired = repairToolCallInputs(messages);
            const call = (messages[0].content as any[])[1];
            assert.strictEqual(repaired, 1);
            assert.strictEqual(typeof call.input, "object");
            assert.deepStrictEqual(call.input, {});
        });

        test("parses a well-formed JSON string input into the object it represents", () => {
            const messages = [
                {
                    role: "assistant",
                    content: [
                        {
                            type: "tool-call",
                            toolCallId: "c",
                            toolName: "t",
                            input: '{"file_path":"main.bal","edits":[]}',
                        },
                    ],
                },
            ];
            const repaired = repairToolCallInputs(messages);
            assert.strictEqual(repaired, 1);
            assert.deepStrictEqual((messages[0].content as any[])[0].input, {
                file_path: "main.bal",
                edits: [],
            });
        });

        test("coerces a string truncated mid-JSON to {} (output-token cap on large writes)", () => {
            // The common production trigger: a large file write whose tool-call JSON is cut off
            // at the 8192 output-token limit, leaving unparseable text.
            const messages = [
                {
                    role: "assistant",
                    content: [
                        {
                            type: "tool-call",
                            toolCallId: "c",
                            toolName: "file_batch_edit",
                            input: '{"file_path":"main.bal","content":"import ballerina/ht',
                        },
                    ],
                },
            ];
            assert.strictEqual(repairToolCallInputs(messages), 1);
            assert.deepStrictEqual((messages[0].content as any[])[0].input, {});
        });

        test("coerces an empty string input to {}", () => {
            const messages = [
                {
                    role: "assistant",
                    content: [{ type: "tool-call", toolCallId: "c", toolName: "t", input: "" }],
                },
            ];
            assert.strictEqual(repairToolCallInputs(messages), 1);
            assert.deepStrictEqual((messages[0].content as any[])[0].input, {});
        });

        test("coerces a JSON array string to {} (provider requires an object, not an array)", () => {
            const messages = [
                {
                    role: "assistant",
                    content: [{ type: "tool-call", toolCallId: "c", toolName: "t", input: "[1,2,3]" }],
                },
            ];
            repairToolCallInputs(messages);
            assert.deepStrictEqual((messages[0].content as any[])[0].input, {});
        });

        test("leaves a valid object input untouched and is a no-op (returns 0)", () => {
            const original = { file_path: "main.bal", edits: [{ old_string: "a", new_string: "b" }] };
            const messages = [
                {
                    role: "assistant",
                    content: [{ type: "tool-call", toolCallId: "c", toolName: "t", input: original }],
                },
            ];
            const repaired = repairToolCallInputs(messages);
            assert.strictEqual(repaired, 0);
            assert.strictEqual((messages[0].content as any[])[0].input, original);
        });

        test("repairs multiple malformed calls across messages and counts them", () => {
            const messages = [
                assistantWithMalformedCall(),
                { role: "user", content: "continue" },
                assistantWithMalformedCall(),
            ];
            assert.strictEqual(repairToolCallInputs(messages), 2);
        });

        test("ignores messages with non-array content and tolerates empty input", () => {
            assert.strictEqual(repairToolCallInputs([]), 0);
            assert.strictEqual(repairToolCallInputs(undefined as any), 0);
            assert.strictEqual(repairToolCallInputs([{ role: "user", content: "hi" }]), 0);
        });
    });

    suite("sanitizeMessages", () => {
        test("runs the repair passes over the history in place", () => {
            const messages = [assistantWithMalformedCall()];
            sanitizeMessages(messages);
            assert.deepStrictEqual((messages[0].content as any[])[1].input, {});
        });

        test("leaves a clean history untouched", () => {
            const messages = [
                {
                    role: "assistant",
                    content: [{ type: "tool-call", toolCallId: "c", toolName: "t", input: { ok: 1 } }],
                },
            ];
            sanitizeMessages(messages);
            assert.deepStrictEqual((messages[0].content as any[])[0].input, { ok: 1 });
        });
    });
});
