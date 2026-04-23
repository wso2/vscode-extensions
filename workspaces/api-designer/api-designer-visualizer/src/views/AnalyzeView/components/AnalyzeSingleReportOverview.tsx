import React from 'react';
import styled from '@emotion/styled';

interface AnalyzeSingleReportOverviewProps {
    score: number;
    gradeColor: string;
    stats: {
        errors: number;
        warnings: number;
        endpointCount: number;
        rulesCount: number;
    };
    totalIssues: number;
    passedChecks: number;
    totalChecks: number;
}

const SectionBlock = styled.div`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    background: var(--vscode-sideBar-background);
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
    box-sizing: border-box;
`;

const CardTopRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 4px;
`;

const OverviewTitle = styled.div`
    font-size: 16px;
    font-weight: 700;
    color: var(--vscode-foreground);
`;

const ScorePill = styled.div<{ $color: string }>`
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    background: transparent;
    border: 1px solid ${({ $color }: { $color: string }) => $color};
    color: ${({ $color }: { $color: string }) => $color};
`;

const ScoreHero = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 24px 16px;
    border: 1px solid var(--vscode-panel-border);
    background: var(--vscode-editorWidget-background);
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const ScoreNumberRow = styled.div<{ $color: string }>`
    font-size: 36px;
    font-weight: 700;
    line-height: 1;
    color: ${({ $color }: { $color: string }) => $color};
    display: flex;
    align-items: baseline;
`;

const ScorePercentSuffix = styled.span`
    font-size: 20px;
    font-weight: 600;
    margin-left: 2px;
`;

const ScoreCaption = styled.div`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
`;

const MetricsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px;
`;

const MetricTile = styled.div<{ $accent: string }>`
    border: 1px solid var(--vscode-panel-border);
    border-left: 3px solid ${({ $accent }: { $accent: string }) => $accent};
    border-radius: 6px;
    padding: 12px;
    background: var(--vscode-editorWidget-background);
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const MetricLabel = styled.div`
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--vscode-descriptionForeground);
`;

const MetricValue = styled.div`
    font-size: 24px;
    font-weight: 700;
    color: var(--vscode-foreground);
`;

const MetricSub = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
`;

const MetricProgressTrack = styled.div`
    width: 100%;
    height: 4px;
    background: var(--vscode-input-background);
    border-radius: 2px;
    overflow: hidden;
`;

const MetricProgressFill = styled.div<{ $pct: number; $fillColor: string }>`
    width: ${({ $pct }: { $pct: number }) => Math.max(0, Math.min(100, $pct))}%;
    height: 100%;
    background: ${({ $fillColor }: { $fillColor: string }) => $fillColor};
`;

export const AnalyzeSingleReportOverview: React.FC<AnalyzeSingleReportOverviewProps> = ({
    score,
    gradeColor,
    stats,
    totalIssues,
    passedChecks,
    totalChecks,
}) => {
    const checksPassedPct = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
    const errorPct = totalIssues > 0 ? Math.round((stats.errors / totalIssues) * 100) : 0;
    const warningPct = totalIssues > 0 ? Math.round((stats.warnings / totalIssues) * 100) : 0;

    return (
        <SectionBlock>
            <CardTopRow>
                <OverviewTitle>Overview</OverviewTitle>
                <ScorePill $color={gradeColor}>{Math.round(score)}% Score</ScorePill>
            </CardTopRow>

            <ScoreHero>
                <ScoreNumberRow $color={gradeColor}>
                    {Math.round(score)}
                    <ScorePercentSuffix>%</ScorePercentSuffix>
                </ScoreNumberRow>
                <ScoreCaption>API Readiness Score</ScoreCaption>
            </ScoreHero>

            <MetricsGrid>
                <MetricTile $accent="var(--vscode-testing-iconPassed, #22c55e)">
                    <MetricLabel>Checks Passed</MetricLabel>
                    <MetricValue>{passedChecks}/{totalChecks}</MetricValue>
                    <MetricProgressTrack>
                        <MetricProgressFill $pct={checksPassedPct} $fillColor="var(--vscode-testing-iconPassed, #22c55e)" />
                    </MetricProgressTrack>
                    <MetricSub>{checksPassedPct}% pass rate</MetricSub>
                </MetricTile>

                <MetricTile $accent="var(--vscode-errorForeground)">
                    <MetricLabel>Errors</MetricLabel>
                    <MetricValue>{stats.errors}</MetricValue>
                    <MetricProgressTrack>
                        <MetricProgressFill $pct={errorPct} $fillColor="var(--vscode-errorForeground)" />
                    </MetricProgressTrack>
                    <MetricSub>Severity 0 · Critical</MetricSub>
                </MetricTile>

                <MetricTile $accent="var(--vscode-editorWarning-foreground)">
                    <MetricLabel>Warnings</MetricLabel>
                    <MetricValue>{stats.warnings}</MetricValue>
                    <MetricProgressTrack>
                        <MetricProgressFill $pct={warningPct} $fillColor="var(--vscode-editorWarning-foreground)" />
                    </MetricProgressTrack>
                    <MetricSub>Severity 1 · Advisory</MetricSub>
                </MetricTile>

                <MetricTile $accent="var(--vscode-focusBorder)">
                    <MetricLabel>Endpoints Affected</MetricLabel>
                    <MetricValue>{stats.endpointCount}</MetricValue>
                    <MetricSub>of all defined paths</MetricSub>
                </MetricTile>

            </MetricsGrid>
        </SectionBlock>
    );
};
