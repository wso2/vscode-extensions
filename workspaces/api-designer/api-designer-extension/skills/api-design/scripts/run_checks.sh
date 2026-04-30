#!/usr/bin/env bash
# Run all requested Spectral checks and enrich the results.
#
# Usage:
#   bash run_checks.sh <spec-file> <skill-dir> [--agent] [--security] [--design]
#
# Outputs all intermediate files to /tmp/api-readiness/.
# Exit code 0 means checks ran (violations are normal and do not cause failure).
#
# DEPRECATED: Use run_checks.py instead — works on macOS, Linux, and Windows.

set -euo pipefail

SPEC_FILE="$1"
SKILL_DIR="$2"
shift 2

mkdir -p /tmp/api-readiness

for arg in "$@"; do
  case "$arg" in
    --agent)
      echo "Running AI agent readiness rules (Spectral)..."
      spectral lint "$SPEC_FILE" \
        --ruleset "$SKILL_DIR/references/agent-readiness-spectral/ai-readiness.yaml" \
        --format json > /tmp/api-readiness/spectral-ai.json 2>/dev/null || true
      python3 "$SKILL_DIR/scripts/process_spectral.py" \
        /tmp/api-readiness/spectral-ai.json \
        "$SKILL_DIR/references/ai-readiness-metadata.json" \
        --prefix spec \
        --output /tmp/api-readiness/spec-issues.json
      ;;
    --security)
      echo "Running security rules (OWASP Top 10)..."
      spectral lint "$SPEC_FILE" \
        --ruleset "$SKILL_DIR/references/owasp-top-10-raw.yaml" \
        --format json > /tmp/api-readiness/spectral-sec.json 2>/dev/null || true
      python3 "$SKILL_DIR/scripts/process_spectral.py" \
        /tmp/api-readiness/spectral-sec.json \
        "$SKILL_DIR/references/owasp-top-10-metadata.json" \
        --prefix sec \
        --output /tmp/api-readiness/sec-issues.json
      ;;
    --design)
      echo "Running design guidelines rules (WSO2 REST)..."
      spectral lint "$SPEC_FILE" \
        --ruleset "$SKILL_DIR/references/wso2-design-guidelines-raw.yaml" \
        --format json > /tmp/api-readiness/spectral-des.json 2>/dev/null || true
      python3 "$SKILL_DIR/scripts/process_spectral.py" \
        /tmp/api-readiness/spectral-des.json \
        "$SKILL_DIR/references/wso2-design-guidelines-metadata.json" \
        --prefix des \
        --output /tmp/api-readiness/des-issues.json
      ;;
  esac
done

echo "Spectral checks complete."
