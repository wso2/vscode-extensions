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
import { StepCard, StepTitle, StepCardProps, StepCircle, HorizontalBar, BottomTitleWrapper, BottomTitleHorizontalBar, IconTitleWrapper } from "./Stepper";
import styled from "@emotion/styled";
import { colors } from "../Commons/Colors";

const RightSign = styled.div`
    width: 5px;
    height: 12px;
    border: 2px solid white;
    border-bottom: none;
    border-right: none;
    transform: rotate(225deg);
`;

export const CompletedStepCard: React.FC<StepCardProps> = (props: StepCardProps) => (
    <StepCard id={props.id} className={props.className}>
        {props.titleAlignment === "right" ? (
            <>
                <StepCircle color={colors.vscodeButtonBackground}>
                    <RightSign />
                </StepCircle>
                <StepTitle color={colors.editorForeground}>
                    {props.step.title}
                </StepTitle>
                {props.totalSteps === props.step.id + 1 ? null : <HorizontalBar />}
            </>
        ) :
            <>
                <IconTitleWrapper>
                    <StepCircle color={colors.vscodeButtonBackground}>
                        <RightSign />
                    </StepCircle>
                    {props.totalSteps === props.step.id + 1 ? null : <BottomTitleHorizontalBar />}
                    <BottomTitleWrapper color={colors.editorForeground}>
                        {props.step.title}
                    </BottomTitleWrapper>
                </IconTitleWrapper>
            </>
        }
    </StepCard>
);
