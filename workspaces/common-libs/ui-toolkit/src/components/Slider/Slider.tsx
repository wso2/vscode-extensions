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
import React, { ComponentProps } from "react";
import "@wso2/font-wso2-vscode/dist/wso2-vscode.css";
import styled from "@emotion/styled";

interface SliderContainerProps {
    sx?: any;
}

const SliderContainer = styled.div<SliderContainerProps>`
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    ${(props: SliderContainerProps) => props.sx};
`;

const LabelContainer = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--vscode-editor-foreground);
    margin-bottom: 4px;
`;

const Label = styled.label`
    font-size: 13px;
    font-weight: 400;
`;

const ValueDisplay = styled.span`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    font-family: var(--vscode-font-family);
`;

const SliderTrack = styled.div`
    position: relative;
    width: 100%;
    height: 24px;
    display: flex;
    align-items: center;
`;

interface StyledSliderProps {
    percentage: number;
}

const StyledSlider = styled.input<StyledSliderProps>`
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 4px;
    background: linear-gradient(
        to right,
        var(--vscode-button-background) 0%,
        var(--vscode-button-background) ${(props: { percentage: number; }) => props.percentage}%,
        var(--vscode-editorWidget-background) ${(props: { percentage: number; }) => props.percentage}%,
        var(--vscode-editorWidget-background) 100%
    );
    border: 1px solid var(--vscode-editorWidget-border);
    outline: none;
    border-radius: 2px;
    cursor: pointer;

    &::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        background: var(--vscode-button-background);
        border: 1px solid var(--vscode-button-border);
        border-radius: 4px;
        cursor: pointer;

        &:hover {
            background: var(--vscode-button-hoverBackground);
        }

        &:active {
            background: var(--vscode-button-hoverBackground);
        }
    }

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;

        &::-webkit-slider-thumb {
            cursor: not-allowed;
        }

        &::-moz-range-thumb {
            cursor: not-allowed;
        }
    }
`;

const MarkersContainer = styled.div`
    display: flex;
    justify-content: space-between;
    margin-top: 4px;
    padding: 0 2px;
`;

const Marker = styled.span`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
`;

export interface SliderProps extends Omit<ComponentProps<"input">, "type"> {
    id?: string;
    className?: string;
    label?: string;
    sx?: any;
    showValue?: boolean;
    valueFormatter?: (value: number) => string;
    showMarkers?: boolean;
    step?: number;
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>((props, ref) => {
    const {
        id,
        className,
        label,
        sx,
        showValue = true,
        valueFormatter,
        showMarkers = true,
        min = 0,
        max = 100,
        step = 1,
        value,
        defaultValue,
        ...rest
    } = props;

    const generatedId = React.useId();
    const resolvedId = id ?? generatedId;

    const [currentValue, setCurrentValue] = React.useState<number>(
        (value as number) ?? (defaultValue as number) ?? Number(min)
    );

    React.useEffect(() => {
        if (value !== undefined) {
            setCurrentValue(value as number);
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = Number(e.target.value);
        setCurrentValue(newValue);
        props.onChange?.(e);
    };

    const formatValue = (val: number): string => {
        if (valueFormatter) {
            return valueFormatter(val);
        }
        return val.toString();
    };

    const range = Number(max) - Number(min);
    const percentage = range === 0 ? 0 : ((currentValue - Number(min)) / range) * 100;

    return (
        <SliderContainer id={resolvedId} className={className} sx={sx}>
            {label && (
                <LabelContainer>
                    <Label htmlFor={`${resolvedId}-slider`}>{label}</Label>
                    {showValue && (
                        <ValueDisplay>{formatValue(currentValue)}</ValueDisplay>
                    )}
                </LabelContainer>
            )}
            <SliderTrack>
                <StyledSlider
                    ref={ref}
                    id={`${resolvedId}-slider`}
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={currentValue}
                    onChange={handleChange}
                    percentage={percentage}
                    {...rest}
                />
            </SliderTrack>
            {showMarkers && (
                <MarkersContainer>
                    <Marker>{min}</Marker>
                    <Marker>{max}</Marker>
                </MarkersContainer>
            )}
        </SliderContainer>
    );
});

Slider.displayName = "Slider";
