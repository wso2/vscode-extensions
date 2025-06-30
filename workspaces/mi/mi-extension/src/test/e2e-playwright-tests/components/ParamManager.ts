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

import { Frame, Locator, Page } from "@playwright/test";
import { Form } from "./Form";

export abstract class ParamManager {

    constructor(protected container: Locator, protected field: string, protected _page?: Page) {
    }

    public abstract getAddNewForm(action: string): Promise<Form>;

    public abstract getEditForm(index: number): Promise<Form>;

    public abstract getParamsCount(): Promise<number>;

    public abstract deleteParam(index: number): Promise<void>;

    protected async clickListItem(items: Locator, index: number): Promise<void> {
        if (await items.count() > 1) {
            await items.nth(index).hover();
            await items.nth(index).click();
        } else {
            await items.hover();
            await items.click();
        }
    }
}

export class SimpleParamManager extends ParamManager {

    constructor(protected container: Locator, protected field: string, protected addBtnName: string, private containerId?: string, protected _page?: Page) {
        super(container, field, _page);
        if (!containerId) {
            this.containerId = `parameterManager-${this.field}`;
        }
    }

    public async getAddNewForm(): Promise<Form> {
        const addBtn = this.container.locator(`div:text("${this.addBtnName}")`);
        await addBtn.click();
        return new Form(undefined, undefined, this.container.locator('#parameterManagerForm'));
    }

    public async getEditForm(index: number): Promise<Form> {
        const paramManagerContainer = this.container.locator(`#${this.containerId}`);
        await paramManagerContainer.waitFor();
        const editBtns = paramManagerContainer.locator('#paramEdit');
        await this.clickListItem(editBtns, index);
        return new Form(undefined, undefined, this.container.locator('#parameterManagerForm'));
    }

    public async getParamsCount(): Promise<number> {
        const paramManagerContainer = this.container.locator(`div:text("${this.addBtnName}")`).locator('../../..');
        await paramManagerContainer.waitFor();
        const editBtns = paramManagerContainer.locator('#paramEdit');
        return await editBtns.count();
    }

    public async deleteParam(index: number = 0): Promise<void> {
        const paramManagerContainer = this.container.locator(`#${this.containerId}`);
        await paramManagerContainer.waitFor();
        const trashBtns = paramManagerContainer.locator('#paramTrash');
        await this.clickListItem(trashBtns, index);
    }
}

export class DefaultParamManager extends ParamManager {

    constructor(protected container: Locator, protected field: string, private addBtnName?: string, private containerId?: string, protected _page?: Page) {
        super(container, field, _page);
        if (!addBtnName) {
            this.addBtnName = "Add Parameter";
        }
        if (!containerId) {
            this.containerId = `card-select-parameterManager-${this.field}`;
        }
    }

    public async getAddNewForm(): Promise<Form> {
        const paramManagerContainer = this.container.locator(`#${this.containerId}`);
        await paramManagerContainer.waitFor();
        const addParamBtn = paramManagerContainer.locator(`div:text("${this.addBtnName}")`);
        await addParamBtn.click();
        return new Form(undefined, undefined, paramManagerContainer.locator('#parameterManagerForm'))
    }

    public async getEditForm(index: number): Promise<Form> {
        const paramManagerContainer = this.container.locator(`#${this.containerId}`);
        await paramManagerContainer.waitFor();
        const editBtns = paramManagerContainer.locator('#paramEdit');
        await this.clickListItem(editBtns, index);
        return new Form(undefined, undefined, this.container.locator('#parameterManagerForm'));
    }

    public async getParamsCount(): Promise<number> {
        const paramManagerContainer = this.container.locator(`h3:text("${this.field}")`).locator('../..');
        await paramManagerContainer.waitFor();
        const editBtns = paramManagerContainer.locator('#paramEdit');
        return await editBtns.count();
    }

    public async deleteParam(index: number = 0): Promise<void> {
        const paramManagerContainer = this.container.locator(`#${this.containerId}`);
        await paramManagerContainer.waitFor();
        const trashBtns = paramManagerContainer.locator('#paramTrash');
        await this.clickListItem(trashBtns, index);
    }
}

export class ParamManagerWithNewCreateForm extends ParamManager {

    constructor(protected container: Locator, protected field: string, private frameName: string, private webview: Frame, private containerId?: string, protected _page?: Page) {
        super(container, field, _page);
        if (!containerId) {
            this.containerId = `card-select-parameterManager-${this.field}`;
        }
        console.log(`Getting param manager with a new create form for container id: ${this.containerId}`);
    }

    public async getAddNewForm(): Promise<Form> {
        const paramManagerContainer = this.container.locator(`#${this.containerId}`);
        await paramManagerContainer.waitFor();
        const addBtn = paramManagerContainer.locator('vscode-button:has-text("Add")');
        await addBtn.click();
        const form = new Form(this._page, this.frameName);
        await form.switchToFormView();
        return form;
    }
    
    public async getEditForm(index: number): Promise<Form> {
        const paramManagerContainer = this.container.locator(`#${this.containerId}`);
        await paramManagerContainer.waitFor();
        const optionBtns = paramManagerContainer.locator('i[class="codicon codicon-ellipsis"]');
        await this.clickListItem(optionBtns, index);
        const editIcon = await this.webview.getByRole('gridcell', { name: 'Edit' });
        await editIcon.click();
        const form = new Form(this._page, this.frameName);
        await form.switchToFormView();
        return form;
    }

    public async getParamsCount(): Promise<number> {
        const paramManagerContainer = this.container.locator(`h3:text("${this.field}")`).locator('../..');
        await paramManagerContainer.waitFor();
        const optionBtns = paramManagerContainer.locator('i[class="codicon codicon-ellipsis"]');
        return await optionBtns.count();
    }

    public async deleteParam(index: number = 0): Promise<void> {
        console.log(`Deleting param at index: ${index} from container id: ${this.containerId}`);
        const paramManagerContainer = this.container.locator(`#${this.containerId}`);
        await paramManagerContainer.waitFor();
        const optionBtns = paramManagerContainer.locator('i[class="codicon codicon-ellipsis"]');
        await this.clickListItem(optionBtns, index);
        const deleteIcon = await this.webview.getByRole('gridcell', { name: 'Delete' });
        await deleteIcon.click();
    }
}
