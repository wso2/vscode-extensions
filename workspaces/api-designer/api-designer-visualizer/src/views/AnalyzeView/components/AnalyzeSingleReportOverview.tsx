import React from 'react';
import styled from '@emotion/styled';
import { scoreGrade } from '../hooks/useReport';

interface AnalyzeSingleReportOverviewProps {
    score: number;
    gradeColor: string;
    title: string;
    subtitle?: string;
    totalIssues: number;
    passedChecks: number;
    totalChecks: number;
}

// ── Overview grid: grade card left | meta + metrics right ─────────────────

const OverviewRow = styled.div`
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 14px;
    align-items: start;

    @media (max-width: 800px) {
        grid-template-columns: 1fr;
    }
`;

// ── Grade card ─────────────────────────────────────────────────────────────

const GradeCard = styled.div<{ $topColor: string }>`
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border);
    border-top: 3px solid ${({ $topColor }: { $topColor: string }) => $topColor};
    border-radius: 10px;
    padding: 16px 20px;
    text-align: center;
    min-width: 178px;
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
    font-size: 36px;
    font-weight: 900;
    color: ${({ $color }: { $color: string }) => $color};
    font-family: var(--vscode-editor-font-family, ui-monospace, monospace);
    line-height: 1;
`;

const GradeScore = styled.div`
    margin-top: 4px;
    font-size: 11px;
    font-weight: 700;
    color: var(--vscode-descriptionForeground);
    letter-spacing: 0.03em;
`;

// ── Right column ───────────────────────────────────────────────────────────

const MetaBlock = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

const ReportTitle = styled.h1`
    margin: 0 0 2px;
    font-size: 17px;
    font-weight: 700;
    color: var(--vscode-foreground);
    line-height: 1.2;
    letter-spacing: -0.01em;
`;

const ReportSubtitle = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
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

const MetricCard = styled.div<{ $topColor: string }>`
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border);
    border-top: 3px solid ${({ $topColor }: { $topColor: string }) => $topColor};
    border-radius: 10px;
    padding: 16px 18px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
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
    font-size: 24px;
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

// ── Component ──────────────────────────────────────────────────────────────

export const AnalyzeSingleReportOverview: React.FC<AnalyzeSingleReportOverviewProps> = ({
    score,
    gradeColor,
    title,
    subtitle,
    totalIssues,
    passedChecks,
    totalChecks,
}) => {
    const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
    const grade = scoreGrade(normalizedScore);

    return (
        <OverviewRow>
            <GradeCard $topColor={gradeColor}>
                <GradeLabel>API Score</GradeLabel>
                <GradeRing $score={normalizedScore} $ringColor={gradeColor}>
                    <GradeRingInner />
                    <GradeCenter>
                        <GradeLetter $color={gradeColor}>{grade}</GradeLetter>
                        <GradeScore>{normalizedScore}&thinsp;/&thinsp;100</GradeScore>
                    </GradeCenter>
                </GradeRing>
            </GradeCard>

            <MetaBlock>
                <div>
                    <ReportTitle>{title}</ReportTitle>
                    {subtitle && <ReportSubtitle>{subtitle}</ReportSubtitle>}
                </div>

                <MetricsGrid>
                    <MetricCard $topColor={gradeColor}>
                        <MetricLabel>Score</MetricLabel>
                        <MetricValue $color={gradeColor}>
                            {normalizedScore}
                            <MetricSuffix>/100</MetricSuffix>
                        </MetricValue>
                    </MetricCard>

                    <MetricCard $topColor="var(--vscode-testing-iconPassed, #10B981)">
                        <MetricLabel>Passed Checks</MetricLabel>
                        <MetricValue $color="var(--vscode-testing-iconPassed, #10B981)">
                            {passedChecks}
                        </MetricValue>
                    </MetricCard>

                    <MetricCard $topColor="var(--vscode-panel-border)">
                        <MetricLabel>Total Checks</MetricLabel>
                        <MetricValue>{totalChecks}</MetricValue>
                    </MetricCard>

                    <MetricCard $topColor={totalIssues > 0 ? 'var(--vscode-errorForeground)' : 'var(--vscode-testing-iconPassed, #10B981)'}>
                        <MetricLabel>Issues</MetricLabel>
                        <MetricValue $color={totalIssues > 0 ? 'var(--vscode-errorForeground)' : 'var(--vscode-testing-iconPassed, #10B981)'}>
                            {totalIssues}
                        </MetricValue>
                    </MetricCard>
                </MetricsGrid>
            </MetaBlock>
        </OverviewRow>
    );
};
