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
import styled from "@emotion/styled";
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";
import React, { ComponentPropsWithRef, ReactNode } from "react";
import { Control, Controller } from "react-hook-form";

const Directions = {
    vertical: "vertical",
    horizontal: "horizontal",
} as const;

export type CheckBoxProps = {
    label: string;
    labelAdornment?: ReactNode;
    value?: string;
    checked: boolean;
    indeterminate?: boolean;
    disabled?: boolean;
    sx?: any;
    onChange: (checked: boolean) => void;
};

export type CheckBoxGroupProps = ComponentPropsWithRef<"div"> & {
    columns?: number;
    containerSx?: React.CSSProperties;
    direction?: (typeof Directions)[keyof typeof Directions];
};

const CheckBoxContainer = styled.div<CheckBoxGroupProps>`
    display: grid;
    ${({ columns, direction }: CheckBoxGroupProps) =>
        direction === Directions.vertical
            ? `grid-template-columns: repeat(${columns}, auto);
        column-gap: 5%;
        grid-auto-flow: row dense;`
            : `grid-template-rows: repeat(${columns}, auto);
        row-gap: 5%;
        grid-auto-flow: column dense;`}
    ${({ containerSx }: CheckBoxGroupProps) => containerSx};
`;

export const StyledCheckBox = styled(VSCodeCheckbox)<CheckBoxProps>`
    --checkbox-border: var(--vscode-icon-foreground);
    display: flex;
    align-items: center;
    ${(props: CheckBoxProps) => props.sx};
`;

const LabelContainer = styled.div`
    display: flex;
    flex-direction: row;
    margin-bottom: 2px;
`;
export const CheckBox = ({ label, labelAdornment, value, sx, checked, indeterminate, onChange, disabled }: CheckBoxProps) => {
    const checkboxRef = React.useRef<HTMLInputElement>(null);

    // Set indeterminate property on the native input element
    React.useEffect(() => {
        if (checkboxRef.current) {
            checkboxRef.current.indeterminate = indeterminate ?? false;
        }
    }, [indeterminate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.checked);
    };

    const handleLabelClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(!checked);
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", width: "fit-content" }}>
            <StyledCheckBox
                ref={checkboxRef as any}
                key={`checkbox-${value}`}
                sx={sx}
                value={value}
                checked={checked}
                onClick={handleChange}
                disabled={disabled}
            >
                <LabelContainer>
                    <div style={{ color: "var(--vscode-editor-foreground)", cursor: "pointer" }} onClick={handleLabelClick}>
                        {label}
                    </div>
                    {labelAdornment && labelAdornment}
                </LabelContainer>
            </StyledCheckBox>
            {/* Show description if given, right under the entire checkbox, also highlight the whole thing */}
            {typeof sx === "object" && sx && sx.description && (
                <div
                    style={{
                        background: "var(--vscode-editor-background)",
                        color: "var(--vscode-list-deemphasizedForeground)",
                        marginTop: 2,
                        marginBottom: 5,
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontSize: 13,
                        userSelect: "text"
                    }}
                >
                    {sx.description}
                </div>
            )}
        </div>
    );
};

interface ContainerProps {
    sx?: any;
}
const Description = styled.div<ContainerProps>`
    color: var(--vscode-list-deemphasizedForeground);
    margin-bottom: 4px;
    text-align: left;
    ${(props: ContainerProps) => props.sx};
`;

interface FormCheckBoxProps {
    name: string;
    label?: string;
    labelAdornment?: ReactNode;
    description?: string;
    descriptionSx?: any;
    sx?: any;
    control: Control<any>;
}

const FormCheckBoxContainer = styled.div<ContainerProps>`
    ${({ sx }: ContainerProps) => sx};
`;

export const FormCheckBox: React.FC<FormCheckBoxProps> = ({ name, control, label, labelAdornment, description, sx, descriptionSx }) => {
    return (
        <FormCheckBoxContainer sx={sx}>
            <Controller
                name={name}
                control={control}
                render={({ field: { onChange, value: checked } }) => {
                    return (
                        <div>
                            {description && (
                                <Description sx={descriptionSx}>
                                    {description}
                                </Description>
                            )}
                            <CheckBox
                                label={label}
                                labelAdornment={labelAdornment}
                                checked={checked}
                                onChange={onChange}
                            />
                        </div>
                    );
                }}
            />
        </FormCheckBoxContainer>
    );
};

export const CheckBoxGroup = ({
    id,
    className,
    columns = 1,
    direction = Directions.vertical,
    containerSx,
    children,
}: CheckBoxGroupProps) => {
    return (
        <CheckBoxContainer
            id={id}
            className={className}
            columns={columns}
            direction={direction}
            containerSx={containerSx}
        >
            {children}
        </CheckBoxContainer>
    );
};
