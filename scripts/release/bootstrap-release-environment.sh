#!/usr/bin/env bash
set -euo pipefail

repository="${GITHUB_REPOSITORY:-FanaticPythoner/repos-analyzer}"
environment_name="${ENV_NAME:-release}"

command -v gh >/dev/null 2>&1 || { echo "error: gh is not available." >&2; exit 1; }

gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "repos/$repository/environments/$environment_name" \
  >/dev/null

printf "Configured environment '%s' for %s.\n" "$environment_name" "$repository"
