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
import { Typography } from '@wso2/ui-toolkit';
import styled from "@emotion/styled";
import { Info as I } from '../../../Definitions/ServiceDefinitions';
import ReactMarkdown from 'react-markdown';
import { ReadOnlyContact } from '../Contact/ReadOnlyContact';
import { ReadOnlyLicense } from '../License/ReadOnlyLisense';
import { css, cx } from '@emotion/css';

export const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const DescriptionWrapper = styled.div`
    display: flex;
    flex-direction: column;
`;

export const Markdown = cx(css`
    /* add paragraph styles */
    p {
        margin: 0;
    }
`);


interface MarkdownRendererProps {
    markdownContent: string;
    className?: string;
}
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ markdownContent, className }) => {
    return <ReactMarkdown className={className ? className : Markdown}>{markdownContent}</ReactMarkdown>;
};

interface ReadOnlyInfoProps {
    info: I;
}

// Title, Vesrion are mandatory fields
export function ReadOnlyInfo(props: ReadOnlyInfoProps) {
    const { info } = props;

    return (
        <>
            {info?.title && (
                <>
                    <Typography sx={{ margin: 0 }} variant="h3">Title</Typography>
                    <Typography sx={{ margin: 0, fontWeight: "lighter" }} variant='body3'>{info?.title}</Typography>
                </>
            )}
            {info?.version && (
                <>
                    <Typography sx={{ margin: 0 }} variant="h3">Version</Typography>
                    <Typography sx={{ margin: 0, fontWeight: "lighter" }} variant='body3'>{info?.version}</Typography>
                </>
            )}
            {info?.summary && (
                <>
                    <Typography sx={{ margin: 0 }} variant="h3">Summary</Typography>
                    <Typography sx={{ margin: 0, fontWeight: "lighter" }} variant='body3'>{info?.summary}</Typography>
                </>
            )}
            {info?.description && (
                <DescriptionWrapper>
                    <Typography sx={{ margin: "0 0 10px 0" }} variant='h3'> Description </Typography>
                    <Typography sx={{ margin: 0, fontWeight: "lighter" }} variant='body3'>
                        <MarkdownRenderer key="description" markdownContent={info?.description} />
                    </Typography>
                </DescriptionWrapper>
            )}
            {info?.contact && (
                <ReadOnlyContact
                    contact={info.contact}
                />
            )}
            {info?.license && (
                <ReadOnlyLicense
                    license={info.license}
                />
            )}
        </>
    )
}
