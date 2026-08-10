#!/usr/bin/env python3
"""
Generate a plain-text summary from an API readiness assessment report JSON.

Usage:
  python3 generate_summary.py <report.json>
"""

import argparse
import json
import sys
from pathlib import Path

SEV_ORDER = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}


def main():
    parser = argparse.ArgumentParser(
        description="Print a plain-text summary of an API readiness assessment report."
    )
    parser.add_argument("report_json", help="Path to the assessment JSON file")
    args = parser.parse_args()

    report_path = Path(args.report_json)
    if not report_path.exists():
        print(f"Error: {report_path} not found", file=sys.stderr)
        sys.exit(1)

    report = json.loads(report_path.read_text())
    html_path = report_path.with_suffix(".html")

    lines = ["Assessment Summary", "=" * 18]
    all_issues = []

    ar = report.get("agentReadiness", {})
    if "spectral" in ar:
        s = ar["spectral"]["score"]
        lines.append(
            f"Agent Readiness · Spectral:    {s['rating']:<10} "
            f"— {s['critical']} critical, {s['high']} high, {s['medium']} medium, {s['low']} low"
        )
        all_issues.extend(ar["spectral"].get("issues", []))

    if "aiAnalysis" in ar:
        a = ar["aiAnalysis"]["score"]
        lines.append(
            f"Agent Readiness · AI Analysis: {a['rating']:<10} "
            f"— {a['critical']} critical, {a['high']} high, {a['medium']} medium, {a['low']} low"
        )
        all_issues.extend(ar["aiAnalysis"].get("issues", []))

    sr = report.get("securityReadiness", {}).get("spectral", {})
    if sr:
        s = sr["score"]
        lines.append(
            f"Security Readiness:            {s['rating']:<10} "
            f"— {s['critical']} critical, {s['high']} high, {s['medium']} medium, {s['low']} low"
        )
        all_issues.extend(sr.get("issues", []))

    dr = report.get("designReadiness", {}).get("spectral", {})
    if dr:
        s = dr["score"]
        lines.append(
            f"Design Readiness:              {s['rating']:<10} "
            f"— {s['critical']} critical, {s['high']} high, {s['medium']} medium, {s['low']} low"
        )
        all_issues.extend(dr.get("issues", []))

    all_issues.sort(key=lambda i: SEV_ORDER.get(i.get("severity", "").upper(), 99))

    lines.append("")
    lines.append("Top 3 issues:")
    for i, issue in enumerate(all_issues[:3], 1):
        sev = issue.get("severity", "?")
        iid = issue.get("id", "?")
        text = issue.get("issue", "")
        lines.append(f"  {i}. [{sev:<8}] {iid} — {text}")

    lines.append("")
    if html_path.exists():
        lines.append(f"HTML report: {html_path.resolve()}")
    else:
        lines.append(f"HTML report: {html_path.resolve()} (not yet generated)")

    print("\n".join(lines))


if __name__ == "__main__":
    main()
