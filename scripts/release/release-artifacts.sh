#!/usr/bin/env bash
set -euo pipefail

release_artifact_files()
{
  local artifacts_dir="${1:-artifacts/release}"

  find "$artifacts_dir" -maxdepth 1 -type f \
    \( -name '*.tar.gz' -o -name 'SHA256SUMS' \) \
    | LC_ALL=C sort
}
