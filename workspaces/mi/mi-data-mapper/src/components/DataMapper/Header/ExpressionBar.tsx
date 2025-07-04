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
/* eslint-disable react-hooks/exhaustive-deps */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Block, Node, ObjectLiteralExpression, ts } from 'ts-morph';
import { debounce } from 'lodash';

import { css } from '@emotion/css';
import { useMutation } from '@tanstack/react-query';
import { HeaderExpressionEditor, CompletionItem, HeaderExpressionEditorRef, InputProps, Button, Codicon } from '@wso2/ui-toolkit';
import { useVisualizerContext } from '@wso2/mi-rpc-client';

import { READONLY_MAPPING_FUNCTION_NAME } from './constants';
import { filterCompletions, getInnermostPropAsmtNode, shouldCompletionsAppear } from './utils';
import { View } from '../Views/DataMapperView';
import { DataMapperNodeModel } from '../../../components/Diagram/Node/commons/DataMapperNode';
import { getDefaultValue, getEditorLineAndColumn } from '../../../components/Diagram/utils/common-utils';
import { buildInputAccessExpr, createSourceForUserInput } from '../../../components/Diagram/utils/modification-utils';
import { useDMExpressionBarStore } from '../../../store/store';
import { InputOutputPortModel } from 'src/components/Diagram/Port';

const useStyles = () => ({
    exprBarContainer: css({
        display: "flex",
        width: "100%",
        height: "100%",
        backgroundColor: "var(--vscode-input-background)",
    }),
    textField: css({
        '&::part(control)': {
            fontFamily: 'monospace',
            fontSize: '12px'
        },
    })
});

export interface ExpressionBarProps {
    views: View[];
    filePath: string;
    applyModifications: (fileContent: string) => Promise<void>;
}

export default function ExpressionBarWrapper(props: ExpressionBarProps) {
    const { views, filePath, applyModifications } = props;
    const { rpcClient } = useVisualizerContext();
    const classes = useStyles();
    const textFieldRef = useRef<HeaderExpressionEditorRef>(null);
    const lastCursorPosition = useRef<number | undefined>();
    const completionReqPosStart = useRef<number>(0);
    const completionReqPosEnd = useRef<number>(0);

    const [,triggerRerender]=useState(false);
    const textFieldValueRef = useRef<string>("");
    let textFieldValue = textFieldValueRef.current;
    const setTextFieldValue = (value: string) => {
        textFieldValueRef.current = value;
        textFieldValue = value;
    };
    
    
    const [placeholder, setPlaceholder] = useState<string>();
    const [completions, setCompletions] = useState<CompletionItem[]>([]);
    const [action, triggerAction] = useState<boolean>(false);

    const {
        focusedPort,
        focusedFilter,
        lastFocusedPort,
        lastFocusedFilter,
        inputPort,
        savedNodeValue,
        lastSavedNodeValue,
        setLastFocusedPort,
        setLastFocusedFilter,
        resetInputPort,
        setSavedNodeValue,
        setLastSavedNodeValue,
        resetSavedNodeValue,
        resetLastSavedNodeValue,
        resetLastFocusedPort,
        resetLastFocusedFilter,
    } = useDMExpressionBarStore(state => state);

    const portChanged = !!(focusedPort && lastFocusedPort && lastFocusedPort.fieldFQN !== focusedPort.fieldFQN);

    const getCompletions = async (skipSurroundCheck?: boolean): Promise<CompletionItem[]> => {

        if (!focusedPort && !focusedFilter) {
            return [];
        }

        let nodeForSuggestions: Node;
        if (focusedPort) {
            nodeForSuggestions = 
                (focusedPort.getNode() as DataMapperNodeModel)?.context.functionST;
        } else {
            nodeForSuggestions = focusedFilter;
        }

        if (nodeForSuggestions && !nodeForSuggestions.wasForgotten()) {
            
            const relativeCursorPosition = textFieldRef.current.inputElement.selectionStart;

            const partialTextMatcher = textFieldValueRef.current.substring(0, relativeCursorPosition).trimStart().match('([a-zA-Z0-9_$]+)$');
            const partialText = (partialTextMatcher && partialTextMatcher.length) ? partialTextMatcher[partialTextMatcher.length-1] : undefined;

            if (!skipSurroundCheck && !shouldCompletionsAppear(textFieldValueRef.current, relativeCursorPosition, partialText)) {
                return [];
            }

            let fileContent = nodeForSuggestions.getSourceFile().getFullText();

            fileContent = fileContent.slice(0, completionReqPosStart.current) + ' ' + textFieldValueRef.current + fileContent.slice(completionReqPosEnd.current);
            const cursorPosition = completionReqPosStart.current + 1 + relativeCursorPosition;
            const response = await rpcClient.getMiDataMapperRpcClient().getCompletions({
                filePath,
                fileContent,
                cursorPosition
            });
            if (!response.completions) {
                return [];
            }

            const completions = response.completions as { entry: ts.CompletionEntry, details: ts.CompletionEntryDetails }[];

            const localFunctionNames = nodeForSuggestions
                .getSourceFile()
                .getFunctions()
                .map(fn => fn.getName())
                .filter(name => name !== READONLY_MAPPING_FUNCTION_NAME);

            const filteredCompletions: CompletionItem[] = [];
            for (const completion of completions) {
                const details = filterCompletions(completion.entry, completion.details, localFunctionNames, partialText);
                if (details) {
                    filteredCompletions.push(details);
                }
            }

            return filteredCompletions;
        }

        return [];
    };

    const updateCompletions = useCallback(debounce(async (text: string) => {
        setCompletions(await getCompletions());
    }, 200), [focusedPort, focusedFilter]);

    useEffect(() => {
        (async () => {
            if (inputPort) {
                // Keep the text field focused when an input port is selected
                if (textFieldRef.current) {
                    const inputElement = textFieldRef.current.inputElement;
                    if (focusedPort || focusedFilter) {
                        // Update the expression text when an input port is selected
                        const cursorPosition = inputElement.selectionStart;
                        
                        const inputAccessExpr = buildInputAccessExpr(inputPort.fieldFQN);
                        const updatedText =
                            textFieldValue.substring(0, cursorPosition) +
                            inputAccessExpr +
                            textFieldValue.substring(cursorPosition);
                        await handleChange(updatedText);
                        lastCursorPosition.current = cursorPosition + inputAccessExpr.length;
                        triggerAction((prev) => !prev);
                    } else {
                        inputElement.blur();
                    }
                    
                    resetInputPort();
                }
            }
        })();
    }, [inputPort]);

    const disabled = useMemo(() => {
        let value = "";
        let disabled = true;

        if (focusedPort) {
            setPlaceholder('Insert a value or select input for the output.');
            
            let focusedPortTypeWithValue = focusedPort.typeWithValue;
            let hasValue = !!focusedPortTypeWithValue.value;
            while(!focusedPortTypeWithValue.value && focusedPortTypeWithValue.parentType){
                focusedPortTypeWithValue = focusedPortTypeWithValue.parentType;
            }
            const focusedPortValue = focusedPortTypeWithValue.value;

            if (focusedPortValue && !focusedPortValue.wasForgotten()) {
                if (Node.isPropertyAssignment(focusedPortValue)) {
                    value = hasValue ? focusedPortValue.getInitializer()?.getText() : "";
                    completionReqPosStart.current = focusedPortValue.getInitializer()?.getStart() || 0;
                    completionReqPosEnd.current = focusedPortValue.getInitializer()?.getEnd() || 0;
                } else {
                    value = hasValue ? focusedPortValue.getText() : "";
                    completionReqPosStart.current = focusedPortValue.getStart();
                    completionReqPosEnd.current = focusedPortValue.getEnd();
                }
            }else{
                
                const focusedNode = focusedPort.getNode() as DataMapperNodeModel;
                const fnBody = focusedNode.context.functionST.getBody() as Block;
    
                const fnBodyText = fnBody.getText();
                completionReqPosStart.current = fnBody.getEnd() - (fnBodyText.length - fnBodyText.lastIndexOf('}'));
                completionReqPosEnd.current = completionReqPosStart.current;
            }

            disabled = focusedPort.isDisabled();
        } else if (focusedFilter && !focusedFilter.wasForgotten()) {
            value = focusedFilter.getText();
            completionReqPosStart.current = focusedFilter.getStart();
            completionReqPosEnd.current = focusedFilter.getEnd();

            disabled = false;
        } else {
            // If displaying a focused view
            if (views.length > 1 && !views[views.length - 1].subMappingInfo) {
                setPlaceholder('Click on an output field or a filter to add/edit expressions.');
            } else {
                setPlaceholder('Click on an output field to add/edit expressions.');
            }

            resetSavedNodeValue();
        }

        // Set cursor position
        if (focusedPort || focusedFilter) {
            lastCursorPosition.current = value.length;
            
            setTextFieldValue(value);
            setSavedNodeValue(value);
            triggerAction((prev) => !prev);
        }

        return disabled;
    }, [focusedPort, focusedFilter, views]);

    useEffect(() => {
        requestAnimationFrame(async () => {
            // Get the value to be saved
            let value = "";
            if (!lastFocusedPort && !lastFocusedFilter) {
                value = undefined;
            } else {
                value = textFieldValueRef.current;
            }

            if (disabled) {
                await handleBlur({target: {closest: ()=>{}}});
            } else if (portChanged) {
                await textFieldRef.current?.saveExpression(value);
                await handleFocus();
            } else {
                await handleFocus();
            }
        });
    }, [disabled, action, lastFocusedPort, lastFocusedFilter]);

    const initPortWithValue = async (port: InputOutputPortModel, value: string) => {
        const focusedNode = port.getNode() as DataMapperNodeModel;
        const fnBody = focusedNode.context.functionST.getBody() as Block;

        let objLitExpr: ObjectLiteralExpression;
        let parentPort = port?.parentModel;

        while (parentPort) {
            const parentValue = parentPort.typeWithValue?.value;
            if (parentValue && Node.isObjectLiteralExpression(parentValue)) {
                objLitExpr = parentValue;
                break;
            }
            parentPort = parentPort?.parentModel;
        }

        const propertyAssignment = await createSourceForUserInput(
            port?.typeWithValue, objLitExpr, value, fnBody, applyModifications
        );

        const portValue = getInnermostPropAsmtNode(propertyAssignment) || propertyAssignment;
        port.typeWithValue.setValue(portValue);
    }

    const applyChanges = async (value: string) => {
        await updateCompletions.flush();
        setSavedNodeValue(value);

        // Save the cursor position before saving
        lastCursorPosition.current = textFieldRef.current.inputElement.selectionStart;
        if (lastFocusedPort) {
            await applyChangesOnFocusedPort(value);
        } else if (lastFocusedFilter) {
            await applyChangesOnFocusedFilter(value);
        }
    };

    const applyChangesOnFocusedPort = async (value: string) => {
        const focusedFieldValue = lastFocusedPort?.typeWithValue.value;
        let updatedSourceContent;
        if (focusedFieldValue) {
            if (focusedFieldValue.wasForgotten()) {
                return;
            }

            let targetExpr: Node;

            if (Node.isPropertyAssignment(focusedFieldValue)) {
                const parent = focusedFieldValue.getParent();
                if (value === '') {
                    focusedFieldValue.remove();
                    lastFocusedPort.typeWithValue.value = undefined;
                    updatedSourceContent = parent.getSourceFile().getFullText();
                    await applyModifications(updatedSourceContent);
                } else if (focusedFieldValue.getInitializer()?.getText() !== value) {
                    focusedFieldValue.setInitializer(value);
                    updatedSourceContent = parent.getSourceFile().getFullText();
                    await applyModifications(updatedSourceContent);
                }
                
            } else {
                const newValue = value === ''
                    ? getDefaultValue(lastFocusedPort.typeWithValue.type)
                    : value;
                targetExpr = focusedFieldValue;
                const updatedNode = targetExpr.replaceWithText(newValue);
                updatedSourceContent = updatedNode.getSourceFile().getFullText();
                await applyModifications(updatedSourceContent);
            }
            
        }else if(value!=='' && lastFocusedPort){
            await initPortWithValue(lastFocusedPort, value);
        }
    };

    const applyChangesOnFocusedFilter = async (value: string) => {
        lastFocusedFilter.replaceWithText(value);
        const updatedSourceContent = lastFocusedFilter.getSourceFile().getFullText();
        await applyModifications(updatedSourceContent);
    };

    const handleChange = async (text: string, cursorPosition?: number) => {
        setTextFieldValue(text);
        await updateCompletions(text);
    };

    // TODO: Implement arg extraction logic using getSignatureHelp method of ts-morph language server
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    const extractArgsFromFunction = async (text: string, cursorPosition: number): Promise<any> => {
        return undefined;
    }

    const updateSource = async (value: string) => {
        if (savedNodeValue === value || (portChanged && lastSavedNodeValue === value)) {
            return;
        }
        await applyChanges(value);
    };

    const handleCompletionSelect = async (value: string) => {
        setCompletions([]);
    }

    const handleCancelCompletions = () => {
        updateCompletions.cancel();
        setCompletions([]);
    };

    const handleCloseCompletions = () => {
        lastCursorPosition.current = textFieldRef.current.inputElement.selectionStart;
        updateCompletions.cancel();
        setCompletions([]);
        handleFocus(false);
    }

    const handleFocus = async (showCompletions: boolean = true) => {
        
        const inputElement = textFieldRef.current.inputElement;
        inputElement.focus();
        inputElement.setSelectionRange(
            lastCursorPosition.current, lastCursorPosition.current
        );

        if (showCompletions) 
            setCompletions(await getCompletions());

        // Update the last focused port and filter
        setLastFocusedPort(focusedPort);
        setLastFocusedFilter(focusedFilter);
        setLastSavedNodeValue(savedNodeValue);
    };

    const handleBlur = async (e: any) => {
        if (e.target.closest('[id^="recordfield-input"]') ||
            e.target.closest('[id^="recordfield-subMappingInput"]') ||
            e.target.closest('[id^="recordfield-focusedInput"]')) {
            return;
        }
            
        await textFieldRef.current.saveExpression(textFieldValue, textFieldValueRef);
        
        // Reset the last focused port and filter

        resetLastFocusedPort();
        resetLastFocusedFilter();
        resetLastSavedNodeValue();

        // Reset text field value
        setTextFieldValue("");
        triggerRerender((prev)=>!prev);
    };

    const handleManualCompletionRequest = async () => {
        setCompletions(await getCompletions(true));
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const useDisableOnChange = (fn: (...args: any[]) => Promise<any>) => {
        return useMutation({
            mutationFn: fn,
            networkMode: 'always'
        });
    };

    const gotoSource = () => {
        let value = focusedPort?.typeWithValue.value;

        if (value) {
            if (Node.isPropertyAssignment(value)) {
                value = value.getInitializer();
            }
            const range = getEditorLineAndColumn(value);
            (focusedPort.getNode() as DataMapperNodeModel)?.context.goToSource(range);
        }

    };

    const inputProps: InputProps = {
        endAdornment: (
            <Button appearance="icon" tooltip="Goto source" onClick={gotoSource}>
                <Codicon name="code" />
            </Button>
        )
    };

    return (
        <div className={classes.exprBarContainer}>
            <HeaderExpressionEditor
                id='expression-bar'
                ref={textFieldRef}
                disabled={disabled}
                value={textFieldValue}
                placeholder={placeholder}
                completions={completions}
                inputProps={inputProps}
                autoSelectFirstItem={true}
                onChange={handleChange}
                extractArgsFromFunction={extractArgsFromFunction}
                onCompletionSelect={handleCompletionSelect}
                onSave={updateSource}
                onCancel={handleCancelCompletions}
                onClose={handleCloseCompletions}
                useTransaction={useDisableOnChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onManualCompletionRequest={handleManualCompletionRequest}
                sx={{ display: 'flex', alignItems: 'center' }}
            />
        </div>
    );
}
