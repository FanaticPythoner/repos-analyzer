#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export PRERELEASE="${PRERELEASE:-true}"
exec "$script_dir/create-github-release.sh" "$@"
