function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function serializeForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function toUnifiedReport(input) {
  if (!input || typeof input !== 'object') return null;
  if (input.report && typeof input.report === 'object') return input.report;
  if (input.reportId && input.overview && input.breakdown) return input;
  return null;
}

function buildSpecSnippet(specLines, line, endLine) {
  if (!Array.isArray(specLines) || specLines.length === 0) return '';
  const start = Number.isFinite(line) ? Math.max(1, line) : 0;
  if (start <= 0) return '';
  const end = Number.isFinite(endLine) ? Math.max(start, endLine) : start;
  const from = Math.max(1, start - 1);
  const to = Math.min(specLines.length, end + 1);
  const width = String(to).length;
  const lines = [];
  for (let i = from; i <= to; i += 1) {
    const sourceLine = specLines[i - 1] == null ? '' : String(specLines[i - 1]);
    lines.push(`${String(i).padStart(width, ' ')} | ${sourceLine}`);
  }
  return lines.join('\n');
}

function normalizeIssueRows(report, specLines) {
  const map = report && report.violationsById && typeof report.violationsById === 'object'
    ? report.violationsById
    : {};
  return Object.values(map).map((item, index) => {
    const severity = item.severity || 'info';
    const path = item.displayPath || (Array.isArray(item.pathSegments) ? item.pathSegments.join(' > ') : 'Unknown path');
    const startLine = item.range && item.range.start && Number.isFinite(item.range.start.line)
      ? item.range.start.line + 1
      : (item.line || 0);
    const endLine = item.range && item.range.end && Number.isFinite(item.range.end.line)
      ? item.range.end.line + 1
      : startLine;
    return {
      id: item.id || `${item.rule || 'unknown'}:${index}`,
      rule: item.rule || 'unknown-rule',
      message: item.message || 'No message provided',
      severity,
      line: startLine,
      endLine,
      endpoint: item.endpoint || 'global',
      method: item.method || 'GLOBAL',
      path,
      description: item.description || '',
      fixSuggestion: item.fixSuggestion || '',
      breakdownKeys: Array.isArray(item.breakdownKeys) ? item.breakdownKeys : [],
      specSnippet: buildSpecSnippet(specLines, startLine, endLine),
    };
  });
}

function buildHtmlReport(payload, metadata) {
  const report = toUnifiedReport(payload);
  if (!report) {
    throw new Error('buildHtmlReport expects a unified report payload (or an object containing report)');
  }

  const reportTitle = metadata && metadata.title ? metadata.title : (report.title || 'WSO2 Spectral Report');
  const generatedAt = metadata && metadata.generatedAt ? metadata.generatedAt : new Date().toISOString();
  const specContent = (metadata && typeof metadata.specContent === 'string')
    ? metadata.specContent
    : (payload && typeof payload.specContent === 'string' ? payload.specContent : '');
  const specLines = specContent ? specContent.split(/\r?\n/) : [];
  const rows = normalizeIssueRows(report, specLines);
  const categories = report.breakdown && Array.isArray(report.breakdown.categories) ? report.breakdown.categories : [];

  const data = {
    report,
    rows,
    categories,
  };


  const scoreValue = report.overview && report.overview.score != null ? Number(report.overview.score) : 0;
  const normalizedScore = Math.max(0, Math.min(100, scoreValue));
  const grade = scoreValue >= 90 ? 'A' : scoreValue >= 75 ? 'B' : scoreValue >= 60 ? 'C' : scoreValue >= 40 ? 'D' : 'F';
  // Thresholds: A≥90 green, B≥75 blue, C≥60 amber, D≥40 orange, F<40 red
  // Must match the client-side scoreColor() function exactly.
  const gradeColor = scoreValue >= 90 ? '#10B981' : scoreValue >= 75 ? '#38BDF8' : scoreValue >= 60 ? '#EAB308' : scoreValue >= 40 ? '#F97316' : '#F43F5E';

  const reportId = report.reportId || 'rest-api-readiness';
  const breakdownTitle = report.breakdown && report.breakdown.title ? report.breakdown.title : 'Breakdown';
  const breakdownSubtitle =
    reportId === 'ai-readiness' ? 'Evaluate how well your API is prepared for AI agent consumption' :
    reportId === 'owasp'        ? 'Coverage across the OWASP API Security Top 10 (2023)' :
                                  'Compliance with WSO2 REST API design guidelines';
  const breakdownBadge =
    reportId === 'ai-readiness' ? `${categories.length} dimension${categories.length !== 1 ? 's' : ''}` :
                                  `${categories.length} categor${categories.length !== 1 ? 'ies' : 'y'}`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(reportTitle)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:          #0C0C10;
      --surface:     #141418;
      --surface-2:   #1C1C24;
      --surface-3:   #22222C;
      --border:      #282836;
      --border-2:    #343448;
      --text:        #E8E8F2;
      --text-2:      #9090B0;
      --text-3:      #525268;
      --accent:      #7C3AED;
      --accent-lt:   #A78BFA;
      --accent-bg:   rgba(124,58,237,0.10);
      --success:     #10B981;
      --success-bg:  rgba(16,185,129,0.10);
      --warn:        #F59E0B;
      --warn-bg:     rgba(245,158,11,0.10);
      --danger:      #F43F5E;
      --danger-bg:   rgba(244,63,94,0.10);
      --info:        #38BDF8;
      --info-bg:     rgba(56,189,248,0.10);
      --hint:        #A855F7;
      --hint-bg:     rgba(168,85,247,0.10);
      --shadow:      0 4px 24px rgba(0,0,0,0.50);
      --shadow-sm:   0 2px 8px  rgba(0,0,0,0.35);
      --r:           10px;
      --r-sm:        6px;
    }

    @media (prefers-color-scheme: light) {
      :root {
        --bg:          #F6F8FC;
        --surface:     #FFFFFF;
        --surface-2:   #F3F5FA;
        --surface-3:   #EDEFF6;
        --border:      #D9DEEA;
        --border-2:    #C9D0E3;
        --text:        #111827;
        --text-2:      #374151;
        --text-3:      #6B7280;
        --accent:      #7C3AED;
        --accent-lt:   #6D28D9;
        --accent-bg:   rgba(124,58,237,0.08);
        --success:     #059669;
        --success-bg:  rgba(5,150,105,0.10);
        --warn:        #D97706;
        --warn-bg:     rgba(217,119,6,0.10);
        --danger:      #DC2626;
        --danger-bg:   rgba(220,38,38,0.10);
        --info:        #0284C7;
        --info-bg:     rgba(2,132,199,0.10);
        --hint:        #9333EA;
        --hint-bg:     rgba(147,51,234,0.10);
        --shadow:      0 6px 24px rgba(15,23,42,0.08);
        --shadow-sm:   0 2px 10px rgba(15,23,42,0.08);
      }
      .grade-card {
        box-shadow: 0 0 0 1px rgba(17,24,39,0.03), 0 12px 22px rgba(15,23,42,0.10);
      }
      .grade-letter {
        text-shadow: 0 0 14px rgba(255, 255, 255, 0.55);
      }
      .spec-snippet {
        color: #1f2937;
      }
    }

    body {
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
      font-size: 14px;
      line-height: 1.5;
      min-height: 100vh;
    }

    /* ── Page shell ─────────────────────────────────────────── */
    .page { max-width: 1440px; margin: 0 auto; padding: 20px; }

    /* ── Top header bar ─────────────────────────────────────── */
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r);
      margin-bottom: 18px;
      box-shadow: var(--shadow-sm);
    }
    .topbar-left { display: flex; align-items: center; gap: 10px; }
    .status-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: var(--success);
      box-shadow: 0 0 8px var(--success);
      flex-shrink: 0;
    }
    .brand-name {
      font-size: 12px; font-weight: 700; letter-spacing: 0.06em;
      text-transform: uppercase; color: var(--text-2);
    }
    .topbar-divider { color: var(--border-2); font-size: 16px; user-select: none; }
    .topbar-label { font-size: 12px; color: var(--text-3); }
    .topbar-right { display: flex; align-items: center; gap: 10px; }
    .report-id {
      font-size: 11px; color: var(--text-3); font-family: ui-monospace, monospace;
    }
    .theme-toggle {
      width: 34px;
      height: 34px;
      border: 1px solid var(--border-2);
      border-radius: 8px;
      background: var(--surface-2);
      color: var(--text-2);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.12s, border-color 0.12s, color 0.12s;
    }
    .theme-toggle:hover { border-color: var(--accent-lt); color: var(--text); }
    .theme-toggle:focus { outline: none; border-color: var(--accent-lt); }
    .theme-icon { width: 18px; height: 18px; display: block; }
    .theme-icon-moon { display: none; }
    :root[data-theme="light"] .theme-icon-sun { display: none; }
    :root[data-theme="light"] .theme-icon-moon { display: block; }

    /* ── Overview row ───────────────────────────────────────── */
    .overview {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 14px;
      margin-bottom: 18px;
      align-items: start;
    }

    .grade-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-top: 3px solid ${gradeColor};
      border-radius: var(--r);
      padding: 16px 20px;
      text-align: center;
      min-width: 178px;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.02), 0 10px 24px rgba(0,0,0,0.45);
    }
    .grade-label {
      font-size: 9px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.12em; color: var(--text-3); margin-bottom: 8px;
    }
    .grade-progress {
      --score: ${normalizedScore};
      --ring-color: ${gradeColor};
      width: 118px;
      height: 118px;
      margin: 0 auto;
      border-radius: 50%;
      background:
        radial-gradient(circle at center, var(--surface) 56%, transparent 57%),
        conic-gradient(var(--ring-color) calc(var(--score) * 1%), #2b2b3a 0);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.03),
        0 0 0 3px rgba(255,255,255,0.01);
      margin-bottom: 8px;
    }
    .grade-progress::after {
      content: '';
      position: absolute;
      width: 84px;
      height: 84px;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.08);
      background: var(--surface);
    }
    .grade-center {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      line-height: 1;
    }
    .grade-letter {
      font-size: 44px;
      font-weight: 900;
      color: ${gradeColor};
      font-family: ui-monospace, SFMono-Regular, monospace;
      text-shadow: 0 0 18px rgba(0, 0, 0, 0.4);
    }
    .grade-score {
      margin-top: 4px;
      font-size: 11px;
      font-weight: 700;
      color: var(--text-2);
      letter-spacing: 0.03em;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }
    .metric-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r);
      padding: 16px 18px;
      box-shadow: var(--shadow-sm);
    }
    .metric-label {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.08em; color: var(--text-3); margin-bottom: 10px;
    }
    .metric-value {
      font-size: 30px; font-weight: 800; color: var(--text); line-height: 1;
    }


    /* ── Section shell ──────────────────────────────────────── */
    /* Section is now a transparent layout grouper — no card styling */
    .section { margin-bottom: 36px; }

    .section-header {
      display: flex; align-items: flex-end; justify-content: space-between;
      padding-bottom: 14px;
      margin-bottom: 18px;
      border-bottom: 2px solid var(--border);
    }
    .section-heading { display: flex; flex-direction: column; gap: 5px; }
    .section-title {
      font-size: 20px; font-weight: 800; color: var(--text);
      letter-spacing: -0.02em; line-height: 1.2;
    }
    .section-subtitle { font-size: 13px; color: var(--text-2); line-height: 1.5; }
    .section-badge {
      font-size: 12px; font-weight: 600; color: var(--text-2);
      white-space: nowrap; flex-shrink: 0;
    }

    /* Issue Explorer inner card (toolbar + issues layout) */
    .ie-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
    }

    /* ── Breakdown grid ─────────────────────────────────────── */
    .breakdown-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      padding: 0;
    }
    .bucket {
      background: var(--surface);
      border: 1px solid var(--border-2);
      border-left: 4px solid transparent; /* color set inline per severity */
      border-radius: var(--r-sm);
      padding: 14px 16px;
      display: flex; flex-direction: column; gap: 6px;
      box-shadow: var(--shadow-sm);
    }
    .bucket-id {
      font-size: 10px; font-family: ui-monospace, monospace;
      color: var(--text-3);
    }
    .bucket-title {
      font-size: 13px; font-weight: 700; color: var(--text); line-height: 1.4;
    }
    .bucket-desc {
      font-size: 12px; color: var(--text-2); line-height: 1.5; flex: 1;
    }
    .bucket-status-row {
      display: flex; align-items: center; justify-content: space-between;
      margin-top: 4px; padding-top: 10px;
      border-top: 1px solid var(--border);
    }
    .bucket-status-badge {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 11px; font-weight: 700;
      border-radius: 4px; padding: 2px 8px;
    }
    .bucket-status-badge.pass  { color: var(--success); background: var(--success-bg); }
    .bucket-status-badge.error { color: var(--danger);  background: var(--danger-bg);  }
    .bucket-status-badge.warn  { color: var(--warn);    background: var(--warn-bg);    }
    .bucket-status-badge.info  { color: var(--info);    background: var(--info-bg);    }
    .bucket-status-badge::before {
      content: ''; width: 5px; height: 5px; border-radius: 50%; background: currentColor;
    }
    .bucket-actions { display: flex; align-items: center; gap: 8px; }
    .link-btn {
      border: 1px solid var(--border-2); border-radius: 4px;
      background: transparent; color: var(--accent-lt);
      cursor: pointer; font-size: 11px; padding: 3px 9px;
      font-family: inherit; transition: background 0.12s, border-color 0.12s;
    }
    .link-btn:hover { background: var(--accent-bg); border-color: var(--accent-lt); }
    .bucket-docs-link {
      font-size: 11px; font-weight: 500; color: var(--accent-lt); text-decoration: none;
      display: inline-flex; align-items: center; gap: 3px;
      border: 1px solid var(--border-2); border-radius: 4px; padding: 2px 8px;
      transition: background 0.12s, border-color 0.12s;
    }
    .bucket-docs-link:hover { background: var(--accent-bg); border-color: var(--accent-lt); }

    /* ── AI Readiness: summary strip ───────────────────────── */
    .ai-summary-strip {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 1px; background: var(--border);
      border-bottom: 1px solid var(--border);
    }
    .ai-strip-seg {
      background: var(--surface-2); padding: 10px 14px 10px;
      display: flex; flex-direction: column; gap: 6px;
    }
    .ai-strip-top { display: flex; justify-content: space-between; align-items: baseline; }
    .ai-strip-name { font-size: 11px; font-weight: 600; color: var(--text-2); line-height: 1.3; }
    .ai-strip-pct { font-size: 16px; font-weight: 900; font-family: ui-monospace, monospace; flex-shrink: 0; }
    .ai-strip-bar { height: 3px; background: var(--border-2); border-radius: 2px; overflow: hidden; }
    .ai-strip-fill { height: 100%; border-radius: 2px; }

    /* ── AI Readiness accordion ─────────────────────────────── */
    .ai-accordion { display: flex; flex-direction: column; gap: 16px; padding: 0; }
    .ai-dim {
      border: 1px solid var(--border-2); border-radius: var(--r); overflow: hidden;
      box-shadow: var(--shadow-sm);
    }
    .ai-dim-header {
      display: flex; align-items: flex-start; gap: 16px;
      padding: 18px 20px; cursor: pointer; user-select: none;
      background: var(--surface-2);
    }
    .ai-dim-header:hover { background: var(--surface-3); }
    .ai-dim-score { font-size: 26px; font-weight: 900; min-width: 64px; line-height: 1; padding-top: 2px; font-family: ui-monospace, monospace; flex-shrink: 0; }
    .ai-dim-meta { flex: 1; min-width: 0; }
    .ai-dim-title { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 4px; display: flex; align-items: center; gap: 7px; }
    .ai-dim-icon { display: flex; align-items: center; opacity: 0.75; flex-shrink: 0; }
    .ai-dim-desc { font-size: 13px; color: var(--text-2); margin-bottom: 10px; line-height: 1.55; }
    .ai-dim-tags { display: flex; gap: 5px; flex-wrap: wrap; }
    .ai-dim-tag {
      font-size: 11px; color: var(--text-2);
      border: 1px solid var(--border-2); border-radius: 4px;
      padding: 2px 9px 2px 6px; background: var(--surface);
      display: inline-flex; align-items: center; gap: 5px;
    }
    .ai-tag-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .ai-dim-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; padding-top: 2px; }
    .ai-dim-issue-count { font-size: 12px; font-weight: 600; color: var(--text-2); white-space: nowrap; }
    .ai-dim-chevron { display: flex; align-items: center; color: var(--text-3); transition: transform 0.18s ease; }
    .ai-dim-chevron.open { transform: rotate(90deg); }
    .ai-dim-body {
      border-top: 2px solid var(--border-2);
      padding: 20px;
      display: flex; flex-direction: column; gap: 12px;
      background: var(--bg);
    }
    .ai-sub-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }

    /* Why it matters — always visible */
    .ai-why-label {
      font-size: 11px; font-weight: 600; color: var(--accent-lt);
      margin-bottom: 0; display: inline-flex; align-items: center;
    }
    .ai-why {
      margin-top: 6px; font-size: 13px; color: var(--text-2); line-height: 1.7;
      background: var(--surface-2); border: 1px solid var(--border-2);
      border-radius: var(--r-sm); padding: 12px 16px;
    }

    /* Sub-bucket rows */
    .ai-sub {
      background: var(--surface-2); border: 1px solid var(--border-2);
      border-radius: var(--r-sm); padding: 14px 16px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
    }
    .ai-sub-top { display: flex; align-items: baseline; margin-bottom: 2px; }
    .ai-sub-score { font-size: 18px; font-weight: 900; min-width: 56px; font-family: ui-monospace, monospace; flex-shrink: 0; }
    .ai-sub-name { font-size: 13px; font-weight: 700; color: var(--text); flex: 1; }
    .ai-sub-status { font-size: 12px; font-weight: 600; white-space: nowrap; }
    .ai-sub-status.passing { color: var(--success); }
    .ai-sub-status.issues  { color: var(--warn); }
    .ai-sub-desc {
      font-size: 12px; color: var(--text-2);
      margin: 5px 0 12px 56px;
      line-height: 1.6;
    }
    .ai-bar-row { display: flex; align-items: center; gap: 10px; }
    .ai-bar { flex: 1; height: 4px; background: var(--border-2); border-radius: 2px; overflow: hidden; }
    .ai-bar-fill { height: 100%; border-radius: 2px; }
    .ai-view-btn { font-size: 11px; color: var(--accent-lt); background: none; border: none; cursor: pointer; padding: 0; font-family: inherit; white-space: nowrap; }
    .ai-view-btn:hover { text-decoration: underline; }
    @media (max-width: 1100px) { .ai-sub-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 900px) { .ai-sub-grid { grid-template-columns: 1fr; } }
    @media (max-width: 900px) { .ai-summary-strip { grid-template-columns: repeat(2, 1fr); } }

    /* ── Issue Explorer toolbar ─────────────────────────────── */
    .toolbar {
      display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
    }
    .toolbar-sep { width: 1px; height: 20px; background: var(--border-2); flex-shrink: 0; }
    /* Severity filter pills */
    .sev-chip {
      display: inline-flex; align-items: center; gap: 6px;
      height: 32px; padding: 0 14px;
      border: 1px solid var(--border-2); border-radius: 8px;
      background: var(--surface-2); color: var(--text-2);
      cursor: pointer; font-size: 12px; font-weight: 600; font-family: inherit;
      transition: background 0.12s, color 0.12s, border-color 0.12s, box-shadow 0.12s;
      user-select: none;
    }
    .sev-chip:hover { background: var(--surface-3); color: var(--text); border-color: var(--accent-lt); }
    .sev-chip.active {
      background: var(--surface-3); color: var(--text);
      border-color: var(--accent-lt);
      box-shadow: 0 0 0 1px var(--accent-lt);
    }
    .sev-chip-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    /* Custom styled select */
    .toolbar-select {
      height: 32px; padding: 0 28px 0 10px;
      border: 1px solid var(--border-2); border-radius: 8px;
      background-color: var(--surface-2);
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 9px center;
      color: var(--text-2); font-size: 12px; font-family: inherit;
      outline: none; appearance: none; cursor: pointer;
      transition: border-color 0.12s;
    }
    .toolbar-select:focus { border-color: var(--accent-lt); }
    .toolbar-select option { background: var(--surface-2); }
    /* Search with icon */
    .search-wrap { position: relative; flex: 1; min-width: 160px; }
    .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-3); pointer-events: none; display: flex; }
    .toolbar-search {
      width: 100%; height: 32px;
      padding: 0 10px 0 32px;
      border: 1px solid var(--border-2); border-radius: 8px;
      background: var(--surface-2); color: var(--text);
      font-size: 12px; font-family: inherit; outline: none;
      transition: border-color 0.12s, background 0.12s;
    }
    .toolbar-search:focus { border-color: var(--accent-lt); background: var(--surface); }
    .toolbar-search::placeholder { color: var(--text-3); }

    /* ── Issue list / detail pane ───────────────────────────── */
    .issues-layout {
      display: grid;
      grid-template-columns: 5fr 4fr;
      min-height: 520px;
    }
    .issue-list {
      border-right: 1px solid var(--border);
      overflow-y: auto;
      max-height: 620px;
    }
    .group-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 16px;
      font-size: 11px; font-weight: 700; color: var(--text-2);
      background: var(--surface-2);
      border-bottom: 1px solid var(--border);
      border-top: 1px solid var(--border);
      position: sticky; top: 0; z-index: 1;
    }
    .group-header:first-child { border-top: none; }
    .group-count {
      font-size: 10px; font-weight: 600; color: var(--text-3);
      background: var(--surface-3); border: 1px solid var(--border);
      border-radius: 10px; padding: 1px 7px;
    }
    .issue-btn {
      display: block; width: 100%; text-align: left;
      border: none; border-bottom: 1px solid var(--border);
      background: transparent;
      padding: 12px 14px 12px 16px;
      cursor: pointer; color: var(--text);
      border-left: 3px solid transparent;
      transition: background 0.10s;
      font-family: inherit;
    }
    .issue-btn:hover { background: var(--surface-2); }

    /* severity left-border colours */
    .issue-btn.sev-error { border-left-color: var(--danger); }
    .issue-btn.sev-warn  { border-left-color: var(--warn);   }
    .issue-btn.sev-info  { border-left-color: var(--info);   }
    .issue-btn.sev-hint  { border-left-color: var(--hint);   }

    /* active (selected) states */
    .issue-btn.active                { background: var(--accent-bg);  border-left-color: var(--accent-lt); }
    .issue-btn.active.sev-error      { background: var(--danger-bg);  border-left-color: var(--danger); }
    .issue-btn.active.sev-warn       { background: var(--warn-bg);    border-left-color: var(--warn);   }
    .issue-btn.active.sev-info       { background: var(--info-bg);    border-left-color: var(--info);   }
    .issue-btn.active.sev-hint       { background: var(--hint-bg);    border-left-color: var(--hint);   }

    .issue-msg {
      font-size: 13px; font-weight: 600; color: var(--text);
      margin-bottom: 4px;
      display: -webkit-box; -webkit-line-clamp: 2;
      -webkit-box-orient: vertical; overflow: hidden;
    }
    .issue-path {
      font-size: 11px; color: var(--text-2);
      font-family: ui-monospace, monospace;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    /* ── Detail pane ────────────────────────────────────────── */
    .detail-pane {
      padding: 16px;
      overflow-y: auto;
      max-height: 620px;
    }
    .detail-empty {
      height: 100%; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      color: var(--text-3); font-size: 13px; gap: 6px; text-align: center;
    }
    .detail-empty-icon { font-size: 28px; opacity: 0.4; }

    .detail-title {
      font-size: 14px; font-weight: 700; color: var(--text);
      line-height: 1.4; margin-bottom: 10px;
    }
    .detail-sep {
      border: none; border-top: 1px solid var(--border); margin: 12px 0;
    }
    .dfield { margin-bottom: 10px; }
    .dfield-key {
      font-size: 9px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.10em; color: var(--text-3); margin-bottom: 4px;
    }
    .dfield-val {
      font-size: 12px; color: var(--text); line-height: 1.5;
      background: var(--surface-2); border: 1px solid var(--border);
      border-radius: var(--r-sm); padding: 7px 10px;
    }
    .dfield-val code {
      font-family: ui-monospace, SFMono-Regular, monospace; font-size: 11px;
    }
    .spec-snippet {
      margin: 0;
      white-space: pre;
      overflow-x: auto;
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: 11px;
      line-height: 1.6;
      color: var(--text-2);
      background: var(--surface-3);
      border-radius: var(--r-sm);
      padding: 12px 14px;
    }
    .fix-block {
      background: rgba(16,185,129,0.07);
      border: 1px solid rgba(16,185,129,0.22);
      border-radius: var(--r-sm); padding: 10px 12px; margin-bottom: 10px;
    }
    .fix-block .dfield-key { color: var(--success); }
    .fix-block .dfield-val {
      background: transparent; border: none; padding: 4px 0 0;
      color: #a7f3d0; /* overridden in light mode below */
    }
    :root[data-theme="light"] .fix-block {
      background: rgba(5,150,105,0.06);
      border-color: rgba(5,150,105,0.30);
    }
    :root[data-theme="light"] .fix-block .dfield-val { color: #065f46; }

    /* ── Severity badges ────────────────────────────────────── */
    .badge {
      display: inline-flex; align-items: center; gap: 5px;
      border-radius: 4px; padding: 2px 8px;
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .badge::before {
      content: ''; width: 5px; height: 5px; border-radius: 50%;
      background: currentColor; flex-shrink: 0;
    }
    .badge.error { color: var(--danger); background: var(--danger-bg); border: 1px solid rgba(244,63,94,0.30); }
    .badge.warn  { color: var(--warn);   background: var(--warn-bg);   border: 1px solid rgba(245,158,11,0.30); }
    .badge.info  { color: var(--info);   background: var(--info-bg);   border: 1px solid rgba(56,189,248,0.30); }
    .badge.hint  { color: var(--hint);   background: var(--hint-bg);   border: 1px solid rgba(168,85,247,0.30); }

    /* ── Responsive ─────────────────────────────────────────── */
    @media (max-width: 1100px) {
      .overview            { grid-template-columns: 1fr; }
      .metrics-grid        { grid-template-columns: repeat(2, 1fr); }
      .issues-layout       { grid-template-columns: 1fr; }
      .issue-list          { border-right: none; border-bottom: 1px solid var(--border); max-height: 320px; }
      .breakdown-grid      { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 800px) {
      .breakdown-grid      { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 700px) {
      .page                { padding: 12px; }
      .overview            { grid-template-columns: 1fr; }
      .metrics-grid        { grid-template-columns: repeat(2, 1fr); }
      .breakdown-grid      { grid-template-columns: 1fr; }
    }

    :root[data-theme="dark"] {
      --bg:          #0C0C10;
      --surface:     #141418;
      --surface-2:   #1C1C24;
      --surface-3:   #22222C;
      --border:      #32324A;
      --border-2:    #44446A;
      --text:        #E8E8F2;
      --text-2:      #9090B0;
      --text-3:      #525268;
      --accent:      #7C3AED;
      --accent-lt:   #A78BFA;
      --accent-bg:   rgba(124,58,237,0.10);
      --success:     #10B981;
      --success-bg:  rgba(16,185,129,0.10);
      --warn:        #F59E0B;
      --warn-bg:     rgba(245,158,11,0.10);
      --danger:      #F43F5E;
      --danger-bg:   rgba(244,63,94,0.10);
      --info:        #38BDF8;
      --info-bg:     rgba(56,189,248,0.10);
      --hint:        #A855F7;
      --hint-bg:     rgba(168,85,247,0.10);
      --shadow:      0 4px 24px rgba(0,0,0,0.50);
      --shadow-sm:   0 2px 8px  rgba(0,0,0,0.35);
    }
    :root[data-theme="light"] {
      --bg:          #ECEEF5;
      --surface:     #FFFFFF;
      --surface-2:   #F2F4FB;
      --surface-3:   #E6E9F4;
      --border:      #B4BCCE;
      --border-2:    #8F9BBB;
      --text:        #111827;
      --text-2:      #374151;
      --text-3:      #6B7280;
      --accent:      #7C3AED;
      --accent-lt:   #6D28D9;
      --accent-bg:   rgba(124,58,237,0.08);
      --success:     #059669;
      --success-bg:  rgba(5,150,105,0.10);
      --warn:        #D97706;
      --warn-bg:     rgba(217,119,6,0.10);
      --danger:      #DC2626;
      --danger-bg:   rgba(220,38,38,0.10);
      --info:        #0284C7;
      --info-bg:     rgba(2,132,199,0.10);
      --hint:        #9333EA;
      --hint-bg:     rgba(147,51,234,0.10);
      --shadow:      0 6px 24px rgba(15,23,42,0.14);
      --shadow-sm:   0 2px 10px rgba(15,23,42,0.12);
    }
    /* Light mode: accordion body needs an explicit darker well — var(--bg) is
       lighter than surface-2 in dark mode but darker in light mode, so override. */
    :root[data-theme="light"] .ai-dim-body { background: #DDE0EC; }
    :root[data-theme="light"] .ai-dim { border-color: var(--border-2); }
    :root[data-theme="light"] .ai-sub {
      background: #FFFFFF;
      border-color: var(--border);
      box-shadow: 0 1px 4px rgba(15,23,42,0.08);
    }
    :root[data-theme="light"] .section-header { border-bottom-color: var(--border-2); }
    :root[data-theme="light"] .ie-card { border-color: var(--border-2); }
    :root[data-theme="light"] .bucket { border-color: var(--border-2); background: #FFFFFF; }
    :root[data-theme="light"] .bucket-status-row { border-top-color: var(--border); }
    :root[data-theme="light"] .grade-card {
      box-shadow: 0 0 0 1px rgba(17,24,39,0.06), 0 12px 22px rgba(15,23,42,0.12);
    }
    :root[data-theme="light"] .grade-progress {
      background:
        radial-gradient(circle at center, #FFFFFF 56%, transparent 57%),
        conic-gradient(var(--ring-color) calc(var(--score) * 1%), #d1d5e8 0);
    }
    :root[data-theme="light"] .grade-letter { text-shadow: none; }
    :root[data-theme="light"] .spec-snippet { color: #1f2937; }
    :root[data-theme="light"] .ai-summary-strip { background: var(--border); }
    :root[data-theme="light"] .ai-strip-seg { background: var(--surface-2); }
  </style>
</head>
<body>
  <div class="page">

    <!-- Top bar -->
    <div class="topbar">
      <div class="topbar-left">
        <span class="status-dot"></span>
        <span class="brand-name">WSO2</span>
        <span class="topbar-divider">|</span>
        <span class="topbar-label">API Readiness Report</span>
      </div>
      <div class="topbar-right">
        <span class="report-id">report&nbsp;${escapeHtml(report.reportId || 'n/a')}</span>
        <button id="themeToggle" class="theme-toggle" type="button" aria-label="Toggle theme" title="Toggle theme">
          <svg class="theme-icon theme-icon-sun" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="4.25" stroke="currentColor" stroke-width="2"></circle>
            <path d="M12 2.5V5.25M12 18.75V21.5M21.5 12H18.75M5.25 12H2.5M18.72 5.28L16.78 7.22M7.22 16.78L5.28 18.72M18.72 18.72L16.78 16.78M7.22 7.22L5.28 5.28" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
          </svg>
          <svg class="theme-icon theme-icon-moon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M20 14.2A8.5 8.5 0 1 1 9.8 4a7 7 0 1 0 10.2 10.2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"></path>
            <path d="M18 3.5V6M19.25 4.75H16.75M7 17.5V19.5M8 18.5H6" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
          </svg>
        </button>
      </div>
    </div>

    <!-- Overview -->
    <div class="overview">
      <div class="grade-card">
        <div class="grade-label">API Score</div>
        <div class="grade-progress">
          <div class="grade-center">
            <div class="grade-letter">${escapeHtml(grade)}</div>
            <div class="grade-score">${escapeHtml(String(scoreValue))}&thinsp;/&thinsp;100</div>
          </div>
        </div>
      </div>
      <div>
        <h1 style="font-size:22px;font-weight:800;color:var(--text);line-height:1.2;margin-bottom:4px;">${escapeHtml(reportTitle)}</h1>
        <div style="font-size:11px;color:var(--text-3);margin-bottom:14px;">Generated&nbsp;${escapeHtml(generatedAt)}</div>
        <div class="metrics-grid">
          <div class="metric-card" style="border-top:3px solid ${gradeColor};">
            <div class="metric-label">Score</div>
            <div class="metric-value" style="color:${gradeColor};">${escapeHtml(String(report.overview && report.overview.score != null ? report.overview.score : 0))}<span style="font-size:14px;font-weight:600;color:var(--text-3);margin-left:4px;">/100</span></div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Passed Checks</div>
            <div class="metric-value" style="color:var(--success);">${escapeHtml(String(report.overview && report.overview.passedChecks != null ? report.overview.passedChecks : 0))}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Total Checks</div>
            <div class="metric-value">${escapeHtml(String(report.overview && report.overview.totalChecks != null ? report.overview.totalChecks : 0))}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Issues</div>
            <div class="metric-value" style="color:${rows.length > 0 ? 'var(--danger)' : 'var(--success)'};">${escapeHtml(String(rows.length))}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Breakdown -->
    <div class="section">
      <div class="section-header">
        <div class="section-heading">
          <span class="section-title">${escapeHtml(breakdownTitle)}</span>
          <span class="section-subtitle">${escapeHtml(breakdownSubtitle)}</span>
        </div>
        <span class="section-badge">${escapeHtml(breakdownBadge)}</span>
      </div>
      <div id="breakdown" class="breakdown-grid"></div>
    </div>

    <!-- Issue Explorer -->
    <div class="section" id="issue-explorer">
      <div class="section-header">
        <div class="section-heading">
          <span class="section-title">Issue Explorer</span>
          <span class="section-subtitle">Browse, filter and inspect all violations in detail</span>
        </div>
        <span class="section-badge" id="issueCountBadge">${escapeHtml(String(rows.length))} issue${rows.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="ie-card">
        <div class="toolbar">
          <button class="sev-chip active" data-sev="all"   id="sev-all">All</button>
          <button class="sev-chip"        data-sev="error" id="sev-error"><span class="sev-chip-dot" style="background:var(--danger);"></span>Errors</button>
          <button class="sev-chip"        data-sev="warn"  id="sev-warn"><span class="sev-chip-dot" style="background:var(--warn);"></span>Warnings</button>
          <div class="toolbar-sep"></div>
          <select id="groupBy" class="toolbar-select">
            <option value="none">No grouping</option>
            <option value="rule">Group by rule</option>
            <option value="endpoint">Group by endpoint</option>
          </select>
          <select id="breakdownFilter" class="toolbar-select"><option value="">All categories</option></select>
          <div class="toolbar-sep"></div>
          <div class="search-wrap">
            <span class="search-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
            <input id="search" class="toolbar-search" type="text" placeholder="Search rules, messages, paths…" />
          </div>
        </div>
        <div class="issues-layout">
          <div class="issue-list" id="issueList"></div>
          <div class="detail-pane" id="detailPane">
            <div class="detail-empty">
              <div class="detail-empty-icon">&#9741;</div>
              <div>Select an issue to view details</div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
  <script>
    const DATA = ${serializeForScript(data)};
    const state = { severity: 'all', search: '', groupBy: 'none', breakdownKey: '', selectedId: null };
    const THEME_STORAGE_KEY = 'wso2-spectral-theme';

    const byId = new Map(DATA.rows.map((row) => [row.id, row]));

    function scoreColor(pct) {
      if (pct >= 90) return '#10B981';
      if (pct >= 75) return '#38BDF8';
      if (pct >= 60) return '#EAB308';
      if (pct >= 40) return '#F97316';
      return '#F43F5E';
    }

    function esc(v) {
      return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function field(key, val) {
      return '<div class="dfield"><div class="dfield-key">' + key + '</div><div class="dfield-val">' + val + '</div></div>';
    }

    function getStoredThemeMode() {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      return (saved === 'light' || saved === 'dark') ? saved : 'dark';
    }

    function applyTheme(mode) {
      const root = document.documentElement;
      root.setAttribute('data-theme', mode === 'light' ? 'light' : 'dark');
    }

    function filteredRows() {
      const q = state.search.trim().toLowerCase();
      return DATA.rows.filter((row) => {
        if (state.severity !== 'all' && row.severity !== state.severity) return false;
        if (state.breakdownKey && !(row.breakdownKeys || []).includes(state.breakdownKey)) return false;
        if (!q) return true;
        return (row.rule + ' ' + row.message + ' ' + row.path + ' ' + row.endpoint).toLowerCase().includes(q);
      });
    }

    function grouped(rows) {
      if (state.groupBy === 'none') return [{ key: 'All issues', rows }];
      const m = new Map();
      for (const row of rows) {
        const key = state.groupBy === 'rule' ? row.rule : (row.method + ' ' + row.endpoint);
        if (!m.has(key)) m.set(key, []);
        m.get(key).push(row);
      }
      return Array.from(m.entries()).map(([key, groupRows]) => ({ key, rows: groupRows }));
    }

    function renderBreakdown() {
      const container = document.getElementById('breakdown');
      if (!container) return;
      if (!Array.isArray(DATA.categories) || DATA.categories.length === 0) {
        container.innerHTML = '<div style="padding:12px 14px;font-size:12px;color:var(--text-3);">No category breakdown available for this report.</div>';
        return;
      }

      // AI Readiness: accordion with dimensions + sub-buckets
      const hasDimensions = DATA.categories.some((c) => Array.isArray(c.subBuckets));
      if (hasDimensions) {
        container.className = '';

        // Inline SVG icons per dimension
        const dimIcons = {
          discovery:  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
          contract:   '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
          resilience: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>',
          security:   '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
        };
        const chevronSvg = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';

        // ── Accordion ────────────────────────────────────────────
        const accordionHtml = '<div class="ai-accordion">' + DATA.categories.map((dim, dimIdx) => {
          const pct   = Number(dim.passPercentage != null ? dim.passPercentage : (dim.status === 'passed' ? 100 : 0));
          const color = scoreColor(pct);
          const icon  = dimIcons[dim.id] || dimIcons.security;
          const isOpen = true; // all expanded by default

          // Sort sub-buckets: failing first, then ascending passPercentage
          const sortedBuckets = (dim.subBuckets || []).slice().sort((a, b) => {
            const aFail = a.status !== 'passed' ? 0 : 1;
            const bFail = b.status !== 'passed' ? 0 : 1;
            if (aFail !== bFail) return aFail - bFail;
            const aPct = Number(a.passPercentage != null ? a.passPercentage : (a.status === 'passed' ? 100 : 0));
            const bPct = Number(b.passPercentage != null ? b.passPercentage : (b.status === 'passed' ? 100 : 0));
            return aPct - bPct;
          });

          // Tags with colored dots (use original order for tags display)
          const tags = sortedBuckets.map((s) => {
            const sPct     = Number(s.passPercentage != null ? s.passPercentage : (s.status === 'passed' ? 100 : 0));
            const dotColor = s.status === 'passed' ? '#10B981' : scoreColor(sPct);
            return '<span class="ai-dim-tag"><span class="ai-tag-dot" style="background:' + dotColor + ';"></span>' + esc(s.label) + '</span>';
          }).join('');

          // Issue count summary for collapsed header
          const totalIssues = (dim.subBuckets || []).reduce((sum, s) => sum + (Number(s.total) || 0), 0);
          const issueLabel  = totalIssues > 0 ? (totalIssues + ' issue' + (totalIssues !== 1 ? 's' : '')) : 'All passing';

          // Sub-bucket rows
          const subRows = sortedBuckets.map((sub) => {
            const subPct   = Number(sub.passPercentage != null ? sub.passPercentage : (sub.status === 'passed' ? 100 : 0));
            const subColor = scoreColor(subPct);
            const subKey   = esc(sub.viewIssuesFilter && sub.viewIssuesFilter.key || '');
            const statusHtml = sub.status === 'passed'
              ? '<span class="ai-sub-status passing">&#10003; passing</span>'
              : '<span class="ai-sub-status issues">' + esc(sub.total) + ' issue' + (sub.total !== 1 ? 's' : '') + '</span>';
            const viewBtn = sub.status !== 'passed'
              ? '<button class="link-btn" data-cat="' + subKey + '">View issues</button>'
              : '';
            return '<div class="ai-sub">' +
              '<div class="ai-sub-top">' +
                '<span class="ai-sub-score" style="color:' + subColor + ';">' + subPct + '%</span>' +
                '<span class="ai-sub-name">' + esc(sub.label) + '</span>' +
                statusHtml +
              '</div>' +
              '<div class="ai-sub-desc">' + esc(sub.description) + '</div>' +
              '<div class="ai-bar-row">' +
                '<div class="ai-bar"><div class="ai-bar-fill" style="width:' + subPct + '%;background:' + subColor + ';"></div></div>' +
                viewBtn +
              '</div>' +
            '</div>';
          }).join('');

          // "Why this matters" always visible
          const whyHtml = dim.whyItMatters
            ? '<div class="ai-why-label">Why this matters</div><div class="ai-why">' + esc(dim.whyItMatters) + '</div>'
            : '';

          // Colored left accent stripe matches the dimension score
          return '<div class="ai-dim" data-dim-id="' + esc(dim.id) + '" style="border-left:4px solid ' + color + ';">' +
            '<div class="ai-dim-header" data-toggle="' + esc(dim.id) + '">' +
              '<span class="ai-dim-score" style="color:' + color + ';">' + pct + '%</span>' +
              '<div class="ai-dim-meta">' +
                '<div class="ai-dim-title"><span class="ai-dim-icon" style="color:' + color + ';">' + icon + '</span>' + esc(dim.label) + '</div>' +
                '<div class="ai-dim-desc">' + esc(dim.description) + '</div>' +
                '<div class="ai-dim-tags">' + tags + '</div>' +
              '</div>' +
              '<div class="ai-dim-right">' +
                '<span class="ai-dim-issue-count">' + esc(issueLabel) + '</span>' +
                '<span class="ai-dim-chevron' + (isOpen ? ' open' : '') + '" data-chevron="' + esc(dim.id) + '">' + chevronSvg + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="ai-dim-body" id="dim-body-' + esc(dim.id) + '"' + (isOpen ? '' : ' style="display:none;"') + '>' +
              whyHtml +
              '<div class="ai-sub-grid">' + subRows + '</div>' +
            '</div>' +
          '</div>';
        }).join('') + '</div>';

        container.innerHTML = accordionHtml;

        // Accordion toggle — rotate chevron
        container.querySelectorAll('[data-toggle]').forEach((hdr) => {
          hdr.addEventListener('click', (e) => {
            const id      = hdr.getAttribute('data-toggle');
            const body    = document.getElementById('dim-body-' + id);
            const chevron = container.querySelector('[data-chevron="' + id + '"]');
            if (!body) return;
            const open = body.style.display !== 'none';
            body.style.display = open ? 'none' : '';
            if (chevron) chevron.classList.toggle('open', !open);
          });
        });
      } else {
        // OWASP / REST: flat 4-per-row grid, left-aligned
        container.className = 'breakdown-grid';
        const extLinkSvg = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-left:3px;opacity:0.6;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
        container.innerHTML = DATA.categories.map((cat) => {
          const total    = Number(cat.total    || 0);
          const errors   = Number(cat.errors   || 0);
          const warnings = Number(cat.warnings || 0);
          const passed   = total === 0;

          // Severity level drives border colour and badge — only show red when
          // there are actual errors; fall back to warn (amber) for warnings only,
          // info (blue) for other severities, green for clear.
          const level = passed ? 'pass' : errors > 0 ? 'error' : warnings > 0 ? 'warn' : 'info';
          const borderColor = level === 'pass'  ? 'var(--success)'
                            : level === 'error' ? 'var(--danger)'
                            : level === 'warn'  ? 'var(--warn)'
                                                : 'var(--info)';

          const badgeText = passed    ? 'Clear'
                          : errors > 0   ? errors   + ' error'   + (errors   !== 1 ? 's' : '')
                          : warnings > 0 ? warnings + ' warning' + (warnings !== 1 ? 's' : '')
                                         : total    + ' issue'   + (total    !== 1 ? 's' : '');

          const catKey      = esc(cat.viewIssuesFilter && cat.viewIssuesFilter.key || '');
          const statusBadge = '<span class="bucket-status-badge ' + level + '">' + esc(badgeText) + '</span>';
          const btn         = passed ? '' : '<button class="link-btn" data-cat="' + catKey + '">View issues</button>';
          const docsLink    = cat.docsUrl
            ? '<a class="bucket-docs-link" href="' + esc(cat.docsUrl) + '" target="_blank" rel="noopener">Docs' + extLinkSvg + '</a>'
            : '';
          return '<div class="bucket" style="border-left-color:' + borderColor + ';">' +
            '<div class="bucket-id">' + esc(cat.id || '') + '</div>' +
            '<div class="bucket-title">' + esc(cat.label || '') + '</div>' +
            (cat.description ? '<div class="bucket-desc">' + esc(cat.description) + '</div>' : '') +
            '<div class="bucket-status-row">' +
              statusBadge +
              '<div class="bucket-actions">' + docsLink + btn + '</div>' +
            '</div>' +
          '</div>';
        }).join('');
      }

      container.querySelectorAll('[data-cat]').forEach((el) => {
        el.addEventListener('click', () => {
          state.breakdownKey = el.getAttribute('data-cat') || '';
          const select = document.getElementById('breakdownFilter');
          if (select) select.value = state.breakdownKey;
          renderIssues();
          window.scrollTo({
            top: Math.max(
              document.documentElement.scrollHeight,
              document.body.scrollHeight
            ),
            behavior: 'smooth',
          });
        });
      });
    }

    function renderIssues() {
      const rows = filteredRows();
      if (!state.selectedId || !byId.has(state.selectedId) || !rows.find((r) => r.id === state.selectedId)) {
        state.selectedId = rows.length > 0 ? rows[0].id : null;
      }

      // Keep section badge count in sync with active filter
      const badge = document.getElementById('issueCountBadge');
      if (badge) {
        const isFiltered = state.severity !== 'all' || state.search.trim() || state.breakdownKey;
        badge.textContent = isFiltered
          ? rows.length + ' of ' + DATA.rows.length + ' issue' + (DATA.rows.length !== 1 ? 's' : '')
          : DATA.rows.length + ' issue' + (DATA.rows.length !== 1 ? 's' : '');
      }

      const list   = document.getElementById('issueList');
      const detail = document.getElementById('detailPane');
      if (!list || !detail) return;

      const groups = grouped(rows);
      list.innerHTML = groups.map((group) => {
        const items = group.rows.map((row) =>
          '<button class="issue-btn sev-' + esc(row.severity) + ' ' + (state.selectedId === row.id ? 'active' : '') + '" data-id="' + esc(row.id) + '">' +
            '<div class="issue-msg">' + esc(row.message) + '</div>' +
            '<div class="issue-path">' + esc(row.path) + '</div>' +
          '</button>'
        ).join('');
        return '<div>' +
          (state.groupBy === 'none' ? '' : '<div class="group-header"><span>' + esc(group.key) + '</span><span class="group-count">' + group.rows.length + '</span></div>') +
          items +
        '</div>';
      }).join('') || '<div style="padding:16px;font-size:12px;color:var(--text-3);">No issues match your filters.</div>';

      list.querySelectorAll('[data-id]').forEach((el) => {
        el.addEventListener('click', () => {
          state.selectedId = el.getAttribute('data-id');
          renderIssues();
        });
      });

      const sel = state.selectedId ? byId.get(state.selectedId) : null;
      if (!sel) {
        detail.innerHTML = '<div class="detail-empty"><div class="detail-empty-icon">&#9741;</div><div>Select an issue to view details</div></div>';
        return;
      }

      detail.innerHTML =
        '<div class="detail-title">' + esc(sel.rule) + '</div>' +
        '<span class="badge ' + esc(sel.severity) + '">' + esc(sel.severity) + '</span>' +
        '<hr class="detail-sep" />' +
        field('Message', esc(sel.message)) +
        (sel.description ? field('Description', esc(sel.description)) : '') +
        (sel.fixSuggestion
          ? '<div class="fix-block"><div class="dfield-key">&#10003;&nbsp; Fix Suggestion</div><div class="dfield-val">' + esc(sel.fixSuggestion) + '</div></div>'
          : '') +
        field('Endpoint', '<code>' + esc(sel.method + ' ' + sel.endpoint) + '</code>') +
        field('Path', '<code>' + esc(sel.path) + '</code>') +
        (sel.line > 0
          ? field('Location', '<code>Line ' + esc(sel.line) + (sel.endLine && sel.endLine !== sel.line ? ('-' + esc(sel.endLine)) : '') + '</code>')
          : '') +
        (sel.specSnippet
          ? field('Spec Snippet', '<pre class="spec-snippet"><code>' + esc(sel.specSnippet) + '</code></pre>')
          : '');
    }

    function bindControls() {
      const themeToggle = document.getElementById('themeToggle');
      if (themeToggle) {
        themeToggle.addEventListener('click', () => {
          const currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
          const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
          window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
          applyTheme(nextTheme);
        });
      }

      const filter = document.getElementById('breakdownFilter');
      if (filter) {
        const hasDimensions = Array.isArray(DATA.categories) && DATA.categories.some((c) => Array.isArray(c.subBuckets));
        const flatOptions = hasDimensions
          ? DATA.categories.flatMap((dim) => (dim.subBuckets || []).map((sub) => ({
              key: sub.viewIssuesFilter && sub.viewIssuesFilter.key || '',
              label: dim.label + ' › ' + sub.label,
            })))
          : (Array.isArray(DATA.categories) ? DATA.categories : []).map((cat) => ({
              key: cat.viewIssuesFilter && cat.viewIssuesFilter.key || '',
              label: cat.label || cat.id || '',
            }));
        const opts = ['<option value="">All categories</option>'].concat(
          flatOptions.map((o) => '<option value="' + esc(o.key) + '">' + esc(o.label) + '</option>')
        );
        filter.innerHTML = opts.join('');
        filter.addEventListener('change', (e) => { state.breakdownKey = e.target.value || ''; renderIssues(); });
      }

      ['all', 'error', 'warn'].forEach((sev) => {
        const el = document.getElementById('sev-' + sev);
        if (!el) return;
        el.addEventListener('click', () => {
          state.severity = sev;
          document.querySelectorAll('[data-sev]').forEach((btn) => btn.classList.remove('active'));
          el.classList.add('active');
          renderIssues();
        });
      });

      const search = document.getElementById('search');
      if (search) search.addEventListener('input', (e) => { state.search = e.target.value || ''; renderIssues(); });
      const groupBy = document.getElementById('groupBy');
      if (groupBy) groupBy.addEventListener('change', (e) => { state.groupBy = e.target.value || 'none'; renderIssues(); });
    }

    applyTheme(getStoredThemeMode());
    bindControls();
    renderBreakdown();
    renderIssues();
  </script>
</body>
</html>`;
}

module.exports = {
  buildHtmlReport,
};
