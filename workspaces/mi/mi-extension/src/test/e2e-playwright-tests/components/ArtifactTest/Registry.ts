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

import { Page } from "@playwright/test";
import { switchToIFrame } from "@wso2/playwright-vscode-tester";
import { ProjectExplorer } from "../ProjectExplorer";
import { AddArtifact } from "../AddArtifact";
import { Overview } from "../Overview";
import { Form } from "../Form";
import { page } from "../../Utils";

interface RegistryDataFromTemplate {
    name: string;
    templateType: string;
    registryType: 'gov' | 'conf'; 
    registryPath: string;
}

interface RegistryDataFromFileSystem {
    filePath: string;
    registryType: 'gov' | 'conf';
    registryPath: string;
}

export class Registry {

    constructor(private _page: Page) {
    }

    public async openFormFromArtifacts() {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToAddArtifact("testProject430");
        const addArtifactPage = new AddArtifact(this._page);
        await addArtifactPage.init();
        await addArtifactPage.add('Registry');
    }

    private getRegistryForm(): Form {
        const form = new Form(this._page, 'Resource Creation Form');
        return form;
    }

    public async cancelForm() {
        const form = this.getRegistryForm();
        await form.switchToFormView();
        await form.cancel();
    }

    public async openRegistry(dirName:string, resName: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Registrys', dirName, resName], true);
    }

    public async addFromFileSystem(data: RegistryDataFromFileSystem) {
        const resWebView = await switchToIFrame('Resource Creation Form', this._page);
        if (!resWebView) {
            throw new Error("Failed to switch to Registry Form iframe");
        }
        const registryForm = new Form(page.page, 'Resource Creation Form');
        await registryForm.switchToFormView();
        await registryForm.fill({
            values: {
                'Import from file system': {
                    type: 'radio',
                    value: 'checked',
                },
                'Browse file': {
                    type: 'file',
                    value: data.filePath
                },
                'Registry Path': {
                    type: 'input',
                    value: data.registryPath,
                }
            },
        });
        await registryForm.submit();
    }

    public async addFromTemplate(data: RegistryDataFromTemplate) {
        const resWebView = await switchToIFrame('Resource Creation Form', this._page);
        if (!resWebView) {
            throw new Error("Failed to switch to Registry Form iframe");
        }
        const resFrame = resWebView.locator('div#root');
        await resFrame.waitFor();
        await resFrame.getByLabel('From existing template').click();
        await resFrame.getByRole('textbox', { name: 'Resource Name*' }).fill(data.name);
        await resFrame.locator('#templateType div').nth(1).click();
        await resFrame.getByLabel(data.templateType).click();
        await resFrame.getByLabel(this.getRegistryTypeLabel(data.registryType)).click();
        await resFrame.getByRole('textbox', { name: 'Registry Path' }).click();
        await resFrame.getByRole('textbox', { name: 'Registry Path' }).fill(data.registryPath);
        await resFrame.getByRole('button', { name: 'Create' }).click();
    }

    private getRegistryTypeLabel(type: string): string {
        switch (type) {
            case 'gov':
                return 'Governance registry (gov)';
            case 'conf':
                return 'Configuration registry (conf)';
            default:
                throw new Error(`Invalid registry type: ${type}`);
        }
    }
}
