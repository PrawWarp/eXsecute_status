#!/bin/bash
set -eo pipefail

echo "=== Verification Gate ==="

# --- Always-on security gates ---

echo ">> semgrep"
if command -v semgrep > /dev/null; then
    SEMGREP_ARGS="--config auto"
    [ -f .semgrep.yml ] && SEMGREP_ARGS="$SEMGREP_ARGS --config .semgrep.yml"
    semgrep $SEMGREP_ARGS
else
    echo "semgrep not found — install with: pip install semgrep"
    exit 1
fi

echo ">> gitleaks"
if command -v gitleaks > /dev/null; then
    gitleaks detect --no-git -v
else
    echo "gitleaks not found — install with: brew install gitleaks"
    exit 1
fi

# --- Repo-specific gates ---

echo ">> tests"
npm test

echo ">> typecheck"
npm run type-check

echo ">> lint"
npm run lint

echo ">> build"
npm run build

echo "=== All checks passed ==="
