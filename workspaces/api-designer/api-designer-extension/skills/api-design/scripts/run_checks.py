#!/usr/bin/env python3
"""
Run all requested Spectral checks and enrich the results.

Usage:
  python3 run_checks.py <spec-file> <skill-dir> [--agent] [--security] [--design]

Outputs all intermediate files to the platform temp directory under api-readiness/.
Exit code 0 means checks ran (violations are normal and do not cause failure).
"""

import subprocess
import sys
import tempfile
from pathlib import Path

SCRATCH = Path(tempfile.gettempdir()) / "api-readiness"


def run_spectral(spec_file: str, ruleset: str, output_file: Path) -> None:
    result = subprocess.run(
        ["spectral", "lint", spec_file, "--ruleset", ruleset, "--format", "json"],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    )
    output_file.write_bytes(result.stdout)


def run_process_spectral(
    skill_dir: Path,
    spectral_json: Path,
    metadata_json: Path,
    prefix: str,
    output: Path,
) -> None:
    subprocess.run(
        [
            sys.executable,
            str(skill_dir / "scripts" / "process_spectral.py"),
            str(spectral_json),
            str(metadata_json),
            "--prefix", prefix,
            "--output", str(output),
        ],
        check=True,
    )


def main() -> None:
    if len(sys.argv) < 3:
        print("Usage: run_checks.py <spec-file> <skill-dir> [--agent] [--security] [--design]",
              file=sys.stderr)
        sys.exit(1)

    spec_file = sys.argv[1]
    skill_dir = Path(sys.argv[2])
    flags = set(sys.argv[3:])

    SCRATCH.mkdir(parents=True, exist_ok=True)

    if "--agent" in flags:
        print("Running AI agent readiness rules (Spectral)...")
        spectral_out = SCRATCH / "spectral-ai.json"
        run_spectral(
            spec_file,
            str(skill_dir / "references" / "agent-readiness-spectral" / "ai-readiness.yaml"),
            spectral_out,
        )
        run_process_spectral(
            skill_dir,
            spectral_out,
            skill_dir / "references" / "ai-readiness-metadata.json",
            prefix="spec",
            output=SCRATCH / "spec-issues.json",
        )

    if "--security" in flags:
        print("Running security rules (OWASP Top 10)...")
        spectral_out = SCRATCH / "spectral-sec.json"
        run_spectral(
            spec_file,
            str(skill_dir / "references" / "owasp-top-10-raw.yaml"),
            spectral_out,
        )
        run_process_spectral(
            skill_dir,
            spectral_out,
            skill_dir / "references" / "owasp-top-10-metadata.json",
            prefix="sec",
            output=SCRATCH / "sec-issues.json",
        )

    if "--design" in flags:
        print("Running design guidelines rules (WSO2 REST)...")
        spectral_out = SCRATCH / "spectral-des.json"
        run_spectral(
            spec_file,
            str(skill_dir / "references" / "wso2-design-guidelines-raw.yaml"),
            spectral_out,
        )
        run_process_spectral(
            skill_dir,
            spectral_out,
            skill_dir / "references" / "wso2-design-guidelines-metadata.json",
            prefix="des",
            output=SCRATCH / "des-issues.json",
        )

    print("Spectral checks complete.")


if __name__ == "__main__":
    main()
