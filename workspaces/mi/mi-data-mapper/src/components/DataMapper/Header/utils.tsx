/*
 * Copyright (c) 2024, WSO2 LLC. (http://www.wso2.com). All Rights Reserved.
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein is strictly forbidden, unless permitted by WSO2 in accordance with
 * the WSO2 Commercial License available at http://wso2.com/licenses.
 * For specific language governing the permissions and limitations under
 * this license, please see the license as well as any agreement you’ve
 * entered into with WSO2 governing the purchase of this software and any
 * associated services.
 */
import { CallExpression, Node, ObjectLiteralExpression, PropertyAssignment, SyntaxKind, ts } from "ts-morph";
import { CompletionItem, CompletionItemKind } from "@wso2/ui-toolkit";
import { INPUT_FIELD_FILTER_LABEL, OUTPUT_FIELD_FILTER_LABEL, SearchTerm, SearchType } from "./HeaderSearchBox";
import { View } from "../Views/DataMapperView";
import { READONLY_MAPPING_FUNCTION_NAME } from "./constants";

export function getInputOutputSearchTerms(searchTerm: string): [SearchTerm, SearchTerm] {
    const inputFilter = INPUT_FIELD_FILTER_LABEL;
    const outputFilter = OUTPUT_FIELD_FILTER_LABEL;
    const searchSegments = searchTerm.split(" ");

    const inputSearchTerm = searchSegments.find(segment => segment.startsWith(inputFilter));
    const outputSearchTerm = searchSegments.find(segment => segment.startsWith(outputFilter));

    const searchTerms = searchSegments.filter(segment =>
        !segment.startsWith(inputFilter) && !segment.startsWith(outputFilter));
    const searchTermItem: SearchTerm = {
        searchText: searchTerms.join(" "),
        searchType: undefined,
        isLabelAvailable: false
    };

    return [
        inputSearchTerm ? {
            searchText: inputSearchTerm.substring(inputFilter.length),
            searchType: SearchType.INPUT,
            isLabelAvailable: true
        } : {...searchTermItem, searchType: SearchType.INPUT},
        outputSearchTerm ? {
            searchText: outputSearchTerm.substring(outputFilter.length),
            searchType: SearchType.OUTPUT,
            isLabelAvailable: true
        } : {...searchTermItem, searchType: SearchType.OUTPUT}
    ];
}

export function isFocusedOnMapFunction(views: View[]): boolean {
    const noOfViews = views.length;
    const focusedView = views[noOfViews - 1];

    return noOfViews > 1
        && (!focusedView.subMappingInfo || !focusedView.subMappingInfo.focusedOnSubMappingRoot);
}

export function getFilterExpression(callExpr: CallExpression): Node | undefined {
    const firstArg = callExpr.getArguments()[0];
    let filterExpr: Node;

    if (firstArg && Node.isArrowFunction(firstArg)) {
        const arrowFnBody = firstArg.getBody();
        filterExpr = arrowFnBody;

        if (Node.isBlock(arrowFnBody)) {
            const returnStmt = arrowFnBody.getStatementByKind(SyntaxKind.ReturnStatement);
            filterExpr = returnStmt ? returnStmt.getExpression() : filterExpr;
        }
    }

    return filterExpr;
}

export function extractLastPartFromLabel(targetLabel: string): string | null {
    const regexPatterns = [
        /\.([^.\['"\]]+)$/, // Matches the last part after a dot
        /\["([^"]+)"\]$/,   // Matches the last part inside double quotes brackets
        /\['([^']+)'\]$/    // Matches the last part inside single quotes brackets
    ];

    for (const pattern of regexPatterns) {
        const match = targetLabel.match(pattern);
        if (match) {
            return match[1];
        }
    }

    return targetLabel;
}

export function filterCompletions(
    entry: ts.CompletionEntry,
    details: ts.CompletionEntryDetails,
    localFunctionNames: string[],
    partialText?: string
): CompletionItem {
    const isParameter = details.kind === ts.ScriptElementKind.parameterElement;
    const isMemberVariable = details.kind === ts.ScriptElementKind.memberVariableElement;
    const isFunction =  details.kind === ts.ScriptElementKind.functionElement;
    const isMethod =  details.kind === ts.ScriptElementKind.memberFunctionElement;
    const isAlias = details.kind === ts.ScriptElementKind.alias;

    let completionItem: CompletionItem | undefined = undefined;

    if (isParameter || isMemberVariable) {
        completionItem = {
            label: entry.name,
            description: details.displayParts?.reduce((acc, part) => acc + part.text, ''),
            value: entry.insertText || entry.name,
            kind: details.kind as CompletionItemKind,
            replacementSpan: entry.replacementSpan?.length
        }
    } else if (isFunction || isMethod) {
        if (isMethod || (isFunction && (details.source || details.sourceDisplay || (details.kindModifiers===ts.ScriptElementKindModifier.exportedModifier && entry.name!==READONLY_MAPPING_FUNCTION_NAME)))) {
            const params: string[] = [];
            let param: string = '';
    
            details.displayParts.forEach((part) => {
                if (part.kind === 'parameterName' || part.text === '...' || part.text === '?') {
                    param += part.text;
                } else if (param && part.text === ':') {
                    params.push(param);
                    param = '';
                }
            });
    
            const action = details.codeActions?.[0].changes[0].textChanges[0].newText || "";
            const itemTag = action.substring(0, action.length - 1);
    
            completionItem = {
                tag: itemTag,
                label: entry.name,
                description: details.documentation?.[0]?.text,
                value: action + entry.name + '()',
                kind: details.kind as CompletionItemKind,
                cursorOffset: (action + entry.name).length + (params.filter(param => !param.includes('?')).length ? 1 : 2)
            }
        } else if (localFunctionNames.includes(entry.name)) {
            completionItem = {
                label: entry.name,
                description: details.displayParts?.reduce((acc, part) => acc + part.text, ''),
                value: entry.name,
                kind: details.kind as CompletionItemKind,
            }
        }
    }

    if(partialText && completionItem) {
        if (!completionItem.label.toLocaleLowerCase().startsWith(partialText.toLocaleLowerCase()) || completionItem.label === partialText) {
            return undefined;
         }
    }

    return completionItem;
}

// Function to get the innermost property assignment node from the given property assignment node
// which allways contains a single property assignment inside the initializer
export function getInnermostPropAsmtNode(propertyAssignment: PropertyAssignment): PropertyAssignment {
    let currentNode: PropertyAssignment = propertyAssignment;

    while (Node.isObjectLiteralExpression(currentNode.getInitializer())) {
        const initializer = currentNode.getInitializer() as ObjectLiteralExpression;
        const properties = initializer.getProperties();

        if (properties.length === 1 && Node.isPropertyAssignment(properties[0])) {
            currentNode = properties[0] as PropertyAssignment;
        } else {
            break;
        }
    }

    return currentNode as PropertyAssignment;
}

export function shouldCompletionsAppear(
    value: string,
    cursorPosition: number,
    partialText: string,
): boolean {

    if (!value) return true;

    const termBeforeCursor = value.substring(0, cursorPosition).trim();
    const lastChar = termBeforeCursor[termBeforeCursor.length - 1];

    if (!partialText && lastChar != '.') return false;
    if (!isNaN(Number(partialText)) || [')', ']', '}', '"', "'", '`'].includes(lastChar)) return false;

    return true;
}
