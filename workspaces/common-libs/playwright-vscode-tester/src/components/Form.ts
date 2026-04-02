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

import { Frame, Locator, Page, expect } from "@playwright/test";
import { getVsCodeButton, getWebviewInput, switchToIFrame } from "./Utils";

export interface FormFillProps {
    values: {
        [key: string]: {
            value: string,
            type: 'input' | 'dropdown' | 'checkbox' | 'combo' | 'expression' | 'file' | 'directory' | 'inlineExpression' | 'radio' | 'textarea' | 'cmEditor',
            additionalProps?: {
                [key: string]: any
            }
        }
    },
    enabledFields?: string[];
}

export interface ParamManagerValues {
    [key: string]: string;
}

export class Form {
    private container!: Locator | Frame;
    private webview!: Frame;

    constructor(private _page?: Page, private _name?: string, container?: Locator | Frame) {
        if (container) {
            this.container = container;
        }
    }

    public async switchToFormView(isPopUp?: boolean, container?: Locator | Frame) {
        if (!this._name || !this._page) {
            throw new Error("Name and Page are required to switch to Form View");
        }
        const webview = await switchToIFrame(this._name, this._page)
        if (!webview) {
            throw new Error("Failed to switch to Form View iframe");
        }
        this.webview = webview;
        if (isPopUp) {
            this.container = webview.locator('#popUpPanel');
        } else if (container) {
            this.container = container;
        } else {
            this.container = webview.locator('div.form-view');
        }
    }

    public async close() {
        const closeButton = this.container.getByTitle('Close');
        expect(closeButton).not.toBeNull();
        await closeButton.click();
    }

    public async cancel() {
        const cancelBtn = this.container.locator(`vscode-button:has-text("Cancel")`);
        await cancelBtn.waitFor();
        await cancelBtn.click();
    }

    public async submit(btnText: string = "Create", forceClick: boolean = false) {
        const submitBtn = await getVsCodeButton(this.container, btnText, "primary");
        expect(await submitBtn.isEnabled()).toBeTruthy();
        if (forceClick) {
            await submitBtn.click({ force: true });
        } else {
            await submitBtn.click();
        }
    }

    public async fill(props: FormFillProps) {
        const { values, enabledFields } = props;
        if (values) {
            const keys = Object.keys(values);
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                const data = values[key];
                switch (data.type) {
                    case 'input': {
                        const input = await getWebviewInput(this.container, key);
                        await input.fill(data.value);
                        break;
                    }
                    case 'textarea': {
                        const input = this.container.locator(`textarea[aria-label="${key}"]`);
                        await input.fill(data.value);
                        if (data.additionalProps?.clickLabel) {
                            await this.container.locator(`label:text("${key}")`).click();
                        }
                        if (data.additionalProps?.clickItem) {
                            await this.container.locator(`[data-testid="type-helper-item-${data.value}"]`).click();
                        }
                        break;
                    }
                    case 'dropdown': {
                        const dropdown = this.container.locator(`vscode-dropdown[aria-label="${key}"]`);
                        await dropdown.waitFor();
                        await dropdown.click();
                        const option = this.container.locator(`vscode-option[aria-label="${data.value}"]`);
                        await option.waitFor();
                        await option.click();
                        break;
                    }
                    case 'checkbox': {
                        const checkbox = this.container.locator(`vscode-checkbox[aria-label="${key}"]`);
                        await checkbox.waitFor();
                        const isChecked = await checkbox.isChecked();
                        // .check is having a intermittent issue: https://github.com/microsoft/playwright/issues/13470
                        if (data.value === 'checked') {
                            if (!isChecked) {
                                await checkbox.click();
                            }
                        } else {
                            if (isChecked) {
                                await checkbox.click();
                            }
                        }
                        break;
                    }
                    case 'combo': {
                        let parentDiv;
                        if (data.additionalProps?.nthValue !== undefined) {
                            parentDiv = this.container.locator(`label:text("${key}")`).nth(data.additionalProps?.nthValue).locator('../../..');
                        } else {
                            parentDiv = this.container.locator(`label:text("${key}")`).locator('../../..');
                        }
                        await parentDiv.waitFor();
                        const input = parentDiv.locator('input[role="combobox"]');
                        await input.click();
                        let option;
                        if (data.additionalProps?.hasMultipleValues) {
                            const regex = new RegExp(`${data.value}1|${data.value}2|${data.value}3`);
                            option = parentDiv.locator('li', { hasText: regex });
                        } else {
                            option = parentDiv.locator(`li:has-text("${data.value}")`);
                        }
                        await option.first().click();
                        break;
                    }
                    case 'expression': {
                        const container = this.container.locator(`div[data-test-id="EX${key}"]`);
                        await container.waitFor();
                        const textInput = container.locator('textarea');
                        await textInput.fill(data.value);
                        break;
                    }
                    case 'cmEditor': {
                        // Handles fields rendered as CodeMirror cm-editor
                        // Try to directly find the ex-editor-{key} container, then interact with its .cm-editor
                        const exEditorTestId = `ex-editor-${key}`;
                        const containerDiv = this.container.locator(`div[data-testid="${exEditorTestId}"]`);
                        let found = await containerDiv.count();
                        let cmEditor;
                        if (found) {
                            // Check if user has given to switch between Expression and Text mode
                            if (data.additionalProps?.switchMode) {
                                switch (data.additionalProps?.switchMode) {
                                    case 'primary-mode':
                                        if (await this._detectInputMode(containerDiv, data.additionalProps?.window) === 'expression') {
                                            const primaryModeButton = containerDiv.locator('[data-testid="primary-mode"]');
                                            await primaryModeButton.waitFor({ state: 'visible', timeout: 5000 });
                                            await primaryModeButton.click();
                                            // Handle warning dialog if it appears (when switching from Expression to Text mode)
                                            const continueButton = this.container.locator('vscode-button:has-text("Continue")');
                                            if (await continueButton.count() > 0) {
                                                await continueButton.waitFor({ state: 'visible', timeout: 2000 });
                                                await continueButton.click();
                                            }
                                            // Wait a bit for the mode switch to complete
                                            await this._page?.waitForTimeout(500);
                                        }
                                        break;
                                    case 'expression-mode':
                                        if (await this._detectInputMode(containerDiv, data.additionalProps?.window) === 'text') {
                                            const expressionModeButton = containerDiv.locator('[data-testid="expression-mode"]');
                                            await expressionModeButton.waitFor({ state: 'visible', timeout: 5000 });
                                            await expressionModeButton.click();
                                            // Wait a bit for the mode switch to complete
                                            await this._page?.waitForTimeout(500);
                                        }
                                        break;
                                }
                            }

                            cmEditor = containerDiv.locator('.cm-editor');
                            await cmEditor.waitFor();
                            const editorInput = cmEditor.locator('div[contenteditable="true"]');
                            await editorInput.waitFor();
                            await editorInput.click({ clickCount: 3 }); // Focus and select for replacement
                            await editorInput.fill(data.value);
                        }
                        break;
                    }
                    case 'inlineExpression': {
                        const parentDiv = this.container.locator(`label:text("${key}")`).locator('../..');
                        await parentDiv.waitFor();
                        const input = parentDiv.locator('div[contenteditable="true"]');
                        await input.fill(data.value);
                        break;
                    }
                    case 'file': {
                        const btn = await getVsCodeButton(this.container, `${key}`, 'secondary');
                        await btn.click();
                        const fileInput = await this._page?.waitForSelector('.quick-input-header');
                        const textInput = await fileInput?.waitForSelector('input[type="text"]');
                        await textInput?.fill(data.value);
                        const okBtn = await fileInput?.waitForSelector('a.monaco-button:has-text("OK")');
                        await okBtn?.click();
                        break;
                    }
                    case 'directory': {
                        // Find the input field by label and fill it
                        const labelElement = this.container.locator(`label:has-text("${key}")`);
                        await labelElement.waitFor();
                        // Find the parent container and then the input field
                        const parentContainer = labelElement.locator('../..');
                        const input = parentContainer.locator('input[type="text"]');
                        await input.waitFor();
                        // Fill the input field (now that it's editable)
                        await input.fill(data.value);
                        break;
                    }
                    case 'radio': {
                        const checkbox = this.container.locator(`vscode-radio[aria-label="${key}"]`);
                        await checkbox.waitFor();
                        const isChecked = await checkbox.isChecked();
                        // .check is having a intermittent issue: https://github.com/microsoft/playwright/issues/13470
                        if (data.value === 'checked') {
                            if (!isChecked) {
                                await checkbox.click();
                            }
                        } else {
                            if (isChecked) {
                                await checkbox.click();
                            }
                        }
                        break;
                    }
                }
            }
        }
        if (enabledFields) {
            for (let i = 0; i < enabledFields.length; i++) {
                const key = enabledFields[i];
                const enabledField = this.container.locator(`label:text("${key}")`);
                await enabledField.waitFor();
            }
        }
    }

    public async clickAddNewForField(key: string) {
        const parentDiv = this.container.locator(`label:text("${key}")`).locator('../..');
        await parentDiv.waitFor();
        const addNewBtn = parentDiv.locator('div:text("Add New")');
        await addNewBtn.click();
    }

    public async clickExBtnForField(field: string) {
        const parentDiv = this.container.locator(`#keylookup${field}`);
        await parentDiv.waitFor();
        const exBtn = parentDiv.getByRole('heading', { name: 'EX' });
        await exBtn.click();
    }

    public async clickPencilBtnForField(field: string) {
        const parentDiv = this.container.locator(`#keylookup${field}`);
        await parentDiv.waitFor();
        const pencilBtn = parentDiv.locator('a');
        await pencilBtn.click();
    }

    public async getInputValue(key: string) {
        const input = this.container.locator(`vscode-text-field[aria-label="${key}"]`);
        return await input.getAttribute('current-value');
    }

    public async fillParamManager(props: ParamManagerValues, paramManagerLabel: string = "Add Parameter",
        keyLabel: string = "Name*", valueLabel: string = "Value*", saveBtnLabel: string = "Save") {
        for (const key in props) {
            const addParamaterBtn = this.container.locator(`div:text("${paramManagerLabel}")`).locator('..');
            await addParamaterBtn.waitFor();
            await addParamaterBtn.click();

            const value = props[key];
            const keyInput = await getWebviewInput(this.container, keyLabel);
            await keyInput.fill(key);
            const valueInput = await getWebviewInput(this.container, valueLabel);
            await valueInput.fill(value);

            const saveBtn = this.container.locator(`div:text("${saveBtnLabel}")`).locator('..');
            await saveBtn.waitFor();
            await saveBtn.click();
        }
    }

    public async getWebview() {
        return this.webview;
    }


    private async _detectInputMode(containerDiv: Locator, window: any): Promise<'text' | 'expression' | 'unknown'> {
        // Method 1: Use mode switcher (most reliable - checks the actual UI state)
        // Hover to show the mode switcher and check which button is active
        try {
            await containerDiv.hover();
            const primaryModeButton = containerDiv.locator('[data-testid="primary-mode"]');
            const expressionModeButton = containerDiv.locator('[data-testid="expression-mode"]');

            if (await primaryModeButton.count() > 0 && await expressionModeButton.count() > 0) {
                await primaryModeButton.waitFor({ state: 'visible', timeout: 2000 });
                await expressionModeButton.waitFor({ state: 'visible', timeout: 2000 });

                // Check font-weight: active mode has font-weight: 600, inactive has 500
                const primaryFontWeight = await primaryModeButton.evaluate((el) =>
                    parseInt(window.getComputedStyle(el).fontWeight)
                );
                const expressionFontWeight = await expressionModeButton.evaluate((el) =>
                    parseInt(window.getComputedStyle(el).fontWeight)
                );

                if (primaryFontWeight >= 600) {
                    return 'text';
                } else if (expressionFontWeight >= 600) {
                    return 'expression';
                }
            }
        } catch (error) {
            // If mode switcher detection fails, fall back to input type detection
            console.log('Mode switcher detection failed, falling back to input type detection:', error);
        }
        return 'unknown';
    }

}
