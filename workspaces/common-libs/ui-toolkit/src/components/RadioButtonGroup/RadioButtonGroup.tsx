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
import React, { ReactNode, ComponentProps } from "react";
import "@wso2/font-wso2-vscode/dist/wso2-vscode.css";

import styled from "@emotion/styled";

import { VSCodeRadioGroup, VSCodeRadio } from "@vscode/webview-ui-toolkit/react";

interface RadioButtonContainerProps {
    sx?: any;
}

interface OptionProps {
    id?: string;
    content?: string | ReactNode;
    value: any;
}

const RadioButtonContainer = styled.div<RadioButtonContainerProps>`
    ${(props: RadioButtonContainerProps) => props.sx};
`;

export interface RadioButtonGroupProps extends ComponentProps<"input"> {
    id?: string;
    className?: string;
	label?: string;
    sx?: any;
    options?: OptionProps[];
    orientation?: "vertical" | "horizontal";
}

export const RadioButtonGroup = React.forwardRef<HTMLInputElement, RadioButtonGroupProps>((props, ref) => {
    const { id, className, label, options, orientation, sx, ...rest } = props;

    return (
        <RadioButtonContainer id={id} className={className} sx={sx} {...rest} >
            <div style={{color: "var(--vscode-editor-foreground	)"}}>
                <label htmlFor={`${id}-label`}>{label}</label>
            </div>
            <VSCodeRadioGroup
                ref={ref}
                orientation={orientation}
                {...rest}
            >
                {options.map((option, index) => (
                    <VSCodeRadio
                        key={index}
                        id={option.id}
                        value={option.value}
                    >
                        {option.content}
                    </VSCodeRadio>
                ))}
            </VSCodeRadioGroup>
        </RadioButtonContainer>
    );
});
RadioButtonGroup.displayName = "RadioButtonGroup";
