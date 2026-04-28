import React from 'react';
import styled from '@emotion/styled';
import { scoreColor } from '../hooks/useReport';
import { ViewIssuesLink } from './ViewIssuesLink';

interface AnalyzeSingleReportOverviewProps {
    score: number;
    gradeColor: string;
    title: string;
    subtitle?: string;
    errorCount: number;
    warningCount: number;
    passedChecks: number;
    totalChecks: number;
    endpointsAffected: number;
    onViewEndpointIssues?: () => void;
    onViewErrorIssues?: () => void;
    onViewWarningIssues?: () => void;
}

// ── Overview grid: grade card left | meta + metrics right ─────────────────

const OverviewRow = styled.div`
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 14px;
    align-items: stretch;

    @media (max-width: 800px) {
        grid-template-columns: 1fr;
    }
`;

// ── Grade card ─────────────────────────────────────────────────────────────

const GradeCard = styled.div`
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 10px;
    padding: 16px 20px;
    text-align: center;
    min-width: 178px;
    height: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: center;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
`;

const GradeLabel = styled.div`
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 8px;
`;

const GradeRing = styled.div<{ $score: number; $ringColor: string }>`
    --score: ${({ $score }: { $score: number }) => $score};
    --ring-color: ${({ $ringColor }: { $ringColor: string }) => $ringColor};
    width: 118px;
    height: 118px;
    margin: 0 auto 8px;
    border-radius: 50%;
    background:
        radial-gradient(circle at center, var(--vscode-editorWidget-background) 56%, transparent 57%),
        conic-gradient(var(--ring-color) calc(var(--score) * 1%), var(--vscode-panel-border) 0);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
`;

const GradeRingInner = styled.div`
    position: absolute;
    width: 84px;
    height: 84px;
    border-radius: 50%;
    border: 1px solid var(--vscode-panel-border);
    background: var(--vscode-editorWidget-background);
`;

const GradeCenter = styled.div`
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1;
`;

const GradeLetter = styled.div<{ $color: string }>`
    font-size: 24px;
    font-weight: 900;
    color: ${({ $color }: { $color: string }) => $color};
    font-family: var(--vscode-editor-font-family, ui-monospace, monospace);
    line-height: 1;
`;

// ── Right column ───────────────────────────────────────────────────────────

const MetaBlock = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

const ReportTitle = styled.h1`
    margin: 0 0 8px;
    font-size: 17px;
    font-weight: 700;
    color: var(--vscode-foreground);
    line-height: 1.2;
    letter-spacing: -0.01em;
`;

const ReportSubtitle = styled.div`
    font-size: 13px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.2;
`;

// ── Metrics grid ───────────────────────────────────────────────────────────

const MetricsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;

    @media (max-width: 900px) {
        grid-template-columns: repeat(2, 1fr);
    }
`;

const MetricCard = styled.div`
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 10px;
    padding: 16px 18px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    display: flex;
    flex-direction: column;
    height: 76px;
    box-sizing: border-box;
`;

const MetricValueRow = styled.div`
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 10px;
    margin-top: auto;
`;

const MetricLabel = styled.div`
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 10px;
`;

const MetricValue = styled.div<{ $color?: string }>`
    font-size: 18px;
    font-weight: 800;
    color: ${({ $color }: { $color?: string }) => $color || 'var(--vscode-foreground)'};
    line-height: 1;
    display: flex;
    align-items: baseline;
    gap: 4px;
`;

const MetricSuffix = styled.span`
    font-size: 14px;
    font-weight: 600;
    color: var(--vscode-descriptionForeground);
`;

const MetricInlineTotal = styled.span`
    font-size: inherit;
    font-weight: inherit;
    color: var(--vscode-descriptionForeground);
`;

// ── Component ──────────────────────────────────────────────────────────────

export const AnalyzeSingleReportOverview: React.FC<AnalyzeSingleReportOverviewProps> = ({
    score,
    gradeColor,
    title,
    subtitle,
    errorCount,
    warningCount,
    passedChecks,
    totalChecks,
    endpointsAffected,
    onViewEndpointIssues,
    onViewErrorIssues,
    onViewWarningIssues,
}) => {
    const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
    const passedRatioScore = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0;
    const passedChecksColor = scoreColor(passedRatioScore);
    const endpointsColor =
        endpointsAffected > 0
            ? 'var(--vscode-editorWarning-foreground)'
            : 'var(--vscode-testing-iconPassed, #10B981)';

    return (
        <OverviewRow>
            <GradeCard>
                <GradeLabel>API Score</GradeLabel>
                <GradeRing $score={normalizedScore} $ringColor={gradeColor}>
                    <GradeRingInner />
                    <GradeCenter>
                        <GradeLetter $color={gradeColor}>{normalizedScore}%</GradeLetter>
                    </GradeCenter>
                </GradeRing>
            </GradeCard>

            <MetaBlock>
                <div>
                    <ReportTitle>{title}</ReportTitle>
                    {subtitle && <ReportSubtitle>{subtitle}</ReportSubtitle>}
                </div>

                <MetricsGrid>
                    <MetricCard>
                        <MetricLabel>Passed Checks</MetricLabel>
                        <MetricValueRow>
                            <MetricValue $color={passedChecksColor}>
                                {passedChecks}
                                <MetricInlineTotal>/{totalChecks}</MetricInlineTotal>
                            </MetricValue>
                        </MetricValueRow>
                    </MetricCard>

                    <MetricCard>
                        <MetricLabel>Affected Endpoints</MetricLabel>
                        <MetricValueRow>
                            <MetricValue $color={endpointsColor}>{endpointsAffected}</MetricValue>
                            {onViewEndpointIssues && endpointsAffected > 0 && (
                                <ViewIssuesLink onClick={onViewEndpointIssues}>View issues</ViewIssuesLink>
                            )}
                        </MetricValueRow>
                    </MetricCard>

                    <MetricCard>
                        <MetricLabel>Errors</MetricLabel>
                        <MetricValueRow>
                            <MetricValue $color={errorCount > 0 ? 'var(--vscode-errorForeground)' : 'var(--vscode-testing-iconPassed, #10B981)'}>
                                {errorCount}
                            </MetricValue>
                            {onViewErrorIssues && errorCount > 0 && (
                                <ViewIssuesLink onClick={onViewErrorIssues}>View issues</ViewIssuesLink>
                            )}
                        </MetricValueRow>
                    </MetricCard>

                    <MetricCard>
                        <MetricLabel>Warnings</MetricLabel>
                        <MetricValueRow>
                            <MetricValue $color={warningCount > 0 ? 'var(--vscode-editorWarning-foreground)' : 'var(--vscode-testing-iconPassed, #10B981)'}>
                                {warningCount}
                            </MetricValue>
                            {onViewWarningIssues && warningCount > 0 && (
                                <ViewIssuesLink onClick={onViewWarningIssues}>View issues</ViewIssuesLink>
                            )}
                        </MetricValueRow>
                    </MetricCard>
                </MetricsGrid>
            </MetaBlock>
        </OverviewRow>
    );
};
