import React, { ReactNode } from 'react';
import { Typography } from '@wso2/ui-toolkit';
import styled from "@emotion/styled";
import { getColorByMethod } from '../../Utils/OpenAPIUtils';

interface MethodWrapperProps {
    color: string;
}

const MethodWrapper = styled.div<MethodWrapperProps>`
    display: flex;
    width: fit-content;
    color: white;
    background-color: ${(props: MethodWrapperProps) => props.color};
    border-radius: 2px;
`;

const PathWrapper = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
`;

const LeftContent = styled.div`
    display: flex;
    flex-direction: row;
    gap: 10px;
`;

const RightContent = styled.div`
    display: flex;
    align-items: center;
`;

interface ResourceHeaderProps {
    method: string;
    path: string;
    actionButtons?: ReactNode;
}

const ResourceHeader: React.FC<ResourceHeaderProps> = ({ method, path, actionButtons }) => {
    return (
        <PathWrapper>
            <LeftContent>
                <MethodWrapper color={getColorByMethod(method)}>
                    <Typography
                        variant="h3"
                        sx={{ margin: 0, padding: 4, display: "flex", justifyContent: "center", minWidth: 60 }}
                    >
                        {method.toUpperCase()}
                    </Typography>
                </MethodWrapper>
                <Typography sx={{ margin: 0, marginTop: 4 }} variant="h3">{path}</Typography>
            </LeftContent>
            <RightContent>
                {actionButtons}
            </RightContent>
        </PathWrapper>
    );
};

export default ResourceHeader;
