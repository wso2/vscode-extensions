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
import React, { useEffect, useRef } from "react";
import {VSCodeColors} from "../../../resources/constants";

interface EditableDivProps {
    label?: string;
    icon?: React.ReactNode;
    placeholder?: string;
    value: string;
    onChange: (value: string) => void;
    contentEditable?: boolean;
}

const EditableDiv: React.FC<EditableDivProps> = ({
    label,
    placeholder,
    value,
    onChange,
    icon,
    contentEditable,
}: EditableDivProps & {}) => {
    const divRef = useRef<HTMLDivElement>(null);
    const isPlaceholderVisible = value.trim() === "";

    useEffect(() => {
        const el = divRef.current;
        if (el && document.activeElement !== el) {
            el.innerText = isPlaceholderVisible ? placeholder : value;
            el.style.color = isPlaceholderVisible ? VSCodeColors.ON_SURFACE : VSCodeColors.ON_SECONDARY;
        }
    }, [value, placeholder]);

    const handleInput = () => {
        const newText = divRef.current?.innerText ?? "";
        onChange(newText);
    };

    const handleFocus = () => {
        const el = divRef.current;
        if (el && isPlaceholderVisible) {
            el.innerText = "";
            el.style.color = VSCodeColors.ON_SECONDARY;
        }
    };

    const handleBlur = () => {
        const el = divRef.current;
        if (el && el.innerText.trim() === "") {
            el.innerText = placeholder;
            el.style.color = VSCodeColors.ON_SURFACE;
        }
    };

    return (
        <>
            {(label || icon) && (
                <label style={{ display: "flex", fontWeight: "bold" }}>
                    {label && <span>{label}</span>}
                    {icon && <span style={{ marginLeft: "8px" }}>{icon}</span>}
                </label>
            )}
            <div
                ref={divRef}
                contentEditable={contentEditable ? contentEditable : false}
                onInput={handleInput}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{
                    borderRadius: "8px",
                    padding: "2px",
                    fontFamily: "sans-serif",
                    whiteSpace: "pre-wrap",
                    outline: "none",
                }}
            />
        </>
    );
};

export default EditableDiv;
