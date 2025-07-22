/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import React from 'react';
import styled from '@emotion/styled';
import { Button, Icon, Codicon } from "@wso2/ui-toolkit";


type ViewHeaderProps = {
    title: string | React.ReactNode;
    children?: React.ReactNode;
    codicon?: string;
    icon?: string;
    iconSx?: any;
    onEdit?: () => void;
};

// Emotion styled components
const Header = styled.div({
    backgroundColor: 'var(--vscode-editor-background)',
});

const HeaderContentWrapper = styled.div({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 20px', // Set padding on left and right to 20px
});

const TitleContainer = styled.div({
    display: 'flex',
    alignItems: 'center',
    '& > *:not(:last-child)': { // Apply margin right to all children except the last one
        marginRight: '5px',
    },
});

const Title = styled.h3({
    /* Style for title */
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
});

const Actions = styled.div({
    /* Style for actions */
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
});

const ViewHeader: React.FC<ViewHeaderProps> = ({ title, children, codicon, icon, iconSx, onEdit }) => {
    return (
        <Header>
            <HeaderContentWrapper>
                <TitleContainer data-testid="diagram-title">
                    {codicon && <Codicon name={codicon} />}
                    {icon && <div style={{ marginRight: "12px" }}><Icon iconSx={iconSx} name={icon} /></div>}
                    {typeof title === 'string' ? <Title>{title}</Title> : title}
                    {onEdit && (
                        <Button
                            appearance="icon"
                            onClick={onEdit}
                            tooltip="Edit"
                        >
                            <Codicon
                                name="edit"
                            />
                            &nbsp;Edit
                        </Button>
                    )}
                </TitleContainer>
                <Actions>{children}</Actions>
            </HeaderContentWrapper>
        </Header>
    );
};

export default ViewHeader;
