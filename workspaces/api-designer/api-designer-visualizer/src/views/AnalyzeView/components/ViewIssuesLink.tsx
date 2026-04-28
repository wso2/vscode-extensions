import styled from '@emotion/styled';
import { LinkButton } from '@wso2/ui-toolkit';
import { ANALYZE_TYPE_SCALE } from './AnalyzeSingleReportHelpers';

/** Shared "View issues" link-style action for Analyze cards. */
export const ViewIssuesLink = styled.button`
    font-size: ${ANALYZE_TYPE_SCALE.md};
    color: var(--vscode-textLink-foreground);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    font-family: inherit;
    white-space: nowrap;
    &:hover { text-decoration: underline; }
`;
