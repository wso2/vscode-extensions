/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import React from "react";
import { prettyDOM, waitFor } from "@testing-library/dom";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Diagram } from "../components/Diagram";
import { Flow } from "../utils/types";

// Import sample data
import model1 from "../stories/endpoint_call1.json";
import model2 from "../stories/function_call1.json";
import model3 from "../stories/function_call2.json";
import model4 from "../stories/function_call3.json";
import model5 from "../stories/if_node1.json";
import model6 from "../stories/if_node4.json";
import model7 from "../stories/if_node5.json";
import model8 from "../stories/if_node8.json";
import model9 from "../stories/while_node1.json";
import model10 from "../stories/sample-with-return.json";

async function renderAndCheckSnapshot(model: Flow, testName: string) {
    const mockProps = {
        onClickParticipant: jest.fn(),
        onAddParticipant: jest.fn(),
        onReady: jest.fn(),
    };

    const dom = render(<Diagram model={model} {...mockProps} />);

    // Wait for diagram to render
    await waitFor(
        () => {
            const diagramElements = dom.container.querySelectorAll('[class*="diagram"], svg, canvas');
            expect(diagramElements.length).toBeGreaterThan(0);
        },
        { timeout: 10000 }
    );

    const prettyDom = prettyDOM(dom.container, 1000000, {
        highlight: false,
        filterNode(node) {
            return true;
        },
    });

    expect(prettyDom).toBeTruthy();

    // Sanitization: remove dynamic IDs and non-deterministic attributes
    const sanitizedDom = (prettyDom as string)
        .replaceAll(/\s+(marker-end|id|data-linkid|data-nodeid)="[^"]*"/g, "")
        .replaceAll(/\s+(appearance|aria-label|current-value)="[^"]*"/g, "")
        // Normalize vscode-button tag formatting
        .replaceAll(/<vscode-button\s+>/g, "<vscode-button>");
    expect(sanitizedDom).toMatchSnapshot(testName);
}

describe("Sequence Diagram - Snapshot Tests", () => {
    test("renders endpoint call diagram correctly", async () => {
        await renderAndCheckSnapshot(model1 as Flow, "endpoint-call");
    }, 15000);

    test("renders function call 1 diagram correctly", async () => {
        await renderAndCheckSnapshot(model2 as Flow, "function-call-1");
    }, 15000);

    test("renders function call 2 diagram correctly", async () => {
        await renderAndCheckSnapshot(model3 as Flow, "function-call-2");
    }, 15000);

    test("renders function call 3 diagram correctly", async () => {
        await renderAndCheckSnapshot(model4 as Flow, "function-call-3");
    }, 15000);

    test("renders if node 1 diagram correctly", async () => {
        await renderAndCheckSnapshot(model5 as Flow, "if-node-1");
    }, 15000);

    test("renders if node 4 diagram correctly", async () => {
        await renderAndCheckSnapshot(model6 as Flow, "if-node-4");
    }, 15000);

    test("renders if node 5 diagram correctly", async () => {
        await renderAndCheckSnapshot(model7 as Flow, "if-node-5");
    }, 15000);

    test("renders if node 8 diagram correctly", async () => {
        await renderAndCheckSnapshot(model8 as Flow, "if-node-8");
    }, 15000);

    test("renders while node diagram correctly", async () => {
        await renderAndCheckSnapshot(model9 as Flow, "while-node");
    }, 15000);

    test("renders sample with return diagram correctly", async () => {
        await renderAndCheckSnapshot(model10 as Flow, "sample-with-return");
    }, 15000);
});
