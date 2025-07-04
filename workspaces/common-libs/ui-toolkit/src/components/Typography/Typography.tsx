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
import React, { forwardRef, PropsWithChildren } from "react";
import ProgressRing from "../ProgressRing/ProgressRing";
import { ThemeColors } from "../../styles";

const removeMargin = {
    margin: 'unset'
}

const Subtitle1 = styled.p`
    font-weight: normal;
    font-size: 16px;
    letter-spacing: 0.15px;
    ${removeMargin};
`;

const Subtitle2 = styled.p`
    font-weight: bold;
    font-size: 14px;
    letter-spacing: 0.09px;
    ${removeMargin};
`;

const Body1 = styled.p`
    font-weight: normal;
    font-size: 16px;
    letter-spacing: 0.15px;
    ${removeMargin};
`;

const Body2 = styled.p`
    font-weight: normal;
    font-size: 14px;
    letter-spacing: 0.149px;
    ${removeMargin};
`;

const Body3 = styled.p`
    font-weight: normal;
    font-size: 13px;
    ${removeMargin};
`;

const Button = styled.p`
    font-weight: bold;
    font-size: 14px;
    letter-spacing: 0.39px;
    text-transform: uppercase;
    ${removeMargin};
`;

const Caption = styled.p`
    font-weight: normal;
    font-size: 12px;
    letter-spacing: 0.39px;
    ${removeMargin};
`;

const Overline = styled.p`
    font-weight: normal;
    font-size: 10px;
    letter-spacing: 0.99px;
    text-transform: uppercase;
    ${removeMargin};
`;

const ProgressText = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

export interface TypographyBaseProps {
    id?: string;
    className?: string;
    variant?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
    | "subtitle1" | "subtitle2"
    | "body1" | "body2" | "body3"
    | "button"
    | "caption"
    | "overline"
    | "progress";
    sx?: any;
}

export type TypographyProps = PropsWithChildren<TypographyBaseProps>;

export const Typography = forwardRef<HTMLParagraphElement, TypographyProps>((props, ref) => {
    const { id, className, children, variant, sx } = props;

    switch (variant) {
        case "h1":
            return <h1 ref={ref} id={id} className={className} style={sx}>{children}</h1>;
        case "h2":
            return <h2 ref={ref} id={id} className={className} style={sx}>{children}</h2>;
        case "h3":
            return <h3 ref={ref} id={id} className={className} style={sx}>{children}</h3>;
        case "h4":
            return <h4 ref={ref} id={id} className={className} style={sx}>{children}</h4>;
        case "h5":
            return <h5 ref={ref} id={id} className={className} style={sx}>{children}</h5>;
        case "h6":
            return <h6 ref={ref} id={id} className={className} style={sx}>{children}</h6>;
        case "subtitle1":
            return <Subtitle1 ref={ref} id={id} className={className} style={sx}>{children}</Subtitle1>;
        case "subtitle2":
            return <Subtitle2 ref={ref} id={id} className={className} style={sx}>{children}</Subtitle2>;
        case "body1":
            return <Body1 ref={ref} id={id} className={className} style={sx}>{children}</Body1>;
        case "body2":
            return <Body2 ref={ref} id={id} className={className} style={sx}>{children}</Body2>;
        case "body3":
            return <Body3 ref={ref} id={id} className={className} style={sx}>{children}</Body3>;
        case "button":
            return <Button ref={ref} id={id} className={className} style={sx}>{children}</Button>;
        case "caption":
            return <Caption ref={ref} id={id} className={className} style={sx}>{children}</Caption>;
        case "overline":
            return <Overline ref={ref} id={id} className={className} style={sx}>{children}</Overline>;
        case "progress":
            return <ProgressText ref={ref} id={id} className={className} style={sx}><ProgressRing sx={{ width: 14, height: 14 }} color={ThemeColors.ON_PRIMARY} />{children}</ProgressText>;
        default:
            return <p ref={ref} id={id} className={className} style={sx}>{children}</p>;
    }
});

Typography.displayName = "Typography";

export default Typography;
