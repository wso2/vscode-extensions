#!/usr/bin/env python3
"""
Finalize the API readiness report: resolve output path, assemble JSON, generate HTML,
print summary, and clean up scratch directory.

Resolves api-reports/ location automatically (no separate bash step needed):
  1. Existing api-reports/ in CWD  → use it
  2. Existing api-reports/ next to spec file → use it
  3. Neither → create api-reports/ in CWD

Usage:
  python3 finalize_report.py \
    --spec-file <path>          # or "pasted" if content was pasted
    --meta '<json-string>' \
    --skill-dir <absolute-path-to-skill> \
    [--ai-issues-json '<json-array>']   # AI analysis results passed directly (no file write needed)
"""

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

SCRATCH = Path(tempfile.gettempdir()) / "api-readiness"


def resolve_output_path(spec_file: str) -> Path:
    cwd = Path.cwd()

    # 1. Prefer existing api-reports/ in CWD
    if (cwd / "api-reports").is_dir():
        report_dir = cwd / "api-reports"
    # 2. Fall back to existing api-reports/ next to spec file
    elif spec_file != "pasted" and (Path(spec_file).parent / "api-reports").is_dir():
        report_dir = Path(spec_file).parent / "api-reports"
    # 3. Create in CWD
    else:
        report_dir = cwd / "api-reports"
        report_dir.mkdir(parents=True, exist_ok=True)

    stem = Path(spec_file).stem if spec_file != "pasted" else None
    filename = f"{stem}-api-readiness-report.json" if stem else "api-readiness-report.json"
    return report_dir / filename


def main():
    parser = argparse.ArgumentParser(
        description="Assemble report, generate HTML, print summary, clean up scratch."
    )
    parser.add_argument("--spec-file", required=True,
                        help="Spec file path, or 'pasted' if content was pasted")
    parser.add_argument("--meta", required=True, help="JSON string with meta fields")
    parser.add_argument("--skill-dir", required=True,
                        help="Absolute path to the skill directory")
    parser.add_argument("--ai-issues-json", default=None,
                        help="AI analysis issues as a JSON array string (avoids file write)")
    args = parser.parse_args()

    skill_dir = Path(args.skill_dir)
    output = resolve_output_path(args.spec_file)

    # Write AI issues to scratch if provided as JSON arg
    if args.ai_issues_json:
        SCRATCH.mkdir(parents=True, exist_ok=True)
        ai_issues_path = SCRATCH / "ai-issues-raw.json"
        ai_issues_path.write_text(args.ai_issues_json)

    # Build assemble_report.py arguments — include only files that actually exist
    assemble_cmd = [
        sys.executable,
        str(skill_dir / "scripts" / "assemble_report.py"),
        "--meta", args.meta,
        "--output", str(output),
    ]
    if (SCRATCH / "spec-issues.json").exists():
        assemble_cmd += ["--spec-issues", str(SCRATCH / "spec-issues.json")]
    if (SCRATCH / "ai-issues-raw.json").exists():
        assemble_cmd += ["--ai-issues", str(SCRATCH / "ai-issues-raw.json")]
    if (SCRATCH / "sec-issues.json").exists():
        assemble_cmd += ["--sec-issues", str(SCRATCH / "sec-issues.json")]
    if (SCRATCH / "des-issues.json").exists():
        assemble_cmd += ["--des-issues", str(SCRATCH / "des-issues.json")]

    subprocess.run(assemble_cmd, check=True)

    subprocess.run([
        sys.executable,
        str(skill_dir / "scripts" / "generate_html_report.py"),
        str(output),
    ], check=True)

    result = subprocess.run([
        sys.executable,
        str(skill_dir / "scripts" / "generate_summary.py"),
        str(output),
    ], capture_output=True, text=True, check=True)

    print(result.stdout, end="")
    print(f"\nReport: {output.resolve()}")
    print(f"HTML:   {output.with_suffix('.html').resolve()}")

    # Clean up — only reached if all steps above succeeded
    if SCRATCH.exists():
        shutil.rmtree(SCRATCH)


if __name__ == "__main__":
    main()
