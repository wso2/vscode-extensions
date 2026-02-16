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

import { test } from '@playwright/test';
import { initTest, page, toggleNotifications } from '../Utils';
import { Automation } from '../components/ArtifactTest/Automation';
import { Endpoint } from '../components/ArtifactTest/Endpoint';
import { Sequence } from '../components/ArtifactTest/Sequence';
import { ClassMediator } from '../components/ArtifactTest/ClassMediator';
import { BallerinaModule } from '../components/ArtifactTest/BallerinaModule';
import { Resource } from '../components/ArtifactTest/Resource';
import { MessageStore } from '../components/ArtifactTest/MessageStore';
import { MessageProcessor } from '../components/ArtifactTest/MessageProcessor';
import { LocalEntry } from '../components/ArtifactTest/LocalEntry';
import { Template } from '../components/ArtifactTest/Template';
import { Proxy } from '../components/ArtifactTest/Proxy';
import { DataSource } from '../components/ArtifactTest/DataSource';
import { DataService } from '../components/ArtifactTest/DataService';
import { API } from '../components/ArtifactTest/APITests';
import { EventIntegration } from '../components/ArtifactTest/EventIntegration';
import { ImportArtifact } from '../components/ImportArtifact';
import path from 'path';
import { ProjectExplorer } from '../components/ProjectExplorer';
const filePath = path.join(__dirname, '..', 'components', 'ArtifactTest', 'data', 'importApi_v1.0.0.xml');

export default function createTests() {
  test.describe('Artifact Tests', {
    tag: '@group1',
  }, async () => {
    initTest(false, false, false, undefined, undefined, 'group1');

    let currentTaskName: string = "TestTask";
    let automation: Automation;
    let apiName: string;
    test('Automation tests', async ({ }, testInfo) => {
      const testAttempt = testInfo.retry + 1;
      await test.step('Add Automation', async () => {
        console.log('Creating new Automation');
        currentTaskName = "TestTask" + testAttempt;
        automation = new Automation(page.page);
        await automation.init();
        await automation.add("TestTask" + testAttempt);
      });
      await test.step('Edit Automation', async () => {
        console.log('Editing Automation');
        await automation.edit("NewTestTask" + testAttempt);
      });
      await test.step('Create External Trigger', async () => {
        console.log('Creating new External Trigger');
        const sequenceName = `SEQUENCE TestTask${testAttempt}Sequence`;
        await automation.createExternalTrigger("TestExternalTrigger" + testAttempt, sequenceName);
      });
      await test.step('Open Diagram View for Automation', async () => {
        console.log('Opening Diagram View for Automation');
        await automation.openDiagramView("NewTestTask" + testAttempt);
        // Collapese Automations section
        const projectExplorer = new ProjectExplorer(page.page);
        await projectExplorer.findItem(['Project testProject', 'Automations']);
      });
    });

    test('API tests', async () => {
      console.log('Creating new API tests');
      const testAttempt = test.info().retry + 1;
      let api: API;
      await test.step('Create API', async () => {
        console.log('Creating new API');
        api = new API(page.page);
        await api.init();
        apiName = "TestAPI" + testAttempt;
        await api.addAPI(apiName, "/testAdd" + testAttempt);
      });
      await test.step('Edit API', async () => {
        console.log('Editing API');
        apiName = "NewTestAPI" + testAttempt;
        await api.editAPI(apiName, "/newtest" + testAttempt);
      });

      await test.step('Add Resource', async () => {
        console.log('Adding new Resource');
        await api.addResource("/testResource" + testAttempt);
      });
      await test.step('Edit Resource', async () => {
        console.log('Editing Resource');
        await api.editResource();
      });
      await test.step('Go to swagger view', async () => {
        console.log('Navigating to swagger view');
        const testAttempt = test.info().retry + 1;
        await api.goToSwaggerView(testAttempt);
      });
      await test.step('Delete Resource', async () => {
        console.log('Deleting Resource');
        await api.deleteResource();
      });
      await test.step('Delete API', async () => {
        console.log('Deleting API');
        await api.deleteAPI();
      });

      await test.step('Create WSDL from file', async () => {
        console.log('Creating new API from WSDL file');
        await api.createWSDLFromFile("NewFileWSDLAPI" + testAttempt, "/wsdlAPIFile" + testAttempt);
      });
      await test.step('Create WSDL from URL', async () => {
        console.log('Creating new API from WSDL URL');
        await api.createWSDLFromSidePanel("NewUrlWSDLAPI" + testAttempt, "/wsdlAPI" + testAttempt);
      });
      await test.step('Create Open API from OpenAPI file', async () => {
        console.log('Creating new API from OpenAPI file');
        await api.createOpenApi("NewOpenAPI" + testAttempt, "/openAPI" + testAttempt);
      });
      await test.step('Open Diagram View for API', async () => {
        console.log('Opening Diagram View for API');
        await api.openDiagramView("NewOpenAPI" + testAttempt + ":v1.0.27-SNAPSHOT", "/pet/findByStatus");

        await page.page.waitForTimeout(2000);
        await page.executePaletteCommand('View: Close All Editors');
        console.log("Closed editor groups");
        console.log('Opening Diagram View for API again without existing webview');
        await api.openDiagramView("NewOpenAPI" + testAttempt + ":v1.0.27-SNAPSHOT", "/pet/findByStatus");

        // Collapse APIs section
        const projectExplorer = new ProjectExplorer(page.page);
        await projectExplorer.findItem(['Project testProject', 'APIs', "NewOpenAPI" + testAttempt + ":v1.0.27-SNAPSHOT"], true);
        await projectExplorer.findItem(['Project testProject', 'APIs'], true);
      });
    });

    test('Endpoint tests', async () => {
      let lb: Endpoint;
      const testAttempt = test.info().retry + 1;
      await test.step('Add http Endpoint', async () => {
        console.log('Creating new http Endpoint');
        lb = new Endpoint(page.page);
        await lb.init();
        await lb.addHttpEndpoint("httpEP" + testAttempt);
      });
      await test.step('Edit http Endpoint', async () => {
        console.log('Editing http Endpoint');
        await lb.editHttpEndpoint("httpEP" + testAttempt, "newHttpEP" + testAttempt);
      });
      await test.step('Add load balance Endpoint', async () => {
        console.log('Creating new load balance Endpoint');
        await lb.addLoadBalanceEndpoint("loadBalanceEP" + testAttempt);
      });
      await test.step('Edit load balance Endpoint', async () => {
        console.log('Editing load balance Endpoint');
        await lb.editLoadBalanceEndpoint("loadBalanceEP" + testAttempt, "loadBalanceEndpoint" + testAttempt);
      });
      await test.step('Add failover Endpoint', async () => {
        console.log('Creating new failover Endpoint');
        await lb.addFailoverEndpoint("failoverEP" + testAttempt);
      });
      await test.step('Edit failover Endpoint', async () => {
        console.log('Editing failover Endpoint');
        await lb.editFailoverEndpoint("failoverEP" + testAttempt, "newFailoverEP" + testAttempt);
      });
      await test.step('Add Recipient List Endpoint', async () => {
        console.log('Creating new Recipient List Endpoint');
        await lb.addRecipientListEndpoint("recipientListEP" + testAttempt);
      });
      await test.step('Edit Recipient List Endpoint', async () => {
        console.log('Editing Recipient List Endpoint');
        await lb.editRecipientListEndpoint("recipientListEP" + testAttempt, "newRecipientListEP" + testAttempt);
        // Collapse Endpoints
        const projectExplorer = new ProjectExplorer(page.page);
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Endpoints'], true);
      });
    });

    test('Sequence Tests', async () => {
      let sequence: Sequence;
      const testAttempt = test.info().retry + 1;
      const sequenceName = "TestSequence" + testAttempt;
      await test.step('Create Sequence', async () => {
        console.log('Create Sequence');
        sequence = new Sequence(page.page);
        await sequence.init();
        await sequence.createSequence(sequenceName);
      });
      await test.step('Edit Sequence', async () => {
        console.log('Edit Sequence');
        await sequence.editSequence(sequenceName, "TestSequenceEdited" + testAttempt);
      });
      await test.step('Create Sequence from Project Explorer', async () => {
        console.log('Create Sequence from Project Explorer');
        await sequence.createSequenceFromProjectExplorer("TestNewSequence" + testAttempt, "TestSequenceEdited" + testAttempt);
      });
      await test.step('Open Diagram View for Proxy', async () => {
        console.log('Opening Diagram View for Proxy');
        await sequence.openDiagramView("TestNewSequence" + testAttempt);
        // Collapse Sequences
        const projectExplorer = new ProjectExplorer(page.page);
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Sequences'], true);
      });
    });

    test('Event Integration tests ', async () => {
      let eventIntegration: EventIntegration;
      let name: string = "HttpEventIntegration";
      await test.step('Add Event Integration', async () => {
        console.log('Creating new Event Integration');
        eventIntegration = new EventIntegration(page.page);
        await eventIntegration.init();
        await eventIntegration.add(name);
      });

      await test.step('Edit Event Integration', async () => {
        console.log('Editing Event Integration');
        await eventIntegration.edit(name);
      });

      await test.step('Open Diagram View of Event Integration', async () => {
        console.log('Opening Diagram View');
        await eventIntegration.openDiagramView(name);
        // Collapse Event integration
        const projectExplorer = new ProjectExplorer(page.page);
        await projectExplorer.findItem(['Project testProject', 'Event Integrations'], true);
      });
    });

    test('Class Mediator Tests', async () => {
      const testAttempt = test.info().retry + 1;
      const className = "SampleClass" + testAttempt;
      const classNameForExplorer = "SampleNewClass" + testAttempt;
      const classMediator = new ClassMediator(page.page);
      await classMediator.init();
      console.log('Create Class Mediator');
      await classMediator.createClassMediator(className);
      console.log('Open Class Mediator');
      await classMediator.openClassMediator(className);
      console.log('Create Class Mediator from Project Explorer');
      await classMediator.createClassMediatorFromProjectExplorer(classNameForExplorer);
      console.log('Clear Class Mediator tabs');
      await classMediator.clear([className, classNameForExplorer]);
      // Collapse Event Integrations
      console.log('Collapse Class Mediators section from Project Explorer');
      const projectExplorer = new ProjectExplorer(page.page);
      console.log('Collapsing Class Mediators section');
      await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Class Mediators'], true);
    });
    
    test('Ballerina Module Tests', async () => {
      await toggleNotifications(false);
      const testAttempt = test.info().retry + 1;
      const ballerinaModuleName = "TestBallerinaModule" + testAttempt;
      const ballerinaModule = new BallerinaModule(page.page);
      await ballerinaModule.init();
      console.log('Create Ballerina Module');
      await ballerinaModule.createBallerinaModule(ballerinaModuleName);
      console.log('Build Ballerina Module from Editor View');
      await ballerinaModule.openFromProjectExplorerAndBuild(ballerinaModuleName);
      console.log('Build Ballerina Module from Mediator Palette');
      await ballerinaModule.openFromMediatorPaletteAndBuild(ballerinaModuleName);
      console.log('Create Ballerina Module from Project Explorer');
      await ballerinaModule.createBallerinaModuleFromProjectExplorer("TestNewBallerinaModule" + testAttempt);
      console.log('Uninstall Ballerina Extension');
      await ballerinaModule.removeBallerinaExtension();
      console.log('Successfully uninstalled Ballerina Extension');
      await toggleNotifications(true);
    });

    test('Registry Resource Tests', async () => {
      const testAttempt = test.info().retry + 1;
      await test.step('Create new resource from artifacts', async () => {
        console.log('Creating new resource from artifacts');
        const resource = new Resource(page.page);
        await resource.openNewFormFromArtifacts();
        await resource.addFromTemplate({
          name: 'testResource1' + testAttempt,
          type: 'JSON File',
          registryPath: 'json',
        });
      });

      await test.step('Create new resource from side panel', async () => {
        console.log('Creating new resource from side panel');
        const resource = new Resource(page.page);
        await resource.openNewFormFromSidePanel();
        await resource.addFromTemplate({
          name: 'testResource2' + testAttempt,
          type: 'JSON File',
          registryPath: 'json/testResource' + testAttempt,
        });
      });

      await test.step('Create new resource importing a file', async () => {
        console.log('Creating new resource importing a file');
        const resource = new Resource(page.page);
        await resource.openNewFormFromArtifacts();
        const filePath = (path.join(process.cwd(), 'src', 'test', 'e2e-playwright-tests', 'data', 'new-project', 'testProjectFolder', 'testProject', 'src', 'main', 'wso2mi', 'resources', 'json', 'testResource1' + testAttempt + '.json'));
        await resource.addFromFileSystem({
          filePath: filePath.replace(/\\/g, '/'),
          registryPath: 'newJson' + testAttempt,
        })
        // Collapse Resources
        const projectExplorer = new ProjectExplorer(page.page);
        await projectExplorer.findItem(['Project testProject', 'Resources'], true);
      });
    });

    test('Message Store Tests', async () => {
      let ms: MessageStore;
      const testAttempt = test.info().retry + 1;
      await test.step('InMemory Message Store Tests', async () => {
        const msName = "TestInMemoryMessageStore" + testAttempt;
        const msUpdatedName = "TestInMemoryMessageStoreEdited" + testAttempt;
        ms = new MessageStore(page.page);
        console.log('Create InMemory Message Store');
        await ms.createInMemoryMessageStore(msName);
        console.log('Edit InMemory Message Store');
        await ms.editInMemoryMessageStore(msName, msUpdatedName);
      });
      await test.step('RabbitMQ Message Store Tests', async () => {
        const msName = "TestRabbitMQMessageStore" + testAttempt;
        const msUpdatedName = "TestRabbitMQMessageStoreEdited" + testAttempt;
        ms = new MessageStore(page.page);
        console.log('Create RabbitMQ Message Store');
        await ms.createRabbitMQMessageStore(msName);
        console.log('Edit RabbitMQ Message Store');
        await ms.editRabbitMQMessageStore(msName, msUpdatedName);
      });
      await test.step('JMS Message Store Tests', async () => {
        const msName = "TestJMSMessageStore" + testAttempt;
        const msUpdatedName = "TestJMSMessageStoreEdited" + testAttempt;
        ms = new MessageStore(page.page);
        console.log('Create JMS Message Store');
        await ms.createJMSMessageStore(msName);
        console.log('Edit JMS Message Store');
        await ms.editJMSMessageStore(msName, msUpdatedName);
      });
      await test.step('JDBC Message Store Tests', async () => {
        const msName = "TestJDBCMessageStore" + testAttempt;
        const msUpdatedName = "TestJDBCMessageStoreEdited" + testAttempt;
        ms = new MessageStore(page.page);
        console.log('Create JDBC Message Store');
        await ms.createJDBCMessageStore(msName);
        console.log('Edit JDBC Message Store');
        await ms.editJDBCMessageStore(msName, msUpdatedName);
      });
      await test.step('Custom Message Store Tests', async () => {
        const msName = "TestCustomMessageStore" + testAttempt;
        const msUpdatedName = "TestCustomMessageStoreEdited" + testAttempt;
        ms = new MessageStore(page.page);
        console.log('Create Custom Message Store');
        await ms.createCustomMessageStore(msName);
        console.log('Edit Custom Message Store');
        await ms.editCustomMessageStore(msName, msUpdatedName);
      });
      await test.step('Create Message Store from Project Explorer', async () => {
        const testAttempt = test.info().retry + 1;
        const msName = "TestMessageStore" + testAttempt;
        console.log('Create Message Store from Project Explorer');
        ms = new MessageStore(page.page);
        await ms.createMessageStoreFromProjectExplorer(msName);
        // Close Message Stores
        const projectExplorer = new ProjectExplorer(page.page);
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Message Stores'], true);
      });

    });

    test('Message Processor Tests', async () => {
      let mp: MessageProcessor;
      const testAttempt = test.info().retry + 1;
      await test.step('Message Sampling Processor Tests', async () => {
        const mpName = "TestMessageSamplingProcessor" + testAttempt;
        const mpUpdatedName = "TestMessageSamplingProcessorEdited" + testAttempt;
        mp = new MessageProcessor(page.page);
        console.log('Create Message Sampling Processor');
        await mp.createMessageSamplingProcessor(mpName);
        console.log('Edit Message Sampling Processor');
        await mp.editMessageSamplingProcessor(mpName, mpUpdatedName);
      });
      await test.step('Scheduled Message Forwarding Processor Tests', async () => {
        const mpName = "TestScheduledMessageForwardingProcessor" + testAttempt;
        const mpUpdatedName = "TestScheduledMessageForwardingProcessorEdited" + testAttempt;
        mp = new MessageProcessor(page.page);
        console.log('Create Scheduled Message Forwarding Processor');
        await mp.createScheduledMessageForwardingProcessor(mpName);
        console.log('Edit Scheduled Message Forwarding Processor');
        await mp.editScheduledMessageForwardingProcessor(mpName, mpUpdatedName);
      });
      await test.step('Scheduled Failover Message Forwarding Processor Tests', async () => {
        const mpName = "TestScheduledFailoverMessageForwardingProcessor" + testAttempt;
        const mpUpdatedName = "TestScheduledFailoverMessageForwardingProcessorEdited" + testAttempt;
        mp = new MessageProcessor(page.page);
        console.log('Create Scheduled Failover Message Forwarding Processor');
        await mp.createScheduledFailoverMessageForwardingProcessor(mpName);
        console.log('Edit Scheduled Failover Message Forwarding Processor');
        await mp.editScheduledFailoverMessageForwardingProcessor(mpName, mpUpdatedName);
      });
      await test.step('Custom Message Processor Tests', async () => {
        const mpName = "TestCustomMessageProcessor" + testAttempt;
        const mpUpdatedName = "TestCustomMessageProcessorEdited" + testAttempt;
        mp = new MessageProcessor(page.page);
        console.log('Create Custom Message Processor');
        await mp.createCustomMessageProcessor(mpName);
        console.log('Edit Custom Message Processor');
        await mp.editCustomMessageProcessor(mpName, mpUpdatedName);
      });
      await test.step('Create Message Processor from Project Explorer', async () => {
        const testAttempt = test.info().retry + 1;
        const mpName = "TestMessageProcessor" + testAttempt;
        console.log('Create Message Processor from Project Explorer');
        mp = new MessageProcessor(page.page);
        await mp.createMessageProcessorFromProjectExplorer(mpName);
        // Collapse Message Processor
        const projectExplorer = new ProjectExplorer(page.page);
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Message Processors'], true);
      });
    });

    test('Data Service Tests', async () => {
      let dataSource: DataSource;
      const testAttempt = test.info().retry + 1;
      await test.step('Add Data Source', async () => {
        console.log('Creating new Data Source');
        dataSource = new DataSource(page.page);
        await dataSource.init();
        await dataSource.add("testDataSource" + testAttempt);
      });
      await test.step('Edit Data Source', async () => {
        console.log('Editing Data Source');
        await dataSource.edit("testDataSource" + testAttempt, "newTestDataSource" + testAttempt);
      });
      await test.step('Add Data source from side panel', async () => {
        console.log('Creating new Data Source from side panel');
        await dataSource.addCustomDataSourceFromSidepanel("testDataSource" + testAttempt);
      });
      await test.step('Edit Data source from side panel', async () => {
        console.log('Editing Data Source from side panel');
        await dataSource.editCustomDataSource("testDataSource" + testAttempt, "newTestDataSource" + testAttempt);
      });

      await test.step('Add Data Service', async () => {
        console.log('Creating new Data Service');
        const dataService = new DataService(page.page);
        await dataService.init();
        await dataService.addRDBMS("testDataService" + testAttempt);
      });
      await test.step('Edit Data Service', async () => {
        console.log('Editing Data Service');
        const dataService = new DataService(page.page);
        await dataService.editRDBMS("testDataService" + testAttempt, "newTestDataService" + testAttempt);
      });
      await test.step('Add MongoDB Data Service', async () => {
        console.log('Creating new MongoDB Data Service');
        const dataService = new DataService(page.page);
        await dataService.addMongoDB("testMongoDBDataService" + testAttempt);
      });
      await test.step('Edit MongoDB Data Service', async () => {
        console.log('Editing MongoDB Data Service');
        const dataService = new DataService(page.page);
        await dataService.editMongoDB("testMongoDBDataService" + testAttempt, "newTestMongoDBDataService" + testAttempt);
      });

      await test.step('Add Cassanrda Data Service', async () => {
        console.log('Editing Cassanrda Data Service');
        const dataService = new DataService(page.page);
        await dataService.addCassandraDB("testCassandraDB" + testAttempt);
      });
      await test.step('Edit Cassandra Data Service', async () => {
        console.log('Editing Cassandra Data Service');
        const dataService = new DataService(page.page);
        await dataService.editCassandraDB("testCassandraDB" + testAttempt, "newTestCassandraDB" + testAttempt);
      });

      await test.step('Add CSV Data Service', async () => {
        console.log('Editing Cassanrda Data Service');
        const dataService = new DataService(page.page);
        await dataService.addCsvDs("testCSVDs" + testAttempt);
      });
      await test.step('Edit CSV Data Service', async () => {
        console.log('Editing CSV Data Service');
        const dataService = new DataService(page.page);
        await dataService.editCsvDs("testCSVDs" + testAttempt, "newTestCSVDs" + testAttempt);
      });

      await test.step('Add Carbon Data source', async () => {
        console.log('Adding Carbon Data Service');
        const dataService = new DataService(page.page);
        await dataService.addCarbonDs("testCarbonDs", testAttempt);
      });
      await test.step('Edit Carbon Data source', async () => {
        console.log('Editing Carbon Data Service');
        const dataService = new DataService(page.page);
        await dataService.editCarbonDs("testCarbonDs" + testAttempt, "newTestCarbonDs" + testAttempt);
        // Collapse Data Services
        const projectExplorer = new ProjectExplorer(page.page);
        await projectExplorer.findItem(['Project testProject', 'Data Services'], true);
      });
    });

    test('Local Entry tests', async () => {
      const testAttempt = test.info().retry + 1;
      let localEntry: LocalEntry;
      await test.step('Add Local Entry', async () => {
        console.log('Creating new Local Entry');
        localEntry = new LocalEntry(page.page);
        await localEntry.init();
        await localEntry.addInlineTextLocalEntry("localEntry" + testAttempt);
      });
      await test.step('Edit Local Entry', async () => {
        console.log('Editing Local Entry');
        await localEntry.editInlineTextLocalEntry("localEntry" + testAttempt, "newLocalEntry" + testAttempt);
      });
      await test.step('Add XML Local Entry', async () => {
        console.log('Creating new XML Local Entry');
        await localEntry.addXmlLocalEntry("xmlLocalEntry" + testAttempt);
      });
      await test.step('Edit XML Local Entry', async () => {
        console.log('Editing XML Local Entry');
        await localEntry.editXmlLocalEntry("xmlLocalEntry" + testAttempt, "newXmlLocalEntry" + testAttempt);
      });
      await test.step('Add Source Url Local Entry from side panel', async () => {
        console.log('Creating new Local Entry from side panel');
        await localEntry.addSourceUrlLocalEntry("sourceUrlLocalEntry" + testAttempt);
      });
      await test.step('Edit Source Url Local Entry from side panel', async () => {
        console.log('Editing Local Entry from side panel');
        await localEntry.editSourceUrlLocalEntry("sourceUrlLocalEntry" + testAttempt, "newSourceUrlLocalEntry" + testAttempt);
      });
      // Collapse Local Entries
      const projectExplorer = new ProjectExplorer(page.page);
      await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Local Entries'], true);
    });

    test('Template tests', async () => {
      const testAttempt = test.info().retry + 1;
      let template: Template;
      await test.step('Add Template', async () => {
        console.log('Creating new Template');
        template = new Template(page.page);
        await template.init();
        await template.addTemplate("tempEP" + testAttempt);
      });
      await test.step('Edit Template', async () => {
        console.log('Editing Template');
        await template.editTemplate("tempEP" + testAttempt, "newTempEP" + testAttempt);
      });
      await test.step('Add Default EP Template', async () => {
        console.log('Creating new Default EP Template');
        await template.addDefaultEPTemplate("defaultEPTemp" + testAttempt);
      });
      await test.step('Edit Default EP Template', async () => {
        console.log('Editing Default EP Template');
        await template.editDefaultEPTemplate("defaultEPTemp" + testAttempt, "newDefaultEPTemp" + testAttempt);
      });
      await test.step('Add HTTP endpoint Template', async () => {
        console.log('Creating new HTTP endpoint Template');
        await template.addHTTPEPTemplate("httpEPTemp" + testAttempt);
      });
      await test.step('Edit HTTP endpoint Template', async () => {
        console.log('Editing HTTP endpoint Template');
        await template.editHTTPEPTemplate("httpEPTemp" + testAttempt, "newHttpEPTemp" + testAttempt);
      });
      await test.step('Add WSDL endpoint Template', async () => {
        console.log('Creating new WSDL endpoint Template');
        await template.addWSDLEPTemplate("wsdlEPTemp" + testAttempt);
      });
      await test.step('Edit WSDL endpoint Template', async () => {
        console.log('Editing WSDL endpoint Template');
        await template.editWSDLEPTemplate("wsdlEPTemp" + testAttempt, "newWsdlEPTemp" + testAttempt);
      });
      await test.step('Add Sequence Template', async () => {
        console.log('Creating new Sequence Template');
        await template.addSequenceTemplate("sequenceTemp" + testAttempt);
        // Collapse sequence templates
        const projectExplorer = new ProjectExplorer(page.page);
        await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Templates'], true);
      });
      // TODO: Uncomment this when the edit sequence template issue is fixed
      // await test.step('Edit Sequence Template', async () => {
      //   console.log('Editing Sequence Template');
      //   await template.editSequenceTemplate("sequenceTemp" + testAttempt, "newSequenceTemp" + testAttempt);
      // })
    });

    test('Proxy tests', async () => {
      const testAttempt = test.info().retry + 1;
      let proxyService: Proxy;
      await test.step('Add Proxy Service', async () => {
        console.log('Creating new Proxy Service');
        proxyService = new Proxy(page.page);
        await proxyService.init();
        await proxyService.add("testProxyService" + testAttempt);
      });
      await test.step('Edit Proxy Service', async () => {
        console.log('Editing Proxy Service');
        await proxyService.edit("testProxyService" + testAttempt, "newTestProxyService" + testAttempt);
      });
      await test.step('Create Proxy Service from Project Explorer', async () => {
        console.log('Creating new Proxy Service from Project Explorer');
        await proxyService.createProxyServiceFormSidepanel("testSidePanelProxyService" + testAttempt);
      });
      await test.step('Open Diagram View of Proxy', async () => {
        console.log('Opening Diagram View of Proxy');
        await proxyService.openDiagramView("testSidePanelProxyService" + testAttempt);
      });
      // Collapse proxies
      const projectExplorer = new ProjectExplorer(page.page);
      await projectExplorer.findItem(['Project testProject', 'Other Artifacts', 'Proxy Services'], true);
    });

    test('Import Artifact', async () => {
      await test.step('Import API Artifact', async () => {
        const importArtifact = new ImportArtifact(page.page);
        await importArtifact.init();
        await importArtifact.import(filePath);
        const api = new API(page.page);
        await api.openDiagramView('importApi:v1.0.0', "/");
      });
    });
  });
}
