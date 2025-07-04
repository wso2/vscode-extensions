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

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { TextArea } from "@wso2/ui-toolkit";

interface RowRange {
    start: number;
    offset: number;
}

interface CodeTextAreaProps {
    label?: string;
    id?: string;
    className?: string;
    autoFocus?: boolean;
    required?: boolean;
    errorMsg?: string;
    placeholder?: string;
    cols?: number;
    rows?: number;
    resize?: string;
    growRange?: RowRange;
    validationMessage?: string;
    sx?: any;
    name?: string;
    value?: string;
    onTextChange?: (text: string) => void;
    onChange?: (e: any) => void;
}

export const CodeTextArea = forwardRef<HTMLTextAreaElement, CodeTextAreaProps>((props, ref) => {
    const { growRange, onTextChange, onChange, ...rest } = props;
    const [rows, setRows] = useState(props.rows || growRange?.start || 1);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(ref, () => textAreaRef.current);

    const growTextArea = (text: string) => {
        const { start, offset } = growRange;
        const lineCount = text ? (text.split("\n").length) : (props.rows || growRange?.start || 1)
        const newRows = Math.max(start, Math.min(start + offset, lineCount));
        setRows(newRows);
    };

    const handleChange = (e: any) => {
        if (growRange) {
            growTextArea(e.target.value);
        }
        onChange && onChange(e);
    };

    useEffect(() => {
        growRange && growTextArea(props.value || "");
    }, []);

    return <TextArea ref={textAreaRef} onChange={handleChange} rows={rows} {...rest} />;
});
