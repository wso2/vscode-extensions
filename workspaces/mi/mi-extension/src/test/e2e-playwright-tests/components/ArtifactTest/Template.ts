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

export class Template {

    constructor(private _page: Page) {
    }

    public async init() {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");

        const overviewPage = new Overview(this._page);
        await overviewPage.init();
        await overviewPage.goToAddArtifact();

        const addArtifactPage = new AddArtifact(this._page);
        await addArtifactPage.init();
        await addArtifactPage.add('Template');
    }

    public async addTemplate(name: string) {
        const templEpWebView = await switchToIFrame('Template Form', this._page);
        if (!templEpWebView) {
            throw new Error("Failed to switch to Template Form iframe");
        }
        const templEPFrame = templEpWebView.locator('div#root');
        await templEPFrame.getByText('Address Endpoint Template').click();
        const mspWebview = await switchToIFrame('Template Form', this._page);
        if (!mspWebview) {
            throw new Error("Failed to switch to Template Form iframe");
        }
        const tmplAddEPFrame = mspWebview.locator('div#root');
        await tmplAddEPFrame.getByRole('textbox', { name: 'Template Name*' }).click();
        await tmplAddEPFrame.getByRole('textbox', { name: 'Template Name*' }).fill(name);
        await tmplAddEPFrame.getByRole('textbox', { name: 'Endpoint Name*' }).click();
        await tmplAddEPFrame.getByRole('textbox', { name: 'Endpoint Name*' }).fill('templateEp');
        await tmplAddEPFrame.getByRole('textbox', { name: 'URI*' }).click();
        await tmplAddEPFrame.getByRole('textbox', { name: 'URI*' }).fill('http://localhost:8290/endpoint');
        await tmplAddEPFrame.locator('#format div').nth(1).click();
        await tmplAddEPFrame.getByLabel('REST').click();
        await tmplAddEPFrame.locator('#traceEnabled').getByLabel('Enable').click();
        await tmplAddEPFrame.locator('#statisticsEnabled').getByLabel('Enable').click();
        await tmplAddEPFrame.getByRole('button', { name: 'Create' }).click();
        const overview = await switchToIFrame('Project Overview', this._page);
        if (!overview) {
            throw new Error("Failed to switch to Endpoint Form iframe");
        }
    }

    public async editTemplate(prevName: string, newName: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Templates', prevName], true);

        const tmplAddWebview = await switchToIFrame('Address Endpoint Form', this._page);
        if (!tmplAddWebview) {
            throw new Error("Failed to switch to Address Endpoint Form iframe");
        }
        const tmplAddEPFrame = tmplAddWebview.locator('div#root');

        await tmplAddEPFrame.getByRole('textbox', { name: 'Template Name*' }).click();
        await tmplAddEPFrame.getByRole('textbox', { name: 'Template Name*' }).fill(newName);
        await tmplAddEPFrame.getByRole('textbox', { name: 'Endpoint Name*' }).click();
        await tmplAddEPFrame.getByRole('textbox', { name: 'Endpoint Name*' }).fill('newTemplateEp');
        await tmplAddEPFrame.getByRole('textbox', { name: 'URI*' }).click();
        await tmplAddEPFrame.getByRole('textbox', { name: 'URI*' }).fill('http://localhost:8290/endpoints');
        await tmplAddEPFrame.locator('#format div').nth(1).click();
        await tmplAddEPFrame.getByLabel('SOAP 1.2').click();
        await tmplAddEPFrame.locator('#traceEnabled').getByLabel('Disable').click();
        await tmplAddEPFrame.locator('#statisticsEnabled').getByLabel('Disable').click();
        await tmplAddEPFrame.getByRole('button', { name: 'Save Changes' }).click();
        const overview = await switchToIFrame('Project Overview', this._page);
        if (!overview) {
            throw new Error("Failed to switch to Endpoint Form iframe");
        }
    }

    public async addDefaultEPTemplate(name: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        console.log("Navigated to project overview");
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Templates'], true);
        await this._page.getByLabel('Add Template').click();
        const templEpWebView = await switchToIFrame('Template Form', this._page);
        if (!templEpWebView) {
            throw new Error("Failed to switch to Template Form iframe");
        }
        const templEPFrame = templEpWebView.locator('div#root');
        await templEPFrame.getByText('Default Endpoint Template').click();
        const mspWebview = await switchToIFrame('Template Form', this._page);
        if (!mspWebview) {
            throw new Error("Failed to switch to Template Form iframe");
        }
        const form = new Form(this._page, 'Template Form');
        await form.switchToFormView();
        await form.fill({
            values: {
                'Template Name*': {
                    'type': 'input',
                    'value': name,
                },
                'Yes': {
                    type: 'radio',
                    value: 'checked',
                },
                'Endpoint Name*': {
                    'type': 'input',
                    'value': 'defaultEPTemplate',
                },
                'Format': {
                    'type': 'dropdown',
                    'value': 'POX',
                },
            }
        });
        await templEPFrame.getByText('Add Parameter').click();
        await templEPFrame.getByRole('textbox', { name: 'Parameter*' }).fill('p1');
        await templEPFrame.getByText('Save').click();
        await templEPFrame.getByText('Add Parameter').click();
        await templEPFrame.getByRole('textbox', { name: 'Parameter*' }).fill('p2');
        await templEPFrame.getByText('Save').click();
        await form.submit();
    }

    public async editDefaultEPTemplate(prevName: string, newName: string) {
        const overview = await switchToIFrame('Project Overview', this._page);
        if (!overview) {
            throw new Error("Failed to switch to Endpoint Form iframe");
        }
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Templates', prevName], true);
        const templdefWebview = await switchToIFrame('Default Endpoint Form', this._page);
        if (!templdefWebview) {
            throw new Error("Failed to switch to Default Endpoint Form iframe");
        }
        const form = new Form(this._page, 'Default Endpoint Form');
        await form.switchToFormView();
        await form.fill({
            values: {
                'Template Name*': {
                    'type': 'input',
                    'value': newName,
                },
                'No': {
                    type: 'radio',
                    value: 'checked',
                },
                'Endpoint Name*': {
                    'type': 'input',
                    'value': 'newDefaultEPTemplate',
                },
                'Format': {
                    'type': 'dropdown',
                    'value': 'GET',
                },
            }
        });
        await form.submit("Save Changes");
    }

    public async addHTTPEPTemplate(name: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        console.log("Navigated to project overview");
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Templates'], true);
        await this._page.getByLabel('Add Template').click();
        const templEpWebView = await switchToIFrame('Template Form', this._page);
        if (!templEpWebView) {
            throw new Error("Failed to switch to Template Form iframe");
        }
        const templEPFrame = templEpWebView.locator('div#root');
        await templEPFrame.getByText('HTTP Endpoint Template').click();
        const tempWebview = await switchToIFrame('Template Form', this._page);
        if (!tempWebview) {
            throw new Error("Failed to switch to Template Form iframe");
        }
        const form = new Form(this._page, 'Template Form');
        await form.switchToFormView();
        await form.fill({
            values: {
                'Template Name*': {
                    'type': 'input',
                    'value': name,
                },
                'Yes': {
                    type: 'radio',
                    value: 'checked',
                },
                'Endpoint Name*': {
                    'type': 'input',
                    'value': 'httpEPTemplate',
                },
                'URI Template*': {
                    'type': 'input',
                    'value': 'http://localhost:9090/EPTemplate',
                },
                'HTTP Method': {
                    'type': 'dropdown',
                    'value': 'PUT'
                },
            }
        });
        await templEPFrame.getByText('Add Parameter').click();
        await templEPFrame.getByRole('textbox', { name: 'Parameter*' }).fill('p1');
        await templEPFrame.getByText('Save').click();
        await templEPFrame.getByText('Add Parameter').click();
        await templEPFrame.getByRole('textbox', { name: 'Parameter*' }).fill('p2');
        await templEPFrame.getByText('Save').click();
        await form.submit();
    }

    public async editHTTPEPTemplate(prevName: string, newName: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Templates', prevName], true);
        const templdefWebview = await switchToIFrame('Http Endpoint Form', this._page);
        if (!templdefWebview) {
            throw new Error("Failed to switch to Http Endpoint Form iframe");
        }
        const form = new Form(this._page, 'Http Endpoint Form');
        await form.switchToFormView();
        await form.fill({
            values: {
                'Template Name*': {
                    'type': 'input',
                    'value': newName,
                },
                'No': {
                    type: 'radio',
                    value: 'checked',
                },
                'Endpoint Name*': {
                    'type': 'input',
                    'value': 'newHTTPEPTemplate',
                },
                'URI Template*': {
                    'type': 'input',
                    'value': 'http://localhost:9090/newEPTemplate',
                },
                'HTTP Method': {
                    'type': 'dropdown',
                    'value': 'POST'
                },
            }
        });
        await form.submit("Save Changes");
    }

    public async addWSDLEPTemplate(name: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        console.log("Navigated to project overview");
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Templates'], true);
        await this._page.getByLabel('Add Template').click();
        const templEpWebView = await switchToIFrame('Template Form', this._page);
        if (!templEpWebView) {
            throw new Error("Failed to switch to Template Form iframe");
        }
        const templEPFrame = templEpWebView.locator('div#root');
        await templEPFrame.getByText('WSDL Endpoint Template').click();
        const tempWebview = await switchToIFrame('Template Form', this._page);
        if (!tempWebview) {
            throw new Error("Failed to switch to Template Form iframe");
        }
        const form = new Form(this._page, 'Template Form');
        await form.switchToFormView();
        await form.fill({
            values: {
                'Template Name*': {
                    'type': 'input',
                    'value': name,
                },
                'Yes': {
                    type: 'radio',
                    value: 'checked',
                },
                'Endpoint Name*': {
                    'type': 'input',
                    'value': 'wsdlEPTemplate',
                },
                'WSDL URI*': {
                    'type': 'input',
                    'value': 'http://localhost:9090/EPTemplate?wsdl',
                },
                'WSDL Service*': {
                    'type': 'input',
                    'value': 'wsdlService',
                },
                'WSDL Port*': {
                    'type': 'input',
                    'value': '9090',
                },
                'Format': {
                    'type': 'dropdown',
                    'value': 'SOAP 1.2'
                },
            }
        });
        await templEPFrame.getByText('Add Parameter').click();
        await templEPFrame.getByRole('textbox', { name: 'Parameter*' }).fill('p1');
        await templEPFrame.getByText('Save').click();
        await templEPFrame.getByText('Add Parameter').click();
        await templEPFrame.getByRole('textbox', { name: 'Parameter*' }).fill('p2');
        await templEPFrame.getByText('Save').click();
        await form.submit();
    }

    public async editWSDLEPTemplate(prevName: string, newName: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Templates', prevName], true);
        const templdefWebview = await switchToIFrame('Wsdl Endpoint Form', this._page);
        if (!templdefWebview) {
            throw new Error("Failed to switch to Wsdl Endpoint Form iframe");
        }
        const form = new Form(this._page, 'Wsdl Endpoint Form');
        await form.switchToFormView();
        await form.fill({
            values: {
                'Template Name*': {
                    'type': 'input',
                    'value': newName,
                },
                'No': {
                    type: 'radio',
                    value: 'checked',
                },
                'Endpoint Name*': {
                    'type': 'input',
                    'value': 'newWSDLEPTemplate',
                },
                'WSDL URI*': {
                    'type': 'input',
                    'value': 'http://localhost:9090/newEPTemplate?wsdl',
                },
                'WSDL Service*': {
                    'type': 'input',
                    'value': 'newwsdlService',
                },
                'WSDL Port*': {
                    'type': 'input',
                    'value': '9091',
                },
                'Format': {
                    'type': 'dropdown',
                    'value': 'SOAP 1.1'
                },
            }
        });
        await form.submit("Save Changes");
    }

    public async addSequenceTemplate(name: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        console.log("Navigated to project overview");
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Templates'], true);
        await this._page.getByLabel('Add Template').click();
        const templEpWebView = await switchToIFrame('Template Form', this._page);
        if (!templEpWebView) {
            throw new Error("Failed to switch to Template Form iframe");
        }
        const templEPFrame = templEpWebView.locator('div#root');
        await templEPFrame.getByText('Sequence Template').click();
        const tempWebview = await switchToIFrame('Template Form', this._page);
        if (!tempWebview) {
            throw new Error("Failed to switch to Template Form iframe");
        }
        const tempFrame = tempWebview.locator('div#root');
        await tempFrame.getByRole('textbox', { name: 'Template Name*' }).fill(name);
        await tempFrame.getByLabel('Trace Enabled').click();
        await tempFrame.getByLabel('Statistics Enabled').click();
        await tempFrame.getByText('Add Parameter').click();
        await tempFrame.getByRole('textbox', { name: 'Parameter*' }).fill('p1');
        await tempFrame.getByLabel('Is Mandatory').click();
        await tempFrame.getByRole('textbox', { name: 'Default Value' }).fill('10');
        await tempFrame.getByText('Save').click();
        await tempFrame.getByRole('button', { name: 'Create' }).click();
    }

    public async editSequenceTemplate(prevName: string, newName: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Templates', prevName], true);
        const templWebview = await switchToIFrame('Sequence Template View', this._page);
        if (!templWebview) {
            throw new Error("Failed to switch to Sequence Template View iframe");
        }
        const templEPFrame = templWebview.locator('div#root');
        await templEPFrame.getByTestId('edit-button').getByLabel('Icon Button').click();
        await templEPFrame.getByRole('textbox', { name: 'Template Name*' }).fill(newName);
        await templEPFrame.getByLabel('Trace Enabled').click();
        await templEPFrame.getByLabel('Statistics Enabled').click();
        await templEPFrame.getByRole('button', { name: 'Save Changes' }).click();
    }
}
