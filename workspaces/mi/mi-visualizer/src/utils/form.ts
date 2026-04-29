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
import { APIResource, Range, NamedSequence, Proxy, TagRange } from "@wso2/mi-syntax-tree/lib/src";
import { RpcClient } from "@wso2/mi-rpc-client";
import { EditSequenceFields } from "../views/Forms/EditForms/EditSequenceForm";
import { ARTIFACT_TEMPLATES } from "../constants";
import { getXML } from "./template-engine/mustache-templates/templateUtils";
import { EditProxyForm } from "../views/Forms/EditForms/EditProxyForm";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { Method, Protocol, ResourceFormData, ResourceType } from "../views/Forms/ResourceForm";

/**
 * Functions to generate data for forms
 */

export const generateResourceData = (model: APIResource): ResourceType => {
    // Extract methods and protocols
    const extractedMethods = model.methods
        .map((method) => method.toLowerCase())
        .reduce<{ [K in Method]: boolean }>((acc, method) => ({ ...acc, [method]: true }), {
            get: false,
            post: false,
            put: false,
            delete: false,
            patch: false,
            head: false,
            options: false,
        });
    const extractedProtocols = model.protocol
        ? model.protocol.reduce<{ [K in Protocol]: boolean }>((acc, protocol) => ({ ...acc, [protocol]: true }), {
              http: false,
              https: false,
          })
        : {
              http: true,
              https: true,
          };

    // Create resource data object
    const resourceData: ResourceType = {
        urlStyle: model.uriTemplate ? "uri-template" : model.urlMapping ? "url-mapping" : "none",
        uriTemplate: model.uriTemplate,
        urlMapping: model.urlMapping,
        methods: extractedMethods,
        protocol: extractedProtocols,
        inSequenceType: model.inSequenceAttribute ? "named" : "inline",
        inSequence: model.inSequenceAttribute,
        outSequenceType: model.outSequenceAttribute ? "named" : "inline",
        outSequence: model.outSequenceAttribute,
        faultSequenceType: model.faultSequenceAttribute ? "named" : "inline",
        faultSequence: model.faultSequenceAttribute,
    };

    return resourceData;
};

export const generateSequenceData = (model: NamedSequence): any => {
    const sequenceData: EditSequenceFields = {
        name: model.name,
        trace: model.trace !== "enable" ? false : true,
        statistics: model.statistics !== "enable" ? false : true,
        onError: model.onError || "",
    };

    return sequenceData;
};

export const generateProxyData = (model: Proxy): EditProxyForm => {
    const proxyData: EditProxyForm = {
        enableSec: model.enableSec,
        enableAddressing: model.enableAddressing,
        target: model.target,
        parameters: model.parameters,
        policies: model.policies,
        publishWSDL: {
            ...model.publishWSDL,
            inlineWsdl: model.publishWSDL?.inlineWsdl ? inlineFormatter(model.publishWSDL.inlineWsdl) : "<wsdl:definitions/>",
        },
        wsdlType: model.publishWSDL
            ? model.publishWSDL.endpoint
                ? "ENDPOINT"
                : model.publishWSDL.uri
                ? "SOURCE_URL"
                : model.publishWSDL.key
                ? "REGISTRY_KEY"
                : "INLINE"
            : "NONE",
        name: model.name,
        transports: model.transports,
        pinnedServers: model.pinnedServers,
        serviceGroup: model.serviceGroup,
        startOnLoad: model.startOnLoad,
        inSequenceEdited: false,
        outSequenceEdited: false,
        faultSequenceEdited: false,
        statistics: model.statistics === "enable" ? true : false,
        trace: model.trace === "enable" ? true : false,
    };

    return proxyData;
};

const inlineFormatter = (inlineWsdl: string) => {
    const options = {
        ignoreAttributes: false,
        allowBooleanAttributes: true,
        attributeNamePrefix: "",
        attributesGroupName: "@_",
        indentBy: "    ",
        format: true,
    };
    const parser = new XMLParser(options);
    const builder = new XMLBuilder(options);
    return builder.build(parser.parse(inlineWsdl)) as string;
};

/**
 * Function to handle resource create
 */

export const onResourceCreate = (data: ResourceFormData, range: Range, documentUri: string, rpcClient: RpcClient) => {
    const { uriTemplate, urlMapping, methods, protocol } = data;
    const formValues = {
        // Extract selected methods and create string containing the methods for the XML
        methods: Object.keys(methods)
            .filter((method) => methods[method as keyof typeof methods])
            .map((method) => method.toUpperCase())
            .join(" "),
        // If both http, https are selected, then undefined. Otherwise, set the selected protocol.
        protocol: Object.keys(protocol).every((key) => protocol[key as keyof typeof protocol])
            ? undefined
            : Object.keys(protocol).find((key) => protocol[key as keyof typeof protocol]),
        uri_template: uriTemplate,
        url_mapping: urlMapping,
    };

    const xml = getXML(ARTIFACT_TEMPLATES.ADD_RESOURCE, formValues);
    rpcClient.getMiDiagramRpcClient().applyEdit({
        text: xml,
        documentUri: documentUri,
        range: {
            start: {
                line: range.end.line,
                character: range.end.character,
            },
            end: {
                line: range.end.line,
                character: range.end.character,
            },
        },
    });
};

/**
 * Function to handle resource editing
 */

export const onResourceEdit = (
    data: ResourceFormData,
    resourceRange: TagRange,
    deleteRanges: Range[],
    documentUri: string,
    rpcClient: RpcClient
) => {
    const startTagRange = resourceRange.startTagRange;
    const endTagRange = resourceRange.endTagRange;
    const {
        uriTemplate,
        urlMapping,
        methods,
        protocol,
        inSequence,
        inSequenceType,
        isInSequenceDirty,
        outSequence,
        outSequenceType,
        isOutSequenceDirty,
        faultSequence,
        faultSequenceType,
        isFaultSequenceDirty,
    } = data;
    const formValues = {
        methods: Object.keys(methods)
            .filter((method) => methods[method as keyof typeof methods])
            .map((method) => method.toUpperCase())
            .join(" "),
        protocol: Object
            .keys(protocol)
            .every((key) => protocol[key as keyof typeof protocol]) ? undefined : 
            Object
            .keys(protocol)
            .find((key) => protocol[key as keyof typeof protocol]),
        uri_template: uriTemplate,
        url_mapping: urlMapping,
        in_sequence: inSequence,
        out_sequence: outSequence,
        fault_sequence: faultSequence,
        appened_in_sequence: isInSequenceDirty && inSequenceType === "inline" ? true : false,
        appened_out_sequence: isOutSequenceDirty && outSequenceType === "inline" ? true : false,
        appened_fault_sequence: isFaultSequenceDirty && faultSequenceType === "inline" ? true : false
    };

    const xml = getXML(ARTIFACT_TEMPLATES.EDIT_RESOURCE, formValues);
    const sortedRanges = deleteRanges.sort(
        (a, b) => b.start.line - a.start.line || b.start.character - a.start.character
    );
    let deleteLineCount = 0
    rpcClient
        .getMiDiagramRpcClient()
        .applyEdit({
            text: xml,
            documentUri: documentUri,
            range: startTagRange,
            addNewLine: false
        })
        .then(async () => {
            for (const range of sortedRanges) {
                deleteLineCount += range.end.line - range.start.line;
                await rpcClient.getMiDiagramRpcClient().applyEdit({
                    text: "",
                    documentUri: documentUri,
                    range: range,
                });
            }
        })
        .then(async () => {
            await rpcClient.getMiDiagramRpcClient().rangeFormat({
                uri: documentUri,
                range: {
                    start: startTagRange.start,
                    end: {
                        line: endTagRange.end.line - deleteLineCount,
                        character: endTagRange.end.character,
                    },
                }
            })
        });
};

export const onSequenceEdit = (
    data: EditSequenceFields,
    range: Range,
    documentUri: string,
    rpcClient: RpcClient,
) => {
    const formValues = {
        name: data.name,
        ...(data.trace && { trace: "enable" }),
        ...(data.statistics && { statistics: "enable" }),
        onError: data.onError,
    }
    const xml = getXML(ARTIFACT_TEMPLATES.EDIT_SEQUENCE, formValues);
    rpcClient.getMiDiagramRpcClient().applyEdit({
        text: xml,
        documentUri: documentUri,
        range: range
    });
}

export const onProxyEdit = async (
    data: EditProxyForm,
    model: Proxy,
    documentUri: string,
    rpcClient: RpcClient,
) => {
    const formValues = {
        tag : "proxy",
        name: data.name,
        enableSec: data.enableSec.selfClosed,
        enableAddressing: data.enableAddressing.selfClosed,
        target: data.target,
        parameters: data.parameters,
        policies: data.policies,
        publishWsdl: data.publishWSDL,
        wsdlEnabled: data.wsdlType !== "NONE" ? true : false,
        inSequence: data.target.inSequenceAttribute,
        outSequence: data.target.outSequenceAttribute,
        faultSequence: data.target.faultSequenceAttribute,
        endpoint: data.target.endpointAttribute,
        transports: data.transports,
        pinnedServers: data.pinnedServers,
        serviceGroup: data.serviceGroup,
        startOnLoad: data.startOnLoad,
        ...(data.trace && { trace: "enable" }),
        ...(data.statistics && { statistics: "enable" }),
    }
    const tags = ["other", "target", "proxy-to-target", "proxy"];
    const edits = [];
    for (const tag of tags) {
        formValues.tag = tag;
        const xml = tag === "proxy-to-target" ? "" : getXML(ARTIFACT_TEMPLATES.EDIT_PROXY, formValues);
        const ranges: Range = proxyRange(model, tag);
        edits.push({
            text: xml,
            documentUri: documentUri,
            range: ranges,
            disableFormatting: true
        });
    }
    edits.sort((a, b) => b.range.start.line - a.range.start.line);
    for (let i = 0; i < edits.length; i++) {
        await rpcClient.getMiDiagramRpcClient().applyEdit(edits[i]);
    }
    await rpcClient.getMiDiagramRpcClient().rangeFormat({
        uri: documentUri
    });
    const sequences = ["fault", "in"];
    let isInSequenceUpdated = false;
    for(const sequence of sequences){
        if(data[`${sequence}SequenceEdited` as keyof typeof data]) {
            if(formValues[`${sequence}Sequence` as keyof typeof formValues] !== ""){
                if (isInSequenceUpdated) {
                    await rpcClient.getMiDiagramRpcClient().rangeFormat({
                        uri: documentUri
                    });
                    const updatedST = await rpcClient.getMiDiagramRpcClient().getSyntaxTree({ documentUri: documentUri });
                    model = updatedST.syntaxTree.proxy;
                }
                if (sequence === "in") {
                    isInSequenceUpdated = true;
                }
                let range:Range = {
                    start:sequence === "in" ? model.target.inSequence.range.startTagRange.start : model.target.faultSequence.range.startTagRange.start,
                    end:sequence === "in" ? model.target.inSequence.range.endTagRange.end : model.target.faultSequence.range.startTagRange.end
                };
                await rpcClient.getMiDiagramRpcClient().applyEdit({
                    text:` `,
                    documentUri:documentUri,
                    range:range
                });
            } else {
                const range:Range = {
                    start:sequence === "in" ? model.target.range.startTagRange.end : model.target.range.endTagRange.start,
                    end:sequence === "in" ? model.target.range.startTagRange.end : model.target.range.endTagRange.start
                };
                await rpcClient.getMiDiagramRpcClient().applyEdit({
                    text:sequence === "in" ?
                        `<inSequence>
                         </inSequence>` : "<faultSequence/>",
                    documentUri:documentUri,
                    range:range
                })
            }
            await rpcClient.getMiDiagramRpcClient().rangeFormat({
                uri: documentUri
            });
        }
    }
}

const proxyRange = (model:Proxy,tag:string):Range => {
    switch (tag) {
        case "proxy":
            return {
                start: model.range.startTagRange.start,
                end: model.range.startTagRange.end,
            }
        case "target":
            return {
                start: model.target?.range?.startTagRange?.start ?? model.range.endTagRange.start,
                end: model.target?.range.startTagRange.end ?? model.range.endTagRange.start,
            }
        case "other":
            return {
                start: model.target?.range?.endTagRange?.end ?? model.range.endTagRange.start,
                end: model.range.endTagRange.start ?? model.range.endTagRange.start,
            }
        case "proxy-to-target":
            return {
                start: model.range.startTagRange.end,
                end: model.target?.range?.startTagRange?.start ?? model.range.endTagRange.start
            }
        default:
            return {
                start: model.range.startTagRange.start,
                end: model.range.startTagRange.end,
            }
    }
}

export const getResourceDeleteRanges = (model: APIResource, formData: ResourceFormData): Range[] => {
    const ranges: Range[] = [];
    if (formData.inSequenceType === "named" && model.inSequence) {
        ranges.push({
            start: model.inSequence.range.startTagRange.start,
            end: model.inSequence.spaces.endingTagSpace.trailingSpace.range.end,
        });
    }
    if (formData.outSequenceType === "named" && model.outSequence) {
        ranges.push({
            start: model.outSequence.range.startTagRange.start,
            end: model.outSequence.spaces.endingTagSpace.trailingSpace.range.end,
        });
    }
    if (formData.faultSequenceType === "named" && model.faultSequence) {
        ranges.push({
            start: model.faultSequence.range.startTagRange.start,
            end: model.faultSequence.spaces.endingTagSpace.trailingSpace.range.end,
        });
    }

    return ranges;
};
