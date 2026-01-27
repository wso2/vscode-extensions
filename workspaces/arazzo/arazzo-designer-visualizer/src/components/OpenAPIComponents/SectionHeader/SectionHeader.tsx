import React, { ReactNode } from 'react';
import { Typography } from '@wso2/ui-toolkit';
import styled from "@emotion/styled";

const HeaderWrapper = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const ActionButtonsWrapper = styled.div`
    display: flex;
    gap: 10px;
`;

interface SectionHeaderProps {
    title: string;
    actionButtons?: ReactNode;
    variant?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "subtitle1" | "subtitle2";
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, actionButtons, variant = 'h3' }) => {
    return (
        <HeaderWrapper>
            <Typography sx={{ margin: 0 }} variant={variant}>{title}</Typography>
            {actionButtons && (
                <ActionButtonsWrapper>
                    {actionButtons}
                </ActionButtonsWrapper>
            )}
        </HeaderWrapper>
    );
};

export default SectionHeader;
