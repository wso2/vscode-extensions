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

import styled from '@emotion/styled';
import React, { forwardRef } from 'react';
import { HeaderExpressionEditorRef, HeaderExpressionEditorProps } from '../../types/header';
import { ExpressionEditor } from './ExpressionEditor';
import { Button } from '../../../Button/Button';
import { Codicon } from '../../../Codicon/Codicon';
import { ThemeColors } from '../../../../styles';

// Styled Components
namespace Ex {
    export const Container = styled.div`
        width: 100%;
        display: flex;
        color: var(--vscode-foreground);
        align-items: center;
        min-height: 32px;
        gap: 8px;
        box-sizing: border-box;

        * {
            box-sizing: border-box;
        }
    `;

    export const ExpressionBox = styled.div`
        display: flex;
        flex: 1 1 auto;
    `;
}

export const HeaderExpressionEditorWrapper = forwardRef<HeaderExpressionEditorRef, HeaderExpressionEditorProps>((props, ref) => {
    const { id, onRemove, ...rest } = props;

    return (
        <Ex.Container id={id}>
            <Ex.ExpressionBox>
                <ExpressionEditor ref={ref} {...rest} />
            </Ex.ExpressionBox>
            {onRemove && (
                <Button appearance="icon" onClick={onRemove} tooltip="Remove Expression">
                    <Codicon name="trash" sx={{ color: ThemeColors.ERROR }} />
                </Button>
            )}
        </Ex.Container>
    );
});
HeaderExpressionEditorWrapper.displayName = 'HeaderExpressionEditorWrapper';
