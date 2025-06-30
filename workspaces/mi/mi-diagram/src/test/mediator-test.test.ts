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

import path from "path";
import { LanguageClient } from "./lang-service/client";
import { getMediatorDescription, readXMLFile } from "./utils/test-utils";

const dataRoot = path.join(__dirname, "data");

export interface MediatorTestCase {
    type: string;
    expectedDescription?: string;
    expectedDefaultDescription: string | undefined;
}

export const mediatorTestCases: MediatorTestCase[] = [
    {
        type: "Filter",
        expectedDescription: "Filter Description",
        expectedDefaultDescription: "expr matches regex"
    },
    {
        type: "Switch",
        expectedDescription: "Switch Description",
        expectedDefaultDescription: "Source XPath"
    },
    {
        type: "Scatter Gather",
        expectedDescription: "Scatter Gather Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Clone",
        expectedDescription: "Clone Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Iterate",
        expectedDescription: "Iterate Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "ForEach",
        expectedDescription: "For Each Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Aggregate",
        // TODO: Fix the expected description
        // expectedDescription: 'Aggregate Description',
        expectedDefaultDescription: undefined
    },
    {
        type: "Validate",
        expectedDescription: "Validate Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Enrich",
        expectedDescription: "Enrich Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Header",
        expectedDescription: "Header Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "XSLT",
        expectedDescription: "XSLT Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "JSON Transform",
        expectedDescription: "JSON Transform Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Fault",
        expectedDescription: "Fault Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Payload Factory",
        expectedDescription: "Payload Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Data Mapper",
        expectedDescription: "Data Mapper Description",
        expectedDefaultDescription: "DM"
    },
    {
        type: "Script",
        expectedDescription: "Script Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Class",
        expectedDescription: "Class Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Call Endpoint",
        expectedDescription: "Call Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Property",
        expectedDescription: "Property Description",
        expectedDefaultDescription: "Property Name"
    },
    {
        type: "Log",
        expectedDescription: "Log Description",
        expectedDefaultDescription: "Prop Name"
    },
    {
        type: "Respond",
        expectedDescription: "Respond Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Sequence",
        expectedDescription: "Call Sequence Description",
        expectedDefaultDescription: "defseq"
    },
    {
        type: "Call Template",
        expectedDescription: "CallTemplate Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Drop",
        expectedDescription: "Drop Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Property Group",
        expectedDescription: "Property Group Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Cache",
        expectedDescription: "Cache Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Throttle",
        expectedDescription: "Throttle Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Store",
        expectedDescription: "Store Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "OAuth",
        expectedDescription: "OAuth Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Entitlement Service",
        expectedDescription: "Entitlement Service Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "NTLM",
        expectedDescription: "NTLM Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Call Dataservice",
        expectedDescription: "Call Dataservice Description",
        expectedDefaultDescription: "sdfa"
    },
    {
        type: "DB Lookup",
        expectedDescription: "DB Lookup Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "DB Report",
        expectedDescription: "DB Report Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Callout",
        expectedDescription: "Callout Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Smooks",
        expectedDescription: "Smooks Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Transaction",
        expectedDescription: "Transaction Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Builder",
        expectedDescription: "Builder Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Rule",
        expectedDescription: "Rule Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Loopback",
        expectedDescription: "Loopback Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Publish Event",
        expectedDescription: "Publish Event Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "FastXSLT",
        expectedDescription: "Fast XSLT Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Rewrite",
        expectedDescription: "Rewrite Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "XQuery",
        expectedDescription: "XQuery Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Event",
        expectedDescription: "Event Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Bean",
        expectedDescription: "Bean Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Command",
        expectedDescription: "Command Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Ejb",
        expectedDescription: "EJB Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Spring",
        expectedDescription: "Spring Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Conditional Router",
        expectedDescription: "Conditional Router Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Bam",
        expectedDescription: "BAM Description",
        expectedDefaultDescription: undefined
    },
    {
        type: "Variable",
        expectedDescription: "Variable Description",
        expectedDefaultDescription: "username"
    },
    {
        type: "ThrowError",
        expectedDescription: "Throw Error Description",
        expectedDefaultDescription: undefined
    }
    // Add more test cases as needed
];

describe('Test MI Mediators', () => {
    let langClient: LanguageClient;

    beforeAll(async () => {
        const client = new LanguageClient();
        await client.start();
        langClient = client;
    }, 100000);

    afterAll(async () => {
        await langClient.stop();
    });

    mediatorTestCases.forEach(({ type, expectedDescription, expectedDefaultDescription }) => {
        const fileName = type.replace(/ /g, '');

        test(`Test ${type} Mediator Default Description`, async () => {
            const uri = path.join(dataRoot, "input-xml", `${fileName}.xml`);
            const syntaxTree = await langClient.getSyntaxTree({
                documentIdentifier: {
                    uri
                }
            });
            if (!syntaxTree) {
                throw new Error("Syntax tree is undefined");
            }
            const res = await getMediatorDescription(type, syntaxTree);
            expect(res).toEqual(expectedDefaultDescription);
        }, 20000);

        if (expectedDescription) {
            test(`Test ${type} Mediator Description`, async () => {
                const uri = path.join(dataRoot, "input-xml", `${fileName}WithDescription.xml`);
                const syntaxTree = await langClient.getSyntaxTree({
                    documentIdentifier: {
                        uri
                    }
                });
                if (!syntaxTree) {
                    throw new Error("Syntax tree is undefined");
                }
                const res = await getMediatorDescription(type, syntaxTree);
                expect(res).toEqual(expectedDescription);
            }, 20000);
        }
    });
});
