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
import React from 'react';
import styled from "@emotion/styled";
import { CompletedStepCard } from './CompletedStepCard';
import { InCompletedStepCard } from './IncompleteStepCard';

export interface StepperStyleProps {
    color?: string;
}

export interface Step {
    id: number;
    title: string;
}

export interface StepperProps {
    id?: string;
    className?: string;
    steps: string[];
    currentStep: number;
    variant?: "right" | "bottom";
    alignment?: "flex-start" | "center" | "flex-end";
}

export interface StepCardProps {
    id?: string;
    className?: string;
    step: Step;
    currentStep: number;
    totalSteps: number;
    titleAlignment?: "right" | "bottom";
    isCurrentStep?: boolean;
}

export interface TitleProps {
    color?: string;
}

interface StepperContainerProps {
    allignment?: "flex-start" | "center" | "flex-end";
}

export const StepperContainer = styled.div<StepperContainerProps>`
    display: flex;
    flex-direction: row;
    flex-grow: initial;
    justify-content: ${(props: StepperContainerProps) => props.allignment};
`;

export const StepCard = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
`;

export const StepTitle = styled.div`
    font-size: 14px;
    padding-left: 5px;
    color: ${(props: TitleProps) => props.color};
    font-weight: 600;
`;

export const BottomTitleWrapper = styled.div`
    display: flex;
    font-size: 14px;
    font-weight: 600;
    flex-direction: column;
    color: ${(props: TitleProps) => props.color};
    align-items: center;
    text-align: center;
    margin-top: 15px;
`;

export const BottomStepTitle = styled.div`
    font-size: 14px;
    padding-top: 12px;
    padding-left: 5px;
    padding-right: 5px;
    color: ${(props: TitleProps) => props.color};
    font-weight: 600;
`;

export const StepStatus = styled.div`
    color: ${(props: StepperStyleProps) => props.color};
    padding-top: 5px;
    font-size: 9px;
`;

export const StepCircle = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: ${(props: StepperStyleProps) => props.color};
    width: 24px;
    height: 24px;
    min-width: 24px;
    min-height: 24px;
    border-radius: 50%;
    flex-shrink: 0;
    border: 1px solid var(--button-border);
`;

export const HorizontalBar = styled.div`
    width: 120px;
    background-color: var(--vscode-editorIndentGuide-activeBackground);
    height: 1px;
    margin-left: 5px;
    margin-right: 5px;
`;

export const IconTitleWrapper = styled.div`
    display: flex;
    width: 150px;
    flex-direction: column;
    justify-content: flex-start;
`;

export const BottomTitleHorizontalBar = styled.div`
    width: 120px;
    background-color: var(--vscode-editorIndentGuide-activeBackground);
    height: 1px;
    position: relative;
    top: -5px;
    left: 85px;
    margin-left: 5px;
    margin-right: 5px;
`;

export const Stepper: React.FC<StepperProps> = (props: StepperProps) => {
    const { id, className, steps, currentStep, alignment: alignment = "center", variant: titleAlignment = "right" } = props;

    return (
        <StepperContainer id={id} className={className} allignment={alignment}>
            {steps.map((step: string, id: number) => {
                const stepCardProps: StepCardProps = {
                    currentStep: currentStep,
                    step: {
                        id: id,
                        title: step
                    },
                    totalSteps: steps.length,
                    titleAlignment: titleAlignment,
                    isCurrentStep: (id === currentStep)
                };
                if (id < currentStep) {
                    return <CompletedStepCard key={`step${id}`} {...stepCardProps} />;
                }
                return <InCompletedStepCard key={`step${id}`} {...stepCardProps} />;
            })}
        </StepperContainer>
    );
};
