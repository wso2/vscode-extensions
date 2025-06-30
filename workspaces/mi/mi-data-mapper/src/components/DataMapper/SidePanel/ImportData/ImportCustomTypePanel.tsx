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
import React, { useEffect, useMemo, useRef, useState } from "react";

import { Button, Icon, LinkButton, TextArea } from "@wso2/ui-toolkit";
import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { Controller, useForm } from 'react-hook-form';

import { FileExtension, ImportType } from "./ImportDataForm";
import { validateCSV, validateJSON, validateJSONSchema, validateXML, validateInterfaceName } from "./ImportDataUtils";
import { FunctionDeclaration, ts } from "ts-morph";

const ErrorMessage = styled.span`
   color: var(--vscode-errorForeground);
   font-size: 12px;
`;

const useStyles = () => ({
    fileUploadText: css({
        fontSize: "12px"
    })
});

interface RowRange {
    start: number;
    offset: number;
}

interface ImportCustomTypePanelProps {
    functionST: FunctionDeclaration;
    importType: ImportType;
    extension: FileExtension;
    rowRange?: RowRange;
    onSave: (typeName: string, text: string) => void;
}

export function ImportCustomTypePanel(props: ImportCustomTypePanelProps) {
    const { functionST, importType, extension, rowRange, onSave } = props;
    const classes = useStyles();
    const { control, formState: { errors }, setValue, handleSubmit } = useForm({
        defaultValues: {
            typeName: '',
            payload: ''
        },
        mode: 'onTouched'
    });

    const [payloadRows, setPayloadRows] = useState(rowRange.start || 1);

    const payloadTextAreaRef = useRef<HTMLTextAreaElement>(null);
    const hiddenFileInput = useRef(null);

    useEffect(() => {
        if (payloadTextAreaRef.current) {
            const textarea = payloadTextAreaRef.current.shadowRoot.querySelector("textarea");
            const handleOnKeyDown = (event: KeyboardEvent) => {
                if (event.key === "Tab") {
                    event.preventDefault();
                    const selectionStart = textarea.selectionStart;
                    textarea.setRangeText("  ", selectionStart, selectionStart, "end");
                }
            };

            textarea.addEventListener("keydown", handleOnKeyDown);
            return () => {
                textarea.removeEventListener("keydown", handleOnKeyDown);
            };
        }
    }, [payloadTextAreaRef]);

    const validatePayload = (value: string) => {
        try {
            switch (importType.type) {
                case 'JSON':
                    validateJSON(value);
                    break;
                case 'CSV':
                    validateCSV(value);
                    break;
                case 'XML':
                    validateXML(value);
                    break;
                case 'JSONSCHEMA':
                    validateJSONSchema(value);
                    break;
                default:
                    break;
            }
            return true;
        } catch (error) {
            return `Invalid ${importType.label} format.`;
        }
    };

    const validateTypeName = (value: string) => validateInterfaceName(value, functionST.getSourceFile());

    const growPayloadTextArea = (text: string) => {
        const { start, offset } = rowRange;
        const lineCount = text.split("\n").length;
        const newRows = Math.max(start, Math.min(start + offset, lineCount));
        setPayloadRows(newRows);
    };

    const handlePayloadChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (rowRange) {
            growPayloadTextArea(e.target.value);
        }
    };

    const handleClick = (event?: React.MouseEvent<HTMLButtonElement>) => {
        hiddenFileInput.current.click();
    };

    const showFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        const reader = new FileReader();
        const ext = e.target.files[0].name.split(".").pop().toLowerCase();
        reader.readAsText(e.target.files[0]);
        reader.onload = async (loadEvent: any) => {
            if (`.${ext}` === extension) {
                const text = loadEvent.target.result as string;
                setValue('payload', text, { shouldValidate: true });
            }
        };
    };

    const handleSave = (data: { typeName: string; payload: string }) => {
        onSave(data.typeName, data.payload);
    };

    const generatePlaceholder = useMemo(() => {
        switch (importType.type) {
            case 'JSON':
                return '{"key":"value"}';
            case 'CSV':
                return 'column1,column2,column3';
            case 'XML':
                return '<root><element>value</element></root>';
            case 'JSONSCHEMA':
                return `Enter JSON Schema`;
            case 'XSD':
                return `Enter XSD`;
            default:
                return 'Enter your data';
        }
    }, [importType]);

    const fileUploadText = useMemo(() => `Upload ${importType.label} file`, [importType]);

    return (
        <>
            <input hidden={true} accept={extension} type="file" onChange={showFile} ref={hiddenFileInput} />
            <Controller
                name="typeName"
                control={control}
                rules={{
                    required: "Type name is required",
                    validate: validateTypeName
                }}
                render={({ field }) => (
                    <TextArea
                        {...field}
                        label="Custom Type Name"
                        placeholder="Type name"
                        rows={1}
                        sx={{ border: "#00ff00", marginBottom: 10 }}
                        errorMsg={errors && errors.typeName?.message.toString()}
                    />
                )}
            />
            <LinkButton
                onClick={handleClick}
                sx={{ padding: "5px", gap: "2px" }}
            >
                <Icon
                    iconSx={{ fontSize: "12px" }}
                    name="file-upload"
                />
                <p className={classes.fileUploadText}>{fileUploadText}</p>
            </LinkButton>
            <Controller
                name="payload"
                control={control}
                rules={{
                    required: "Payload is required",
                    validate: validatePayload
                }}
                render={({ field }) => (
                    <TextArea
                        {...field}
                        ref={payloadTextAreaRef}
                        onChange={(e) => { field.onChange(e); handlePayloadChange(e) }}
                        rows={payloadRows}
                        resize="vertical"
                        placeholder={generatePlaceholder}
                        sx={{ border: "#00ff00" }}
                        errorMsg={errors && errors.payload?.message.toString()}
                    />
                )}
            />
            <div style={{ textAlign: "right", marginTop: "10px", float: "right" }}>
                <Button
                    appearance="primary"
                    onClick={handleSubmit(handleSave)}
                    disabled={false}
                >
                    Save
                </Button>
            </div>
        </>
    );
}
