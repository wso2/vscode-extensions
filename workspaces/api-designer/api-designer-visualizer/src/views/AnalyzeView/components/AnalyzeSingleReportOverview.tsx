import React from 'react';
import styled from '@emotion/styled';
import { scoreColor } from '../hooks/useReport';
import { ViewIssuesLink } from './ViewIssuesLink';
import { ANALYZE_TYPE_SCALE } from './AnalyzeSingleReportHelpers';

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

const OverviewRow = styled.div`
    background: linear-gradient(180deg, rgba(122, 162, 255, 0.05) 0%, rgba(122, 162, 255, 0.02) 100%);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 12px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
    padding: 14px;
    display: grid;
    grid-template-columns: 180px 1fr;
    gap: 14px;
    align-items: stretch;

    @media (max-width: 800px) {
        grid-template-columns: 1fr;
        justify-items: center;
    }
`;

const GradeCard = styled.div`
    padding: 6px 2px 6px 4px;
    text-align: center;
    min-width: 178px;
    height: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: center;
`;

const GradeLabel = styled.div`
    font-size: ${ANALYZE_TYPE_SCALE.xs};
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 6px;
`;

const GradeRing = styled.div<{ $score: number; $ringColor: string }>`
    --score: ${({ $score }: { $score: number }) => $score};
    --ring-color: ${({ $ringColor }: { $ringColor: string }) => $ringColor};
    width: 132px;
    height: 132px;
    margin: 0 auto 6px;
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
    width: 96px;
    height: 96px;
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
    font-size: ${ANALYZE_TYPE_SCALE.score};
    font-weight: 900;
    color: ${({ $color }: { $color: string }) => $color};
    font-family: var(--vscode-font-family, "Inter", "Segoe UI", Arial, sans-serif);
    line-height: 1;
`;

const MetaBlock = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const ReportTitle = styled.h1`
    margin: 0 0 6px;
    font-size: ${ANALYZE_TYPE_SCALE.xl};
    font-weight: 700;
    color: var(--vscode-foreground);
    line-height: 1.2;
    letter-spacing: -0.01em;
`;

const ReportSubtitle = styled.div`
    font-size: ${ANALYZE_TYPE_SCALE.md};
    color: var(--vscode-descriptionForeground);
    line-height: 1.35;
`;

const MetricsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;

    @media (max-width: 900px) {
        grid-template-columns: repeat(2, 1fr);
    }
`;

const MetricCard = styled.div`
    background: color-mix(in srgb, var(--vscode-editorWidget-background) 96%, #0b1220);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    min-height: 86px;
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
    font-size: ${ANALYZE_TYPE_SCALE.xs};
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 6px;
`;

const MetricDescription = styled.div`
    font-size: ${ANALYZE_TYPE_SCALE.xs};
    line-height: 1.25;
    color: var(--vscode-descriptionForeground);
    min-height: 24px;
    margin-bottom: 8px;
`;

const MetricValue = styled.div<{ $color?: string }>`
    font-size: ${ANALYZE_TYPE_SCALE.metric};
    font-weight: 800;
    color: ${({ $color }: { $color?: string }) => $color || 'var(--vscode-foreground)'};
    line-height: 1;
    font-family: var(--vscode-font-family, "Inter", "Segoe UI", Arial, sans-serif);
    display: flex;
    align-items: baseline;
    gap: 4px;
`;

const MetricSuffix = styled.span`
    font-size: ${ANALYZE_TYPE_SCALE.base};
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
                        <MetricDescription>Completed checks out of the total checks run</MetricDescription>
                        <MetricValueRow>
                            <MetricValue $color={passedChecksColor}>
                                {passedChecks}
                                <MetricInlineTotal>/{totalChecks}</MetricInlineTotal>
                            </MetricValue>
                        </MetricValueRow>
                    </MetricCard>

                    <MetricCard>
                        <MetricLabel>Affected Endpoints</MetricLabel>
                        <MetricDescription>Endpoints impacted by one or more findings</MetricDescription>
                        <MetricValueRow>
                            <MetricValue $color={endpointsColor}>{endpointsAffected}</MetricValue>
                            {onViewEndpointIssues && endpointsAffected > 0 && (
                                <ViewIssuesLink onClick={onViewEndpointIssues}>View issues</ViewIssuesLink>
                            )}
                        </MetricValueRow>
                    </MetricCard>

                    <MetricCard>
                        <MetricLabel>Errors</MetricLabel>
                        <MetricDescription>Issues that require immediate attention</MetricDescription>
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
                        <MetricDescription>Potential risks and improvement opportunities</MetricDescription>
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
