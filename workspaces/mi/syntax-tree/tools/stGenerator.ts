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

import path = require("path");
import { LICENSE_HEADER } from "./commons";

const fs = require('fs');

const stInterfacesTS =
    `export interface STNode {
    hasTextNode: boolean;
    selfClosed: boolean;
    range: Range;
    tag: string;
}\n`;

const visitorTS =
    `import * as Synapse from "./syntax-tree-interfaces";

    export interface Visitor {
    beginVisitSTNode?(node: Synapse.STNode): void;
    endVisitSTNode?(node: Synapse.STNode): void;`;

const stInterfacesJAVA =
    `import java.util.*;

abstract class STNode {
    int end;
    int endTagOffOffset;
    int endTagOpenOffset;
    boolean hasTextNode;
    boolean selfClosed;
    int start;
    int startTagOffOffset;
    int startTagOpenOffset;
    String tag;
}\n`;

const visitorJAVA =
    `abstract class Visitor {
    abstract void beginVisitSTNode(STNode node);
    abstract void endVisitSTNode(STNode node);`

enum Language {
    JAVA = "java",
    TS = "ts"
}

interface Elements {
    [key: string]: {
        [key: string]: AttributeType
    }
}

interface Attributes {
    [key: string]: AttributeType
}

interface AttributeType {
    type: string | Attributes | undefined | string[],
    name: string,
    isCollection: boolean
    optional: boolean
}

const reservedKeywords = ["import", "export", "class", "interface", "abstract", "void", "boolean", "int", "string", "any", "Object", "List", "Optional"];

function getElements(mapping: any): Elements {
    const interfaces: Elements = {};

    // Iterate through elementInfos in the mapping object
    for (const typeInfo of mapping.typeInfos) {
        const elementName = typeInfo.localName;
        const attributes: Attributes = {};

        // Find the corresponding typeInfo for this element
        getAttributes(typeInfo, attributes, interfaces);
        // Add the element type and its attributes to the result object

        if (typeInfo.baseTypeInfo) {
            attributes.extends = typeInfo.baseTypeInfo.substring(1);
        }

        interfaces[elementName] = attributes;
    }

    return interfaces;

    function getAttributes(typeInfo: any, attributes: { [key: string]: AttributeType }, interfaces: Elements) {
        if (typeInfo) {
            // Check if the typeInfo has propertyInfos (attributes)
            if (typeInfo.propertyInfos) {
                for (const attributeInfo of typeInfo.propertyInfos) {
                    const attributeName = attributeInfo.name;
                    const type = attributeInfo.type;
                    const typeInfo = attributeInfo.typeInfo;
                    const attributeType: AttributeType = { type: undefined, name: attributeName, isCollection: attributeInfo.collection ?? false, optional: false };

                    if (type === 'attribute') {
                        attributeType.type = typeInfo
                            ? typeInfo.localName ? typeInfo.localName : typeInfo // Use the specified data type from typeInfo
                            : 'string'; // Default to 'string' if typeInfo is not provided

                        if (attributeInfo.attributeName!.localPart) {
                            attributeType.name = attributeInfo.attributeName.localPart;
                        }

                    } else if (type === 'anyAttribute' || type === 'anyElement') {
                        attributeType.type = type;
                    } else if (type === 'elementRefs') {
                        const elementTypeInfos = attributeInfo.elementTypeInfos;
                        attributeType.type = elementTypeInfos.filter((typeInfo: any) => typeInfo.typeInfo != null).map((typeInfo: any) =>
                            typeInfo.typeInfo.replaceAll(".", "")
                        );
                    } else if (type === 'elements') {
                        attributeType.type = attributeName;

                        if (attributeInfo.elementTypeInfos) {
                            const elementAttributes: { [key: string]: AttributeType } = {};
                            for (const elementType of attributeInfo.elementTypeInfos) {
                                const elementName = elementType.elementName;
                                const elementAttributeType: AttributeType = {
                                    type: elementType.typeInfo.replaceAll(".", ""),
                                    name: reservedKeywords.includes(elementName) ? `_${elementName}` : elementName,
                                    isCollection: elementType.collection ?? false,
                                    optional: true
                                };

                                if (elementType.elementName?.localPart) {
                                    const elementName = elementType.elementName.localPart;
                                    elementAttributeType.name = reservedKeywords.includes(elementName) ? `_${elementName}` : elementName;
                                }
                                elementAttributes[elementAttributeType.name] = elementAttributeType;
                            }
                            interfaces[attributeName] = elementAttributes;
                            attributeType.isCollection = attributeInfo ?? false;
                        }

                    } else if (typeInfo) {
                        attributeType.type = typeInfo.replaceAll(".", "");
                    } else {
                        attributeType.type = 'string';
                    }

                    if (attributeType.type) attributes[attributeName] = attributeType;
                }
            } else if (typeInfo.type === 'enumInfo') {
                attributes._enum = typeInfo.values;

            }

        }
    }
}

export function generateInterfaces(language: Language) {
    const accessModifier = language === Language.JAVA ? '' : 'export';

    var PO = require('../../generated/PO').PO;

    const tsInterfaces: Elements = getElements(PO);
    const enums: Elements = Object.fromEntries(Object.entries(tsInterfaces).filter(([key, value]) => value._enum !== undefined));

    let enumStr = "";
    let stInterfacesStr = language === Language.JAVA ? stInterfacesJAVA : stInterfacesTS;
    let visitorStr = language === Language.JAVA ? visitorJAVA : visitorTS;

    // Output TypeScript interfaces
    for (const [interfaceName, attributes] of Object.entries(tsInterfaces)) {

        const capitalizedStr = interfaceName.charAt(0).toUpperCase() + interfaceName.slice(1);
        const TSInterfaceName = capitalizedStr.replaceAll(".", "");

        if (attributes._enum) {
            enumStr += `\n${accessModifier} enum ${TSInterfaceName} {\n`;
            for (const enumValue of (attributes as any)._enum) {
                enumStr += `${getIndentation(4)}${enumValue},\n`;
            }
            enumStr += `}\n`;
            continue;
        }

        if (attributes.extends) {
            stInterfacesStr += language == Language.JAVA ?
                `\nabstract class ${TSInterfaceName} extends ${attributes.extends} {\n` :
                `\n${accessModifier} interface ${TSInterfaceName} extends ${attributes.extends}, STNode {\n`;
            delete attributes.extends;
        } else {
            stInterfacesStr += language == Language.JAVA ?
                `\nabstract class ${TSInterfaceName} extends STNode {\n` :
                `\n${accessModifier} interface ${TSInterfaceName} extends STNode {\n`;
        }

        const uniqueAttributes = new Set();
        for (const [attributeName, attributeType] of Object.entries(attributes)) {
            const parsedAttribute = parseAttributeType(attributeName, attributeType, enums, "", 4, language);
            if (!uniqueAttributes.has(parsedAttribute)) {
                stInterfacesStr += parsedAttribute;
                uniqueAttributes.add(parsedAttribute);
            }
        }
        stInterfacesStr += `}\n`;

        // visitor
        visitorStr += language == Language.JAVA ?
            `\n\n${getIndentation(4)}abstract void beginVisit${TSInterfaceName}(${TSInterfaceName} node);` :
            `\n\n${getIndentation(4)}beginVisit${TSInterfaceName}?(node: Synapse.${TSInterfaceName}): void;`;
        visitorStr += language == Language.JAVA ?
            `\n${getIndentation(4)}abstract void endVisit${TSInterfaceName}(${TSInterfaceName} node);` :
            `\n${getIndentation(4)}endVisit${TSInterfaceName}?(node: Synapse.${TSInterfaceName}): void;`;
    }
    visitorStr += `\n}\n`;

    const visitorPath = path.join(__dirname, `../../generated/base-visitor.${language}`);
    const stInterfacesPath = path.join(__dirname, `../../generated/syntax-tree-interfaces.${language}`);
    fs.writeFileSync(stInterfacesPath, `${LICENSE_HEADER}${stInterfacesStr}\n${enumStr}`);
    fs.writeFileSync(visitorPath, `${LICENSE_HEADER}${visitorStr}`);
    console.log(`Generated ${visitorPath}`);
    console.log(`Generated ${stInterfacesPath}`);
}

function parseAttributeType(attributeName: string, attributeType: AttributeType, enums: Elements, str: string, indentation: number, language: Language): string {
    const indentationStr = getIndentation(indentation);

    if (Array.isArray(attributeType.type)) {
        const types = Array.from(new Set(attributeType.type)).map(type => type === 'AnyType' ? 'any' : type);
        str += language == Language.JAVA ?
            `${indentationStr}List<Object> ${attributeName};\n` :
            `${indentationStr}${attributeName}: ${types.length > 0 ? (types).join(" | ") : "any[]"};\n`;

    } else if (typeof attributeType.type === 'object') {
        // str += `${indentationStr}${attributeName}: {\n`;
        // for (const [name, type] of Object.entries(attributeType.type)) {
        //     str = parseAttributeType(name, type, enums, str, indentation + 4, language);
        // }
        // str += `${indentationStr}}${array};\n`;
        str += language == Language.JAVA ?
            `${indentationStr}Object ${attributeName};\n` :
            `${indentationStr}${attributeName}: any;\n`;
    } else if (typeof attributeType.type === 'string') {
        str += `${indentationStr}${getDataType(attributeName, attributeType, enums, language)}\n`;
    }
    return str;
}

function getDataType(attributeName: string, attributeType: AttributeType, enums: Elements, language: Language) {
    const type = attributeType.type as string;
    const name = attributeType.name;
    const array = attributeType.isCollection ? "[]" : "";
    const isOptional = attributeType.optional;
    let typeStr = "";

    // console.log(name);
    if (name.includes("_enum_")) {
        const enumName = name.split("_enum_")[1];
        const capitalizedStr = enumName.charAt(0).toUpperCase() + enumName.slice(1);

        if (enums[capitalizedStr]) {
            attributeName = attributeName.replace(`Enum${capitalizedStr}`, "");
            typeStr = capitalizedStr;
        }
    }

    if (!typeStr) {
        switch (type) {
            case type.match("^[aA]ny.*")?.input:
                typeStr = language === Language.JAVA ? 'Object' : 'any';
                break;

            case 'Boolean':
                typeStr = 'boolean';
                break;

            case 'Int':
            case 'Integer':
            case 'Long':
                typeStr = language === Language.JAVA ? 'int' : 'number';
                break;

            case 'NCName':
            case 'QName':
            case 'nyType':
            case 'string':
                typeStr = language === Language.JAVA ? 'String' : 'string';
                break;

            default:
                typeStr = type.charAt(0).toUpperCase() + type.slice(1);
        }
    }
    return language === Language.JAVA ?
        `${isOptional ? `Optional<${typeStr}>` : typeStr}${array} ${attributeName};` :
        `${attributeName}${isOptional ? "?" : ""}: ${typeStr}${array};`;
}

function getIndentation(indentation: number): string {
    let str = "";
    for (let i = 0; i < indentation; i++) {
        str += " ";
    }
    return str;
}

generateInterfaces(Language.JAVA);
generateInterfaces(Language.TS);