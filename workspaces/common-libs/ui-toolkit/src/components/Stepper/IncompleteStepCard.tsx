/*
 *  Copyright (c) 2023, WSO2 LLC. (http://www.wso2.com). All Rights Reserved.
 *
 *  This software is the property of WSO2 LLC. and its suppliers, if any.
 *  Dissemination of any information or reproduction of any material contained
 *  herein is strictly forbidden, unless permitted by WSO2 in accordance with
 *  the WSO2 Commercial License available at http://wso2.com/licenses.
 *  For specific language governing the permissions and limitations under
 *  this license, please see the license as well as any agreement you’ve
 *  entered into with WSO2 governing the purchase of this software and any
 *  associated services.
 */
import React from "react";
import { BottomTitleHorizontalBar, BottomTitleWrapper, HorizontalBar, IconTitleWrapper, StepCard, StepCardProps, StepCircle, StepTitle } from "./Stepper";
import styled from "@emotion/styled";
import { colors } from "../Commons/Colors";

const StepNumber = styled.div`
    display: flex;
    justify-content: center;
    margin-top: 4px;
    margin-left: 8px;
    color: var(--vscode-editor-background);
`;

export const InCompletedStepCard: React.FC<StepCardProps> = (props: StepCardProps) => (
    <StepCard id={props.id} className={props.className}>
        {props.titleAlignment === "right" ? (
            <>
                <StepCircle color={props?.isCurrentStep ? colors.vscodeTextLinkForeground : colors.indentGuideActiveBackgound}>
                    <StepNumber>
                        {props.step.id + 1}
                    </StepNumber>
                </StepCircle>
                <StepTitle color={props?.isCurrentStep ? colors.editorForeground : colors.indentGuideActiveBackgound}>
                    {props.step.title}
                </StepTitle>
                {(props.totalSteps === props.step.id + 1) ? null : <HorizontalBar/>}
            </>
        ) :
            <>
                <IconTitleWrapper>
                    <StepCircle color={props.isCurrentStep ? colors.vscodeTextLinkForeground : colors.indentGuideActiveBackgound}>
                        <StepNumber>
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
