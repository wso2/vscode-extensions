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
import { getVsCodeButton, getWebviewInput, switchToIFrame } from "@wso2/playwright-vscode-tester";
import { DefaultParamManager, SimpleParamManager, ParamManagerWithNewCreateForm } from "./ParamManager";

export interface FormFillProps {
    values: {
        [key: string]: {
            value: string,
            type: 'input' | 'dropdown' | 'checkbox' | 'combo' | 'expression' | 'file' | 'inlineExpression' | 'radio' | 'textarea',
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
    private container!: Locator;
    private webview!: Frame;

    constructor(private _page?: Page, private _name?: string, container?: Locator) {
        if (container) {
            this.container = container;
        }
    }

    public async switchToFormView(isPopUp?: boolean) {
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

    public async submit(btnText: string = "Create") {
        const submitBtn = await getVsCodeButton(this.container, btnText, "primary");
        expect(await submitBtn.isEnabled()).toBeTruthy();
        await submitBtn.click();
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

    public async clickHelperPaneBtnForField(field: string) {
        const parentDiv = this.container.locator(`div[data-test-id="EX${field}"]`);
        await parentDiv.waitFor();
        const chipBtn = await parentDiv.getByTitle('Open Helper Pane').locator('div');
        await chipBtn.click();
    }

    public async getInputValue(key: string) {
        const input = this.container.locator(`vscode-text-field[aria-label="${key}"]`);
        return await input.getAttribute('current-value');
    }

    public async getDefaultParamManager(field: string, btnName?: string, containerId?: string): Promise<DefaultParamManager> {
        return new DefaultParamManager(this.container, field, btnName, containerId, this._page);
    }

    public async getSimpleParamManager(field: string, containerId?: string): Promise<SimpleParamManager> {
        const btnName = `Add ${field}`;
        return new SimpleParamManager(this.container, field, btnName, containerId, this._page);
    }

    public async getParamManagerWithNewCreateForm(field: string, frameName: string, containerId?: string): Promise<ParamManagerWithNewCreateForm> {
        return new ParamManagerWithNewCreateForm(this.container, field, frameName, this.webview, containerId, this._page);
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
}
