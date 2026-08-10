#!/usr/bin/env python3
"""
Process raw Spectral JSON output into an enriched issues array.

Usage:
  python3 process_spectral.py <spectral-json-file> <metadata-json-file> --prefix <spec|sec> [--output <file>]
"""

import argparse
import json
import sys
from pathlib import Path

SEVERITY_MAP = {0: "CRITICAL", 1: "HIGH", 2: "MEDIUM", 3: "LOW"}


def main():
    parser = argparse.ArgumentParser(
        description="Enrich Spectral JSON output with metadata and assign sequential IDs."
    )
    parser.add_argument("spectral_json", help="Path to Spectral --format json output file")
    parser.add_argument("metadata_json", help="Path to metadata JSON file (rules dict)")
    parser.add_argument("--prefix", required=True, choices=["spec", "sec", "des"], help="Issue ID prefix")
    parser.add_argument("--output", "-o", help="Output file path (default: stdout)")
    args = parser.parse_args()

    spectral_path = Path(args.spectral_json)
    metadata_path = Path(args.metadata_json)

    with open(spectral_path) as f:
        raw = json.load(f)

    with open(metadata_path) as f:
        metadata = json.load(f).get("rules", {})

    # Sort by path (joined string) ascending, then code ascending
    results = sorted(
        raw,
        key=lambda r: (".".join(str(p) for p in r.get("path", [])), r.get("code", ""))
    )

    issues = []
    for i, result in enumerate(results, 1):
        code = result.get("code", "")
        path_parts = result.get("path", [])
        path_str = ".".join(str(p) for p in path_parts) if path_parts else spectral_path.name

        meta = metadata.get(code, {})

        if "effectiveSeverity" in meta:
            severity = meta["effectiveSeverity"]
        else:
            severity = SEVERITY_MAP.get(result.get("severity", 1), "HIGH")

        issues.append({
            "id": f"{args.prefix}-{i:03d}",
            "severity": severity,
            "rule": code,
            "path": path_str,
            "issue": result.get("message", ""),
            "description": meta.get("description", ""),
            "fixSuggestion": meta.get("fixSuggestion", ""),
            "autoFixable": meta.get("autoFixable", False),
        })

    output = json.dumps(issues, indent=2)
    if args.output:
        Path(args.output).write_text(output)
        print(f"Wrote {len(issues)} issues to {args.output}", file=sys.stderr)
    else:
        print(output)


if __name__ == "__main__":
    main()
