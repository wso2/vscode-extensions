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

import React, { forwardRef, Fragment, ReactNode, useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import { FnSignatureElProps, DropdownContainerStyles } from './types';
import Typography from '../../../Typography/Typography';
import { DROPDOWN_DEFAULT_WIDTH, DROPDOWN_MIN_WIDTH } from '../../constants';
import { FnSignatureDocumentation } from '../../types';
import { Divider } from '../../../Divider/Divider';

/* Styled components */
const FnSignatureBody = styled.div<DropdownContainerStyles>`
    width: ${(props: DropdownContainerStyles) =>
        props.editorWidth ? props.editorWidth : `${DROPDOWN_DEFAULT_WIDTH}px`};
    min-width: ${DROPDOWN_MIN_WIDTH}px;
    max-width: ${DROPDOWN_DEFAULT_WIDTH}px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    border-radius: 2px;
    padding-block: 8px;
    background-color: var(--vscode-dropdown-background);
    border: 1px solid var(--vscode-menu-border);
    ${(props: DropdownContainerStyles) => props.sx}
`;

const SyntaxBody = styled.div`
    display: flex;
    align-items: center;
    margin: 0 16px;
    overflow-x: auto;
    white-space: nowrap;
    scroll-behavior: smooth;
    scrollbar-width: thin;
`;

const SelectedArg = styled(Typography)`
    background-color: var(--vscode-list-activeSelectionBackground);
    color: var(--vscode-list-activeSelectionForeground);
    font-weight: 600;
    padding-inline: 4px;
    margin-inline: 2px;
    border-radius: 4px;
    margin-block: 0;
`;

const FnSignatureDocumentationBody = styled.div`
    display: flex;
    flex-direction: column;
    margin-inline: 16px;
    max-height: 250px;
    overflow-y: auto;
    scroll-behavior: smooth;
    scrollbar-width: thin;
`;

export const FnSignatureEl = forwardRef<HTMLDivElement, FnSignatureElProps>((props, ref) => {
    const { label, args, currentArgIndex, documentation, sx, editorWidth } = props;
    const selectedArgRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        if (selectedArgRef.current) {
            selectedArgRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [currentArgIndex]);

    const getDescriptionElement = (documentation: FnSignatureDocumentation) => {
        let fnDescriptionEl: ReactNode | undefined;
        let argsDescriptionEl: ReactNode | undefined;

        /* Create function description element */
        if (documentation.fn && typeof documentation.fn === 'string') {
            fnDescriptionEl = <Typography variant="body3">{documentation.fn}</Typography>;
        } else if (documentation.fn && React.isValidElement(documentation.fn)) {
            fnDescriptionEl = documentation.fn;
        }

        /* Create args description element */
        if (documentation.args && typeof documentation.args === 'string') {
            argsDescriptionEl = <Typography variant="body3">{documentation.args}</Typography>;
        } else if (documentation.args && React.isValidElement(documentation.args)) {
            argsDescriptionEl = documentation.args;
        }

        return (
            <>
                <Divider />
                <FnSignatureDocumentationBody>
                    {fnDescriptionEl}
                    {argsDescriptionEl && (
                        <>
                            <Typography variant="body3" sx={{ fontWeight: "bold" }}>
                                Parameters
                            </Typography>
                            {argsDescriptionEl}
                        </>
                    )}
                </FnSignatureDocumentationBody>
            </>
        )
    }

    return (
        <>
            {label && (
                <FnSignatureBody ref={ref} sx={sx} editorWidth={editorWidth}>
                    <SyntaxBody>
                        <Typography variant="body3" sx={{ fontWeight: 600 }}>
                            {`${label}(`}
                        </Typography>
                        {args?.map((arg, index) => {
                            const lastArg = index === args.length - 1;
                            if (index === currentArgIndex) {
                                return (
                                    <Fragment key={`arg-${index}`}>
                                        <SelectedArg ref={selectedArgRef}>{arg}</SelectedArg>
                                        {!lastArg && <Typography variant="body3">{`, `}</Typography>}
                                    </Fragment>
                                );
                            }
                            return (
                                <Typography key={`arg-${index}`} variant="body3">
                                    {`${arg}${lastArg ? '' : ', '}`}
                                </Typography>
                            );
                        })}
                        <Typography variant="body3" sx={{ fontWeight: 600 }}>{`)`}</Typography>
                    </SyntaxBody>
                    {documentation && getDescriptionElement(documentation)}
                </FnSignatureBody>
            )}
        </>
    );
});
FnSignatureEl.displayName = 'FnSignatureEl';
