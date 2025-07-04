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

export class Endpoint {

    constructor(private _page: Page) {
    }

    public async init() {
        const addArtifactPage = new AddArtifact(this._page);
        await addArtifactPage.init();
        await addArtifactPage.add('Endpoint');
    }

    public async addHttpEndpoint(name: string) {
        const epWebView = await switchToIFrame('Endpoint Form', this._page);
        if (!epWebView) {
            throw new Error("Failed to switch to Endpoint Form iframe");
        }
        const epFrame = epWebView.locator('div#root');
        await epFrame.getByText('HTTP connection endpoint').click();
        const httpEPWebview = await switchToIFrame('Http Endpoint Form', this._page);
        if (!httpEPWebview) {
            throw new Error("Failed to switch to Http Endpoint Form iframe");
        }
        const httpEPFrame = httpEPWebview.locator('div#root');
        await httpEPFrame.getByRole('textbox', { name: 'Endpoint Name*' }).click();
        await httpEPFrame.getByRole('textbox', { name: 'Endpoint Name*' }).fill(name);
        await httpEPFrame.getByRole('textbox', { name: 'URI Template*' }).click();
        await httpEPFrame.getByRole('textbox', { name: 'URI Template*' }).fill('https://fake-json-api.mock.beeceptor.com/users');
        await httpEPFrame.locator('svg').click();
        await httpEPFrame.getByLabel('POST').click();
        await httpEPFrame.getByTestId('create-button').click();
        const overview = await switchToIFrame('Project Overview', this._page);
        if (!overview) {
            throw new Error("Failed to switch to Endpoint Form iframe");
        }
    }

    public async editHttpEndpoint(prevName: string, newName: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Endpoints', prevName], true);

        const httpEPWebview = await switchToIFrame('Http Endpoint Form', this._page);
        if (!httpEPWebview) {
            throw new Error("Failed to switch to Http Endpoint Form iframe");
        }
        const httpEPFrame = httpEPWebview.locator('div#root');
        await httpEPFrame.getByRole('textbox', { name: 'Endpoint Name*' }).click();
        await httpEPFrame.getByRole('textbox', { name: 'Endpoint Name*' }).fill(newName);
        await httpEPFrame.getByRole('textbox', { name: 'URI Template*' }).click();
        await httpEPFrame.getByRole('textbox', { name: 'URI Template*' }).fill('https://fake-json-api.mock.beeceptor.com');
        await httpEPFrame.locator('svg').click();
        await httpEPFrame.getByLabel('PUT').click();
        await httpEPFrame.getByTestId('create-button').click();
        const overview = await switchToIFrame('Project Overview', this._page);
        if (!overview) {
            throw new Error("Failed to switch to Endpoint Form iframe");
        }
    }

    public async addLoadBalanceEndpoint(name: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Endpoints'], true);
        await this._page.getByLabel('Add Endpoint').click();
        const epWebview = await switchToIFrame('Endpoint Form', this._page);
        if (!epWebview) {
            throw new Error("Failed to switch to Endpoint Form iframe");
        }
        const epFrame = epWebview.locator('div#root');
        await epFrame.getByText('Load Balance Endpoint').click();
        const lbEPWebview = await switchToIFrame('Load Balance Endpoint Form', this._page);
        if (!lbEPWebview) {
            throw new Error("Failed to switch to load balance Endpoint Form iframe");
        }
        const lbEPFrame = lbEPWebview.locator('div#root');
        await lbEPFrame.getByRole('textbox', { name: 'Name*' }).click();
        await lbEPFrame.getByRole('textbox', { name: 'Name*' }).fill(name);
        await lbEPFrame.locator('#algorithm svg').click();
        await lbEPFrame.getByLabel('Weighted RRLC Algorithm').click({force: true});
        await lbEPFrame.getByRole('button', { name: 'Create' }).click();
        const overview = await switchToIFrame('Project Overview', this._page);
        if (!overview) {
            throw new Error("Failed to switch to Endpoint Form iframe");
        }
    }

    public async editLoadBalanceEndpoint(prevName: string, newName: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Endpoints', prevName], true);
        const lbEPWebview = await switchToIFrame('Load Balance Endpoint Form', this._page);
        if (!lbEPWebview) {
            throw new Error("Failed to switch to load balance Endpoint Form iframe");
        }
        const lbEPFrame = lbEPWebview.locator('div#root');
        await lbEPFrame.getByRole('textbox', { name: 'Name*' }).click();
        await lbEPFrame.getByRole('textbox', { name: 'Name*' }).fill(newName);
        await lbEPFrame.locator('#algorithm svg').click();
        await lbEPFrame.getByLabel('Weighted Round Robin').click({force: true});
        await lbEPFrame.getByRole('button', { name: 'Save Changes' }).click();
        const overview = await switchToIFrame('Project Overview', this._page);
        if (!overview) {
            throw new Error("Failed to switch to Endpoint Form iframe");
        }
    }

    public async addFailoverEndpoint(name: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Endpoints'], true);
        await this._page.getByLabel('Add Endpoint').click();
        const epWebview = await switchToIFrame('Endpoint Form', this._page);
        if (!epWebview) {
            throw new Error("Failed to switch to Endpoint Form iframe");
        }
        const epFrame = epWebview.locator('div#root');
        await epFrame.getByText('Failover Endpoint').click();
        const foEPWebview = await switchToIFrame('Failover Endpoint Form', this._page);
        if (!foEPWebview) {
            throw new Error("Failed to switch to Failover Endpoint Form iframe");
        }
        const foEPFrame = foEPWebview.locator('div#root');
        await foEPFrame.getByRole('textbox', { name: 'Name*' }).fill(name);
        await foEPFrame.locator('slot').filter({ hasText: /^False$/ }).click();
        await foEPFrame.getByLabel('True').click();
        await foEPFrame.getByRole('button', { name: 'Add new Endpoint' }).click();
        await foEPFrame.getByRole('textbox').first().fill('<endpoint name="test" xmlns="http://ws.apache.org/ns/synapse"></endpoint>');
        await foEPFrame.locator('.css-1qy2g5i > .codicon').click();
        await foEPFrame.getByRole('textbox', { name: 'Description' }).fill('Description');
        await foEPFrame.getByText('Add Parameter').click();
        await foEPFrame.locator('#txt-field-0').getByPlaceholder('parameter_key').fill('testProperty');
        await foEPFrame.getByRole('textbox', { name: 'Value*' }).first().fill('testValue');
        await foEPFrame.locator('slot').filter({ hasText: /^default$/ }).click();
        await foEPFrame.getByLabel('transport').click();
        await foEPFrame.getByRole('button', { name: 'Create' }).click();
    }

    public async editFailoverEndpoint(prevName: string, newName: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Endpoints', prevName], true);
        const foEPWebview = await switchToIFrame('Failover Endpoint Form', this._page);
        if (!foEPWebview) {
            throw new Error("Failed to switch to Failover Endpoint Form iframe");
        }
        const foEPFrame = foEPWebview.locator('div#root');
        await foEPFrame.getByRole('textbox', { name: 'Name*' }).fill(newName);
        await foEPFrame.locator('slot').filter({ hasText: /^True$/ }).click();
        await foEPFrame.getByLabel('False').click();        
        await foEPFrame.getByRole('button', { name: 'Save Changes' }).click();
    }

    public async addRecipientListEndpoint(name: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Endpoints'], true);
        await this._page.getByLabel('Add Endpoint').click();
        const epWebview = await switchToIFrame('Endpoint Form', this._page);
        if (!epWebview) {
            throw new Error("Failed to switch to Endpoint Form iframe");
        }
        const epFrame = epWebview.locator('div#root');
        await epFrame.getByText('View More').click();
        await epFrame.getByText('Recipient List Endpoint').click();
        const rlEPWebview = await switchToIFrame('Recipient Endpoint Form', this._page);
        if (!rlEPWebview) {
            throw new Error("Failed to switch to Recipient Endpoint Form iframe");
        }
        const rlEPFrame = rlEPWebview.locator('div#root');
        await rlEPFrame.getByRole('textbox', { name: 'Name*' }).fill(name);
        await rlEPFrame.getByRole('button', { name: 'Add new Endpoint' }).click();
        await rlEPFrame.getByRole('textbox').first().fill('<endpoint name="test" xmlns="http://ws.apache.org/ns/synapse"></endpoint>');
        await rlEPFrame.locator('.css-1qy2g5i > .codicon').click();

        await rlEPFrame.getByText('Add Parameter').click();
        await rlEPFrame.locator('#txt-field-0').getByPlaceholder('parameter_key').fill('testProperty');
        await rlEPFrame.getByRole('textbox', { name: 'Value*' }).first().fill('testValue');
        await rlEPFrame.locator('slot').filter({ hasText: /^default$/ }).click();
        await rlEPFrame.getByLabel('axis2', { exact: true }).click();
        await rlEPFrame.getByText('Save').click();
        await rlEPFrame.getByText('Create').click();
    }

    public async editRecipientListEndpoint(prevName: string, newName: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Endpoints', prevName], true);
        const rlEPWebview = await switchToIFrame('Recipient Endpoint Form', this._page);
        if (!rlEPWebview) {
            throw new Error("Failed to switch to Recipient Endpoint Form iframe");
        }
        const rlEPFrame = rlEPWebview.locator('div#root');
        await rlEPFrame.getByRole('textbox', { name: 'Name*' }).fill(newName);
        await rlEPFrame.getByRole('textbox', { name: 'Description' }).fill('Description');
        await rlEPFrame.getByRole('textbox').first().fill('<endpoint name="test2" xmlns="http://ws.apache.org/ns/synapse"></endpoint>');
        await rlEPFrame.getByRole('button', { name: 'Save Changes' }).click();
    }
}
