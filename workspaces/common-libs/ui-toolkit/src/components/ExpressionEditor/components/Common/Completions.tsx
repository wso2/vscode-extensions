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

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import styled from '@emotion/styled';
import { VSCodeTag } from '@vscode/webview-ui-toolkit/react';
import {
    CompletionDropdownItemProps,
    CompletionDropdownProps,
    DefaultCompletionDropdownItemProps,
    DropdownContainerStyles
} from './types';
import { getIcon } from '../../utils';
import { Codicon } from '../../../Codicon/Codicon';
import Typography from '../../../Typography/Typography';
import { DROPDOWN_DEFAULT_WIDTH, DROPDOWN_MIN_WIDTH } from '../../constants';

/* Styled components */
const StyledTag = styled(VSCodeTag)`
    ::part(control) {
        text-transform: none;
        font-size: 10px;
        height: 16px;
    }
`;

const DropdownBody = styled.div<DropdownContainerStyles>`
    width: ${(props: DropdownContainerStyles) =>
        props.editorWidth ? props.editorWidth : `${DROPDOWN_DEFAULT_WIDTH}px`};
    min-width: ${DROPDOWN_MIN_WIDTH}px;
    max-width: ${DROPDOWN_DEFAULT_WIDTH}px;
    padding-top: 8px;
    border-radius: 2px;
    background-color: var(--vscode-dropdown-background);
    ${(props: DropdownContainerStyles) => props.sx}
`;

const DropdownItemBody = styled.div`
    max-height: 249px;
    overflow-y: scroll;
`;

const DropdownItemContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 4px 8px;
    font-family: monospace;
    cursor: pointer;

    & > #description {
        display: none;
    }

    &.hovered > #description {
        display: block;
        color: var(--vscode-list-deemphasizedForeground);
    }
    &.hovered {
        background-color: var(--vscode-list-activeSelectionBackground);
        color: var(--vscode-list-activeSelectionForeground);
    }
`;

const TitleContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const Divider = styled.div`
    height: 1px;
    background-color: var(--vscode-editorWidget-border);
`;

const DropdownFooter = styled.div`
    display: flex;
    padding: 8px 4px;
    gap: 4px;
`;

const DropdownFooterSection = styled.div`
    display: flex;
    align-items: center;
`;

const DropdownFooterText = styled.p`
    margin: 0;
    font-size: 12px;
`;

const DropdownFooterKey = styled.p`
    margin: 0;
    font-size: 10px;
    font-weight: 800;
`;

const KeyContainer = styled.div`
    padding: 2px;
    margin-inline: 4px;
    border-radius: 2px;
    border: 1px solid var(--vscode-editorWidget-border);
`;

const DefaultCompletionItem = (props: DefaultCompletionDropdownItemProps) => {
    const { getDefaultCompletion, onClick } = props;
    const itemRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = () => {
        const parentEl = itemRef.current.parentElement;
        const hoveredEl = parentEl.querySelector('.hovered');
        if (hoveredEl) {
            hoveredEl.classList.remove('hovered');
        }
        itemRef.current.classList.add('hovered');
    }

    return (
        <DropdownItemContainer
            ref={itemRef}
            className="hovered"
            id="default-completion"
            onMouseEnter={handleMouseEnter}
            onClick={onClick}
        >
            {getDefaultCompletion()}
        </DropdownItemContainer>
    );
}

const DropdownItem = (props: CompletionDropdownItemProps) => {
    const { item, isSelected, onClick } = props;
    const itemRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = () => {
        const superParentEl = itemRef.current.parentElement.parentElement;
        const hoveredEl = superParentEl.querySelector('.hovered');
        if (hoveredEl) {
            hoveredEl.classList.remove('hovered');
        }
        itemRef.current.classList.add('hovered');
    };

    return (
        <DropdownItemContainer
            ref={itemRef}
            {...(isSelected && { className: 'hovered' })}
            onMouseEnter={handleMouseEnter}
            onClick={onClick}
        >
            <TitleContainer>
                {getIcon(item.kind)}
                {item.tag && <StyledTag>{item.tag}</StyledTag>}
                <Typography variant="body3" sx={{ fontWeight: 600 }}>
                    {item.label}
                </Typography>
            </TitleContainer>
            {item.description && (
                <Typography id="description" variant="caption">
                    {item.description}
                </Typography>)
            }
        </DropdownItemContainer>
    );
};

export const Dropdown = forwardRef<HTMLDivElement, CompletionDropdownProps>((props, ref) => {
    const {
        items,
        showDefaultCompletion,
        autoSelectFirstItem,
        getDefaultCompletion,
        onCompletionSelect,
        onDefaultCompletionSelect,
        isSavable,
        sx,
        editorWidth
    } = props;
    const listBoxRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => listBoxRef.current);

    return (
        <DropdownBody sx={sx} editorWidth={editorWidth} className="unq-modal-overlay">
            {showDefaultCompletion && (
                <DefaultCompletionItem
                    getDefaultCompletion={getDefaultCompletion}
                    onClick={async () => await onDefaultCompletionSelect()}
                />
            )}
            <DropdownItemBody ref={listBoxRef}>
                {items.map((item, index) => {
                    return (
                        <DropdownItem
                            key={`dropdown-item-${index}`}
                            {...(autoSelectFirstItem && { isSelected: index === 0 })}
                            item={item}
                            onClick={async () => await onCompletionSelect(item)}
                        />
                    );
                })}
            </DropdownItemBody>
            <Divider />
            <DropdownFooter>
                <DropdownFooterSection>
                    <KeyContainer>
                        <Codicon
                            name="arrow-small-up"
                            sx={{ display: 'flex', height: '12px', width: '12px' }}
                            iconSx={{
                                fontSize: '12px',
                                fontWeight: '600',
                            }}
                        />
                    </KeyContainer>
                    <DropdownFooterText>,</DropdownFooterText>
                    <KeyContainer>
                        <Codicon
                            name="arrow-small-down"
                            sx={{ display: 'flex', height: '12px', width: '12px' }}
                            iconSx={{
                                fontSize: '12px',
                                fontWeight: '600',
                            }}
                        />
                    </KeyContainer>
                    <DropdownFooterText>to navigate.</DropdownFooterText>
                </DropdownFooterSection>
                <DropdownFooterSection>
                    <KeyContainer>
                        <DropdownFooterKey>ENTER</DropdownFooterKey>
                    </KeyContainer>
                    <DropdownFooterText>{isSavable ? 'to select/save.' : 'to select.'}</DropdownFooterText>
                </DropdownFooterSection>
                <DropdownFooterSection>
                    <KeyContainer>
                        <DropdownFooterKey>ESC</DropdownFooterKey>
                    </KeyContainer>
                    <DropdownFooterText>to cancel.</DropdownFooterText>
                </DropdownFooterSection>
            </DropdownFooter>
        </DropdownBody>
    );
});
Dropdown.displayName = 'Dropdown';
