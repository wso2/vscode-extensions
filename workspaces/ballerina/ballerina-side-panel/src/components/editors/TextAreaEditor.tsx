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

import React, { useState } from "react";
import { FormField } from "../Form/types";
import { AutoResizeTextArea } from "@wso2/ui-toolkit";
import { useFormContext } from "../../context";
import { S } from "./ExpressionEditor";
import { Controller } from "react-hook-form";
import { ExpandedEditor } from "./ExpandedEditor";
import styled from "@emotion/styled";
import { ExpandButton } from "./MultiModeExpressionEditor/ChipExpressionEditor/components/FloatingButtonIcons";
import { FloatingToggleButton } from "./MultiModeExpressionEditor/ChipExpressionEditor/components/FloatingToggleButton";

interface TextAreaEditorProps {
    field: FormField;
    handleOnFieldFocus?: (key: string) => void;
    autoFocus?: boolean;
}

const TextAreaContainer = styled.div`
    width: 100%;
    position: relative;

    #textarea-editor-expand {
        opacity: 0;
        transition: opacity 0.2s ease-in-out;
    }

    &:hover #textarea-editor-expand {
        opacity: 1;
    }
`;

export function TextAreaEditor(props: TextAreaEditorProps) {
    const { field, handleOnFieldFocus, autoFocus } = props;
    const { form } = useFormContext();
    const { control, setValue, watch } = form;
    const [isExpandedModalOpen, setIsExpandedModalOpen] = useState(false);

    const errorMsg = field.diagnostics?.map((diagnostic) => diagnostic.message).join("\n");

    const handleOpenExpandedMode = () => {
        setIsExpandedModalOpen(true);
    };

    const handleSaveExpandedMode = (value: string) => {
        setValue(field.key, value);
        if (field.onValueChange) {
            field.onValueChange(value);
        }
    };

    return (
        <>
            <S.Container>
                <S.HeaderContainer>
                    <S.Header>
                        <S.LabelContainer>
                            <S.Label>{field.label}</S.Label>
                        </S.LabelContainer>
                        <S.Description>{field.documentation}</S.Description>
                    </S.Header>
                </S.HeaderContainer>
                <Controller
                    control={control}
                    name={field.key}
                    defaultValue={field.value}
                    rules={{
                        required: {
                            value: !field.optional && !field.placeholder,
                            message: `${field.label} is required`
                        }
                    }}
                    render={({ field: { name, value, onChange } }) => (
                        <TextAreaContainer>
                            <AutoResizeTextArea
                                id={field.key}
                                name={name}
                                aria-label={field.label}
                                required={!field.optional}
                                placeholder={field.placeholder}
                                readOnly={!field.editable}
                                value={value}
                                sx={{ width: "100%" }}
                                errorMsg={errorMsg}
                                onFocus={() => handleOnFieldFocus?.(field.key)}
                                autoFocus={autoFocus}
                                onChange={onChange}
                                growRange={{ start: 4, offset: 12 }}
                            />
                            <div id="textarea-editor-expand" style={{ position: 'absolute', bottom: '7px', right: '8px' }}>
                                <FloatingToggleButton onClick={handleOpenExpandedMode} title="Expand Editor">
                                    <ExpandButton />
                                </FloatingToggleButton>
                            </div>
                        </TextAreaContainer>
                    )}
                />
            </S.Container>
            <ExpandedEditor
                isOpen={isExpandedModalOpen}
                field={field}
                value={watch(field.key)}
                onClose={() => setIsExpandedModalOpen(false)}
                onSave={handleSaveExpandedMode}
            />
        </>
    );
}
