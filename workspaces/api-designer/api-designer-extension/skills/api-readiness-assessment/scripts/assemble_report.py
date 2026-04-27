#!/usr/bin/env python3
"""
Assemble the final API readiness assessment report JSON from processed issue files.

Usage:
  python3 assemble_report.py \
    --meta '{"specFile":"...","assessedAt":"...","spectralVersion":"...","guidelinesVersion":"...","model":"..."}' \
    [--spec-issues /tmp/spec-issues.json] \
    [--ai-issues /tmp/ai-issues-raw.json]
    [--sec-issues /tmp/sec-issues.json] \
    --output /path/to/report.json
"""

import argparse
import json
import re
import sys
from pathlib import Path


def compute_score(issues):
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for issue in issues:
        sev = issue.get("severity", "").upper()
        if sev == "CRITICAL":
            counts["critical"] += 1
        elif sev == "HIGH":
            counts["high"] += 1
        elif sev == "MEDIUM":
            counts["medium"] += 1
        elif sev == "LOW":
            counts["low"] += 1

    c, h = counts["critical"], counts["high"]
    if c >= 3:
        rating = "Poor"
    elif c >= 1:
        rating = "Fair"
    elif h >= 5:
        rating = "Fair"
    elif h >= 1:
        rating = "Good"
    else:
        rating = "Excellent"

    return {**counts, "rating": rating}


def rule_sort_key(rule_str):
    m = re.match(r"Rule\s+(\d+)\.(\d+)", str(rule_str))
    if m:
        return (int(m.group(1)), int(m.group(2)))
    return (999, 999)


def process_ai_issues(raw_issues):
    sorted_issues = sorted(raw_issues, key=lambda x: rule_sort_key(x.get("rule", "")))
    issues = []
    for i, item in enumerate(sorted_issues, 1):
        issues.append({
            "id": f"ai-{i:03d}",
            "severity": item.get("severity", "MEDIUM"),
            "rule": item.get("rule", ""),
            "path": item.get("path", ""),
            "issue": item.get("issue", ""),
            "description": item.get("description", ""),
            "fixSuggestion": item.get("fixSuggestion", ""),
            "autoFixable": False,
        })
    return issues


def main():
    parser = argparse.ArgumentParser(
        description="Assemble the final API readiness report JSON from processed issue files."
    )
    parser.add_argument("--meta", required=True, help="JSON string with meta fields")
    parser.add_argument("--spec-issues", help="Path to spec-issues.json (agentReadiness.spectral)")
    parser.add_argument("--ai-issues", help="Path to ai-issues-raw.json")
    parser.add_argument("--sec-issues", help="Path to sec-issues.json (securityReadiness.spectral)")
    parser.add_argument("--des-issues", help="Path to des-issues.json (designReadiness.spectral)")
    parser.add_argument("--output", "-o", required=True, help="Output report JSON path")
    parser.add_argument(
        "--spec-ruleset",
        default="references/agent-readiness-spectral/ai-readiness.yaml",
        help="Spectral ruleset path to record in the report (informational)"
    )
    parser.add_argument(
        "--sec-ruleset",
        default="references/owasp-top-10-raw.yaml",
        help="OWASP ruleset path to record in the report (informational)"
    )
    parser.add_argument(
        "--des-ruleset",
        default="references/wso2-design-guidelines-raw.yaml",
        help="Design guidelines ruleset path to record in the report (informational)"
    )
    args = parser.parse_args()

    meta = json.loads(args.meta)
    report = {"meta": meta}

    has_agent = bool(args.spec_issues or args.ai_issues)
    has_security = bool(args.sec_issues)
    has_design = bool(args.des_issues)

    if has_agent:
        agent_readiness = {}

        if args.spec_issues:
            spec_issues = json.loads(Path(args.spec_issues).read_text())
            agent_readiness["spectral"] = {
                "status": "completed",
                "ruleset": args.spec_ruleset,
                "score": compute_score(spec_issues),
                "issues": spec_issues,
            }

        if args.ai_issues:
            raw_ai = json.loads(Path(args.ai_issues).read_text())
            ai_issues = process_ai_issues(raw_ai)
            agent_readiness["aiAnalysis"] = {
                "status": "completed",
                "score": compute_score(ai_issues),
                "issues": ai_issues,
            }

        report["agentReadiness"] = agent_readiness

    if has_security:
        sec_issues = json.loads(Path(args.sec_issues).read_text())
        report["securityReadiness"] = {
            "spectral": {
                "status": "completed",
                "ruleset": args.sec_ruleset,
                "score": compute_score(sec_issues),
                "issues": sec_issues,
            }
        }

    if has_design:
        des_issues = json.loads(Path(args.des_issues).read_text())
        report["designReadiness"] = {
            "spectral": {
                "status": "completed",
                "ruleset": args.des_ruleset,
                "score": compute_score(des_issues),
                "issues": des_issues,
            }
        }

    output_path = Path(args.output)
    output_path.write_text(json.dumps(report, indent=2))
    print(f"Report written to {output_path.resolve()}", file=sys.stderr)


if __name__ == "__main__":
    main()
