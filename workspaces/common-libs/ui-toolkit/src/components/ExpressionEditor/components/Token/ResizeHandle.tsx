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

import React, { useCallback, useEffect, useRef } from 'react';

import styled from '@emotion/styled';

import { ResizeHandleProps } from '../../types';

/* Styles */
const StyledHandle = styled.div`
    position: absolute;
    bottom: 6px;
    right: 2px;
    width: 10px;
    height: 10px;
    background: linear-gradient(135deg, transparent 60%, var(--dropdown-border) 60%, transparent 70%),
        linear-gradient(135deg, transparent 80%, var(--dropdown-border) 80%, transparent 90%);
    background-size: 100% 100%;
    background-repeat: no-repeat;
    cursor: ns-resize;
`;

export const ResizeHandle = ({ editorRef }: ResizeHandleProps) => {
    const isResizing = useRef(false);

    const handleMouseDown = useCallback(() => {
        isResizing.current = true;
    }, []);

    const handleMouseUp = useCallback(() => {
        isResizing.current = false;
    }, []);

    const handleMouseMove = useCallback(
        (event: MouseEvent) => {
            if (isResizing.current && editorRef.current) {
                editorRef.current.style.height = `${
                    event.clientY - editorRef.current.getBoundingClientRect().top - editorRef.current.offsetTop
                }px`;
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [editorRef.current]
    );

    useEffect(() => {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    return <StyledHandle onMouseDown={handleMouseDown} />;
};
