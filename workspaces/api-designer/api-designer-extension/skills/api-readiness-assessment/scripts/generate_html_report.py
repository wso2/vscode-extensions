#!/usr/bin/env python3
"""
Generate a self-contained HTML report from an API readiness assessment JSON file.

Usage:
  python generate_html_report.py <report.json>
  python generate_html_report.py <report.json> --output <report.html>
  python generate_html_report.py <report.json> --open
"""

import argparse
import json
import sys
import webbrowser
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(
        description="Generate an HTML report from an API readiness assessment JSON file."
    )
    parser.add_argument("report_json", help="Path to the assessment JSON file")
    parser.add_argument(
        "--output", "-o",
        help="Output HTML file path (default: same dir as input, .html extension)"
    )
    parser.add_argument(
        "--open", action="store_true",
        help="Open the generated HTML in the default browser after writing"
    )
    args = parser.parse_args()

    report_path = Path(args.report_json)
    if not report_path.exists():
        print(f"Error: {report_path} not found", file=sys.stderr)
        sys.exit(1)

    with open(report_path) as f:
        report_data = json.load(f)

    template_path = Path(__file__).parent.parent / "assets" / "report_template.html"
    if not template_path.exists():
        print(f"Error: template not found at {template_path}", file=sys.stderr)
        sys.exit(1)

    template = template_path.read_text()
    html = template.replace("__REPORT_DATA_JSON__", json.dumps(report_data))

    output_path = Path(args.output) if args.output else report_path.with_suffix(".html")
    output_path.write_text(html)
    print(f"Report generated: {output_path.resolve()}")

    if args.open:
        webbrowser.open(output_path.resolve().as_uri())


if __name__ == "__main__":
    main()
