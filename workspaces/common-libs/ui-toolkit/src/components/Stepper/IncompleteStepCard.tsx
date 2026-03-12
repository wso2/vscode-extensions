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
import React from "react";
import { BottomTitleHorizontalBar, BottomTitleWrapper, HorizontalBar, IconTitleWrapper, StepCard, StepCardProps, StepCircle, StepTitle } from "./Stepper";
import styled from "@emotion/styled";
import { colors } from "../Commons/Colors";

const StepNumber = styled.div`
    color: ${(props: { color?: string; }) => props.color};
`;

export const InCompletedStepCard: React.FC<StepCardProps> = (props: StepCardProps) => (
    <StepCard id={props.id} className={props.className}>
        {props.titleAlignment === "right" ? (
            <>
                <StepCircle color={props?.isCurrentStep ? colors.vscodeButtonBackground : colors.indentGuideActiveBackgound}>
                    <StepNumber color={props?.isCurrentStep ? colors.vscodeButtonForeground : colors.editorForeground}>
                        {props.step.id + 1}
                    </StepNumber>
                </StepCircle>
                <StepTitle color={props?.isCurrentStep ? colors.editorForeground : colors.indentGuideActiveBackgound}>
                    {props.step.title}
                </StepTitle>
                {(props.totalSteps === props.step.id + 1) ? null : <HorizontalBar />}
            </>
        ) :
            <>
                <IconTitleWrapper>
                    <StepCircle color={props.isCurrentStep ? colors.vscodeButtonBackground : colors.indentGuideActiveBackgound}>
                        <StepNumber color={props?.isCurrentStep ? colors.vscodeButtonForeground : colors.editorForeground}>
                            {props.step.id + 1}
                        </StepNumber>
                    </StepCircle>
                    {props.totalSteps === props.step.id + 1 ? null : <BottomTitleHorizontalBar />}
                    <BottomTitleWrapper color={props?.isCurrentStep ? colors.editorForeground : colors.indentGuideActiveBackgound}>
                        {props.step.title}
                    </BottomTitleWrapper>
                </IconTitleWrapper>
            </>
        }
    </StepCard>
);
