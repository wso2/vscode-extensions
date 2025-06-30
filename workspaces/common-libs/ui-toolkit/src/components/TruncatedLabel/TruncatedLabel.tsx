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
import React, { CSSProperties, PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';

export interface TruncatedLabelProps {
    style?: CSSProperties;
    className?: string;
}

const TruncatedLabelContainer = styled.span`
    display: inline-block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export const TruncatedLabel: React.FC<PropsWithChildren<TruncatedLabelProps>> = ({ children, ...props }) => {

    const containerRef = useRef(null);
    const [isTruncated, setIsTruncated] = useState(false);

    const title = useMemo(() => {
        const getTextContent = (children: React.ReactNode): string => {
            if (typeof children === 'string') return children;
            if (typeof children === 'number') return children.toString();
            if (!children) return '';

            if (Array.isArray(children)) {
                return children.map(child => getTextContent(child)).join(' ');
            }

            if (React.isValidElement(children)) {
                return getTextContent(children.props.children);
            }

            return '';
        };

        return getTextContent(children);
    }, [children]);

    useEffect(() => {
        if (containerRef.current) {
            setIsTruncated(containerRef.current.scrollWidth > containerRef.current.clientWidth);
        }
    }, [children]);

    return (
        <TruncatedLabelContainer {...props} title={isTruncated ? title : ''} ref={containerRef}>
            {children}
        </TruncatedLabelContainer>
    );
}
