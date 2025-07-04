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
import { Form, ParamManagerValues } from "../Form";
import { page } from "../../Utils";

export class MessageProcessor {

    constructor(private _page: Page) {
    }

    public async init() {
        const addArtifactPage = new AddArtifact(this._page);
        await addArtifactPage.init();
        await addArtifactPage.add('Message Processor');
    }

    public async createMessageProcessorFromProjectExplorer(mpName: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(['Project testProject', 'Message Processors'], true);
        await this._page.getByLabel('Add Message Processor').click();
        const mpWebView = await switchToIFrame('Message Processor Form', this._page);
        if (!mpWebView) {
            throw new Error("Failed to switch to Message Processor Form iframe");
        }
        await mpWebView.getByText('Custom Message Processor', { exact: true }).click();

        const messageProcessorForm = new Form(page.page, 'Message Processor Form');
        await messageProcessorForm.switchToFormView();
        await messageProcessorForm.fill({
            values: {
                'Message Processor Name*': {
                    type: 'input',
                    value: mpName,
                },
                'Message Store': {
                    type: 'combo',
                    value: 'TestMessageStore',
                    additionalProps: { hasMultipleValue: true }
                },
                'Message Processor Provider Class FQN*': {
                    type: 'input',
                    value: 'ProviderClass',
                }
            }
        });
        await messageProcessorForm.submit();

        const overview = await switchToIFrame('Project Overview', this._page);
        if (!overview) {
            throw new Error("Failed to switch to project overview iframe");
        }
    }

    public async createMessageSamplingProcessor(mpName: string) {
        await this.init();
        const mpWebView = await switchToIFrame('Message Processor Form', this._page);
        if (!mpWebView) {
            throw new Error("Failed to switch to Message Processor Form iframe");
        }
        await mpWebView.getByText('Message Sampling Processor').click();

        const messageProcessorForm = new Form(page.page, 'Message Processor Form');
        await messageProcessorForm.switchToFormView();
        await messageProcessorForm.fill({
            values: {
                'Message Processor Name*': {
                    type: 'input',
                    value: mpName,
                },
                'Message Store': {
                    type: 'combo',
                    value: 'TestMessageStore',
                    additionalProps: { hasMultipleValue: true }
                },
                'Quartz configuration file path': {
                    type: 'input',
                    value: 'temp/test-file.txt',
                },
                'Cron Expression': {
                    type: 'input',
                    value: '0 0 * * FRI',
                },
                'Sequence Name': {
                    type: 'combo',
                    value: 'TestNewSequence',
                    additionalProps: { hasMultipleValue: true }
                },
                'Sampling Interval (Millis)': {
                    type: 'input',
                    value: '100',
                },
                'Sampling Concurrency': {
                    type: 'input',
                    value: '10',
                },
                'Yes': {
                    type: 'radio',
                    value: 'checked',
                }
            }
        });
        const paramValues: ParamManagerValues = {
            "param1": "value1",
            "param2": "value2",
            "param3": "value3"
        };
        await messageProcessorForm.fillParamManager(paramValues);
        await messageProcessorForm.submit();
        const overview = await switchToIFrame('Project Overview', this._page);
        if (!overview) {
            throw new Error("Failed to switch to project overview iframe");
        }
    }

    public async editMessageSamplingProcessor(mpName: string, mpUpdatedName: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(["Project testProject", 'Other Artifacts', 'Message Processors', mpName], true);

        const mpWebView = await switchToIFrame('Message Processor Form', this._page);
        if (!mpWebView) {
            throw new Error("Failed to switch to Message Processor Form iframe");
        }

        const messageProcessorForm = new Form(page.page, 'Message Processor Form');
        await messageProcessorForm.switchToFormView();
        await messageProcessorForm.fill({
            values: {
                'Message Processor Name*': {
                    type: 'input',
                    value: mpUpdatedName,
                },
                'Message Store': {
                    type: 'combo',
                    value: 'TestMessageStore',
                    additionalProps: { hasMultipleValue: true }
                },
                'Quartz configuration file path': {
                    type: 'input',
                    value: 'temp/test-file-edited.txt',
                },
                'Cron Expression': {
                    type: 'input',
                    value: '0 0 0 * FRI',
                },
                'Sequence Name': {
                    type: 'combo',
                    value: 'TestNewSequence',
                    additionalProps: { hasMultipleValue: true }
                },
                'Sampling Interval (Millis)': {
                    type: 'input',
                    value: '1000',
                },
                'Sampling Concurrency': {
                    type: 'input',
                    value: '100',
                },
                'No': {
                    type: 'radio',
                    value: 'checked',
                }
            }
        });
        await messageProcessorForm.submit("Save Changes");
        const overview = await switchToIFrame('Project Overview', this._page);
        if (!overview) {
            throw new Error("Failed to switch to project overview iframe");
        }
    }

    public async createScheduledMessageForwardingProcessor(mpName: string) {
        await this.init();
        const mpWebView = await switchToIFrame('Message Processor Form', this._page);
        if (!mpWebView) {
            throw new Error("Failed to switch to Message Processor Form iframe");
        }
        await mpWebView.getByText('Scheduled Message Forwarding Processor').click();

        const messageProcessorForm = new Form(page.page, 'Message Processor Form');
        await messageProcessorForm.switchToFormView();
        await messageProcessorForm.fill({
            values: {
                'Message Processor Name*': {
                    type: 'input',
                    value: mpName,
                },
                'Message Store': {
                    type: 'combo',
                    value: 'TestMessageStore',
                    additionalProps: { nthValue: 0, hasMultipleValue: true }
                },
                'Deactivate': {
                    type: 'radio',
                    value: 'checked',
                },
                'Quartz configuration file path': {
                    type: 'input',
                    value: 'temp/test-file.txt',
                },
                'Cron Expression': {
                    type: 'input',
                    value: '0 0 * * FRI',
                },
                'Forwarding Interval (Millis)': {
                    type: 'input',
                    value: '100',
                },
                'Retry Interval (Millis)': {
                    type: 'input',
                    value: '100',
                },
                'Maximum redelivery attempts': {
                    type: 'input',
                    value: '100',
                },
                'Maximum store connection attempts': {
                    type: 'input',
                    value: '100',
                },
                'Store connection attempt interval (Millis)': {
                    type: 'input',
                    value: '100',
                },
                'Disabled': {
                    type: 'radio',
                    value: 'checked',
                },
                'Fault Sequence Name': {
                    type: 'combo',
                    value: 'TestNewSequence',
                    additionalProps: { hasMultipleValue: true }
                },
                'Deactivate Sequence Name': {
                    type: 'combo',
                    value: 'TestNewSequence',
                    additionalProps: { hasMultipleValue: true }
                },
                'Task Count (Cluster Mode)': {
                    type: 'input',
                    value: '100',
                },
                'Non retry http status codes': {
                    type: 'input',
                    value: '404',
                },
                'Axis2 Client Repository': {
                    type: 'input',
                    value: 'axis2Repo',
                },
                'Axis2 Configuration': {
                    type: 'input',
                    value: 'axis2Config',
                },
                'Endpoint Name': {
                    type: 'combo',
                    value: 'newHttpEP',
                    additionalProps: { hasMultipleValue: true }
                },
                'Reply Sequence Name': {
                    type: 'combo',
                    value: 'TestNewSequence',
                    additionalProps: { hasMultipleValue: true }
                },
                'Fail Message Store': {
                    type: 'combo',
                    value: 'TestMessageStore',
                    additionalProps: { hasMultipleValue: true }
                },
                'Yes': {
                    type: 'radio',
                    value: 'checked',
                }
            }
        });
        const paramValues: ParamManagerValues = {
            "param1": "value1",
            "param2": "value2",
            "param3": "value3"
        };
        await messageProcessorForm.fillParamManager(paramValues);
        await messageProcessorForm.submit();
        const overview = await switchToIFrame('Project Overview', this._page);
        if (!overview) {
            throw new Error("Failed to switch to project overview iframe");
        }
    }

    public async editScheduledMessageForwardingProcessor(mpName: string, mpUpdatedName: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(["Project testProject", 'Other Artifacts', 'Message Processors', mpName], true);

        const mpWebView = await switchToIFrame('Message Processor Form', this._page);
        if (!mpWebView) {
            throw new Error("Failed to switch to Message Processor Form iframe");
        }

        const messageProcessorForm = new Form(page.page, 'Message Processor Form');
        await messageProcessorForm.switchToFormView();
        await messageProcessorForm.fill({
            values: {
                'Message Processor Name*': {
                    type: 'input',
                    value: mpUpdatedName,
                },
                'Message Store': {
                    type: 'combo',
                    value: 'TestMessageStore',
                    additionalProps: { nthValue: 0, hasMultipleValue: true }
                },
                'Deactivate': {
                    type: 'radio',
                    value: 'checked',
                },
                'Quartz configuration file path': {
                    type: 'input',
                    value: 'temp/test-file-edited.txt',
                },
                'Cron Expression': {
                    type: 'input',
                    value: '0 0 0 * FRI',
                },
                'Forwarding Interval (Millis)': {
                    type: 'input',
                    value: '1000',
                },
                'Retry Interval (Millis)': {
                    type: 'input',
                    value: '1000',
                },
                'Maximum redelivery attempts': {
                    type: 'input',
                    value: '10',
                },
                'Maximum store connection attempts': {
                    type: 'input',
                    value: '10',
                },
                'Store connection attempt interval (Millis)': {
                    type: 'input',
                    value: '1000',
                },
                'Disabled': {
                    type: 'radio',
                    value: 'checked',
                },
                'Fault Sequence Name': {
                    type: 'combo',
                    value: 'TestNewSequence',
                    additionalProps: { hasMultipleValue: true }
                },
                'Deactivate Sequence Name': {
                    type: 'combo',
                    value: 'TestNewSequence',
                    additionalProps: { hasMultipleValue: true }
                },
                'Task Count (Cluster Mode)': {
                    type: 'input',
                    value: '10',
                },
                'Non retry http status codes': {
                    type: 'input',
                    value: '405',
                },
                'Axis2 Client Repository': {
                    type: 'input',
                    value: 'axis2RepoEdited',
                },
                'Axis2 Configuration': {
                    type: 'input',
                    value: 'axis2ConfigEdited',
                },
                'Endpoint Name': {
                    type: 'combo',
                    value: 'newHttpEP',
                    additionalProps: { hasMultipleValue: true }
                },
                'Reply Sequence Name': {
                    type: 'combo',
                    value: 'TestNewSequence',
                    additionalProps: { hasMultipleValue: true }
                },
                'Fail Message Store': {
                    type: 'combo',
                    value: 'TestMessageStore',
                    additionalProps: { hasMultipleValue: true }
                },
                'No': {
                    type: 'radio',
                    value: 'checked',
                }
            }
        });
        await messageProcessorForm.submit("Save Changes");
        const overview = await switchToIFrame('Project Overview', this._page);
        if (!overview) {
            throw new Error("Failed to switch to project overview iframe");
        }
    }

    public async createScheduledFailoverMessageForwardingProcessor(mpName: string) {
        await this.init();
        const mpWebView = await switchToIFrame('Message Processor Form', this._page);
        if (!mpWebView) {
            throw new Error("Failed to switch to Message Processor Form iframe");
        }
        await mpWebView.getByText('Scheduled Failover Message Forwarding Processor').click();

        const messageProcessorForm = new Form(page.page, 'Message Processor Form');
        await messageProcessorForm.switchToFormView();
        await messageProcessorForm.fill({
            values: {
                'Message Processor Name*': {
                    type: 'input',
                    value: mpName,
                },
                'Source Message Store': {
                    type: 'combo',
                    value: 'TestMessageStore',
                    additionalProps: { hasMultipleValue: true }
                },
                'Target Message Store': {
                    type: 'combo',
                    value: 'TestMessageStore',
                },
                'Deactivate': {
                    type: 'radio',
                    value: 'checked',
                },
                'Quartz configuration file path': {
                    type: 'input',
                    value: 'temp/test-file.txt',
                },
                'Cron Expression': {
                    type: 'input',
                    value: '0 0 * * FRI',
                },
                'Forwarding Interval (Millis)': {
                    type: 'input',
                    value: '100',
                },
                'Retry Interval (Millis)': {
                    type: 'input',
                    value: '100',
                },
                'Maximum redelivery attempts': {
                    type: 'input',
                    value: '100',
                },
                'Maximum store connection attempts': {
                    type: 'input',
                    value: '100',
                },
                'Store connection attempt interval (Millis)': {
                    type: 'input',
                    value: '100',
                },
                'Disabled': {
                    type: 'radio',
                    value: 'checked',
                },
                'Fault Sequence Name': {
                    type: 'combo',
                    value: 'TestNewSequence',
                    additionalProps: { hasMultipleValue: true }
                },
                'Deactivate Sequence Name': {
                    type: 'combo',
                    value: 'TestNewSequence',
                    additionalProps: { hasMultipleValue: true }
                },
                'Task Count (Cluster Mode)': {
                    type: 'input',
                    value: '100',
                },
                'Yes': {
                    type: 'radio',
                    value: 'checked',
                }
            }
        });
        const paramValues: ParamManagerValues = {
            "param1": "value1",
            "param2": "value2",
            "param3": "value3"
        };
        await messageProcessorForm.fillParamManager(paramValues);
        await messageProcessorForm.submit();
        const overview = await switchToIFrame('Project Overview', this._page);
        if (!overview) {
            throw new Error("Failed to switch to project overview iframe");
        }
    }

    public async editScheduledFailoverMessageForwardingProcessor(mpName: string, mpUpdatedName: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(["Project testProject", 'Other Artifacts', 'Message Processors', mpName], true);

        const mpWebView = await switchToIFrame('Message Processor Form', this._page);
        if (!mpWebView) {
            throw new Error("Failed to switch to Message Processor Form iframe");
        }

        const messageProcessorForm = new Form(page.page, 'Message Processor Form');
        await messageProcessorForm.switchToFormView();
        await messageProcessorForm.fill({
            values: {
                'Message Processor Name*': {
                    type: 'input',
                    value: mpUpdatedName,
                },
                'Source Message Store': {
                    type: 'combo',
                    value: 'TestMessageStore',
                    additionalProps: { hasMultipleValue: true }
                },
                'Target Message Store': {
                    type: 'combo',
                    value: 'TestMessageStore',
                },
                'Deactivate': {
                    type: 'radio',
                    value: 'checked',
                },
                'Quartz configuration file path': {
                    type: 'input',
                    value: 'temp/test-file-edited.txt',
                },
                'Cron Expression': {
                    type: 'input',
                    value: '0 0 0 * FRI',
                },
                'Forwarding Interval (Millis)': {
                    type: 'input',
                    value: '1000',
                },
                'Retry Interval (Millis)': {
                    type: 'input',
                    value: '1000',
                },
                'Maximum redelivery attempts': {
                    type: 'input',
                    value: '10',
                },
                'Maximum store connection attempts': {
                    type: 'input',
                    value: '10',
                },
                'Store connection attempt interval (Millis)': {
                    type: 'input',
                    value: '1000',
                },
                'Disabled': {
                    type: 'radio',
                    value: 'checked',
                },
                'Fault Sequence Name': {
                    type: 'combo',
                    value: 'TestNewSequence',
                    additionalProps: { hasMultipleValue: true }
                },
                'Deactivate Sequence Name': {
                    type: 'combo',
                    value: 'TestNewSequence',
                    additionalProps: { hasMultipleValue: true }
                },
                'Task Count (Cluster Mode)': {
                    type: 'input',
                    value: '10',
                },
                'Yes': {
                    type: 'radio',
                    value: 'checked',
                }
            }
        });
        await messageProcessorForm.submit("Save Changes");
        const overview = await switchToIFrame('Project Overview', this._page);
        if (!overview) {
            throw new Error("Failed to switch to project overview iframe");
        }
    }

    public async createCustomMessageProcessor(mpName: string) {
        await this.init();
        const mpWebView = await switchToIFrame('Message Processor Form', this._page);
        if (!mpWebView) {
            throw new Error("Failed to switch to Message Processor Form iframe");
        }
        await mpWebView.getByText('Custom Message Processor', { exact: true }).click();

        const messageProcessorForm = new Form(page.page, 'Message Processor Form');
        await messageProcessorForm.switchToFormView();
        await messageProcessorForm.fill({
            values: {
                'Message Processor Name*': {
                    type: 'input',
                    value: mpName,
                },
                'Message Store': {
                    type: 'combo',
                    value: 'TestMessageStore',
                    additionalProps: { hasMultipleValue: true }
                },
                'Message Processor Provider Class FQN*': {
                    type: 'input',
                    value: 'ProviderClass',
                }
            }
        });
        const paramValues: ParamManagerValues = {
            "param1": "value1",
            "param2": "value2",
            "param3": "value3"
        };
        await messageProcessorForm.fillParamManager(paramValues);
        await messageProcessorForm.submit();
        const overview = await switchToIFrame('Project Overview', this._page);
        if (!overview) {
            throw new Error("Failed to switch to project overview iframe");
        }
    }

    public async editCustomMessageProcessor(mpName: string, mpUpdatedName: string) {
        const projectExplorer = new ProjectExplorer(this._page);
        await projectExplorer.goToOverview("testProject");
        await projectExplorer.findItem(["Project testProject", 'Other Artifacts', 'Message Processors', mpName], true);

        const mpWebView = await switchToIFrame('Message Processor Form', this._page);
        if (!mpWebView) {
            throw new Error("Failed to switch to Message Processor Form iframe");
        }

        const messageProcessorForm = new Form(page.page, 'Message Processor Form');
        await messageProcessorForm.switchToFormView();
        await messageProcessorForm.fill({
            values: {
                'Message Processor Name*': {
                    type: 'input',
                    value: mpUpdatedName,
                },
                'Message Store': {
                    type: 'combo',
                    value: 'TestMessageStore',
                    additionalProps: { hasMultipleValue: true }
                },
                'Message Processor Provider Class FQN*': {
                    type: 'input',
                    value: 'ProviderClassEdited',
                }
            }
        });
        const paramValues: ParamManagerValues = {
            "param4": "value1",
            "param5": "value2",
            "param6": "value3"
        };
        await messageProcessorForm.fillParamManager(paramValues);
        await messageProcessorForm.submit("Save Changes");
        const overview = await switchToIFrame('Project Overview', this._page);
        if (!overview) {
            throw new Error("Failed to switch to project overview iframe");
        }
    }
}
