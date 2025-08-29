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

/* eslint-disable arrow-parens, react/prop-types */
import React, {
    cloneElement,
    isValidElement,
    ReactNode,
    ReactElement,
} from "react";
import { createPortal } from "react-dom";
import styled from "@emotion/styled";
import { ThemeColors } from "../../styles";
import { Codicon } from "../Codicon/Codicon";
import { Divider } from "../Divider/Divider";

export type DynamicModalProps = {
    children: ReactNode;
    onClose?: () => void;
    title: string;
    anchorRef: React.RefObject<HTMLDivElement>;
    width?: number;
    height?: number;
    openState: boolean;
    setOpenState: (state: boolean) => void;
};

const Overlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 30000 !important;
    display: flex;
    justify-content: center;
    align-items: center;
`;

const ModalBox = styled.div<{ width?: number; height?: number }>`
    width: ${({ width }: { width: number }) => (width ? `${width}px` : "auto")};
    height: ${({ height }: { height: number }) => (height ? `${height}px` : "auto")};
    background-color: ${ThemeColors.PRIMARY_CONTAINER};
    position: relative;
    padding: 10px;
    display: flex;
    flex-direction: column;
    overflow-y: hidden;
    border-radius: 8px;
`;

const InvisibleButton = styled.button`
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    text-align: inherit;
    color: inherit;
    font: inherit;
    cursor: pointer;
    outline: none;
    box-shadow: none;
    appearance: none;
    display: inline-flex;
    align-items: center;
`;

const Title = styled.h1`
    font-size: 1.5rem;
    font-weight: 600;
    margin-left: 20px;
    margin-top: 10px;
    margin-bottom: 10px;
`;

type TriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: ReactNode;
};

const Trigger: React.FC<TriggerProps> = ({ children, ...rest }) => (
    <InvisibleButton {...rest}>{children}</InvisibleButton>
);

export const DynamicModal: React.FC<DynamicModalProps> & {
    Trigger: typeof Trigger;
} = ({ children, onClose, title, anchorRef, width, height, openState, setOpenState }) => {
    let trigger: ReactElement | null = null;
    const content: ReactNode[] = [];

    React.Children.forEach(children, (child) => {
        if (isValidElement(child) && child.type === DynamicModal.Trigger) {
            trigger = cloneElement(child as React.ReactElement, {
                onClick: () => setOpenState(true),
            });
        } else {
            content.push(child);
        }
    });

    const handleClose = () => {
        setOpenState(false);
        onClose && onClose();
    };

    return (
        <>
            {trigger}
            {openState &&
                createPortal(
                    <Overlay className="unq-modal-overlay" ref={anchorRef} role="presentation">
                        <ModalBox width={width} height={height} role="dialog" aria-modal="true" aria-labelledby="modal-title">
                            <InvisibleButton
                                onClick={handleClose}
                                aria-label="Close modal"
                                style={{ position: "absolute", top: 8, right: 8 }}
                            >
                                <Codicon name="close" />
                            </InvisibleButton>
                            <Title id="modal-title">{title}</Title>
                            <Divider />
                            <div>{content}</div>
                        </ModalBox>
                    </Overlay>,
                    document.body
                )}
        </>
    );
};

DynamicModal.Trigger = Trigger;
