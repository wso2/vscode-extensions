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
import CardWrapper from "./CardWrapper";
import Endpoint from "./Endpoint";
import EndpointList from "./EndpointList";
import InlineButtonGroup from "./InlineButtonGroup";
import ParamField from "./ParamField";
import PropertiesTable from "./PropertiesTable";
import { Button, Codicon, Badge } from "@wso2/ui-toolkit";

export const SectionWrapper: any = styled.div`
    // Flex Props
    display: flex;
    height: 65vh;
    flex-direction: column;
    justify-content: flex-start;
    position: relative;
    gap: 30px;
    margin: auto 0;
    min-width: 350px;
    // End Flex Props
    // Sizing Props
    padding: 40px 120px;
    // End Sizing Props
    // Border Props
    border-radius: 10px;
    border-style: solid;
    border-width: 1px;
    border-color: transparent;
    overflow: auto;
    &.active {
        border-color: var(--vscode-focusBorder);
    }
`;

export const FieldGroup: any = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

export { CardWrapper, Endpoint, EndpointList, InlineButtonGroup, ParamField, PropertiesTable };

const ButtonWrapper: any = styled.div({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
});
const TitleWrapper: any = styled.div({
    marginLeft: 10,
    whiteSpace: 'nowrap',
    width: '100%'
});
const BadgeWrapper: any = styled.div({
    display: "flex",
    gap: 5,
    alignItems: "center",
    justifyContent: "center",
});
type TypeChipProps = { 
    type: string,
    onClick: (type: string) => void, 
    showButton: boolean,
    title?: string, 
    id?: string
};
export function TypeChip(props: TypeChipProps) {
    return (
        <ButtonWrapper>
            <BadgeWrapper>
                <span>{props.id ?? "Type:"}</span>
                <Badge color="#4d4d4d" sx={{
                    color: "#fff",
                    padding: 5,
                    borderRadius: 5,
                }}>
                    {props.type ?? 'HTTP'}
                </Badge>
            </BadgeWrapper>
            {props.showButton && <Button
                appearance="secondary"
                onClick={() => props.onClick("")}
                sx={{ display: "flex", gap: 10 }}
            >
                <Codicon iconSx={{ fontWeight: "bold", fontSize: 15 }} name='arrow-left' />
                <TitleWrapper>{props.title ?? "Change Type"}</TitleWrapper>
            </Button>}
        </ButtonWrapper>
    )
}
