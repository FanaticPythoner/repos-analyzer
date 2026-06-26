#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./release-versioning.sh
source "$script_dir/release-versioning.sh"

artifacts_dir="${ARTIFACTS_DIR:-artifacts/release}"
package_name="$(release_package_name)"
package_version="$(release_package_version)"

archive_output()
{
  local archive_name="$1"
  shift

  tar \
    --sort=name \
    --mtime='UTC 1970-01-01' \
    --owner=0 \
    --group=0 \
    --numeric-owner \
    -C .output \
    -cf - "$@" \
    | gzip -n > "$artifacts_dir/$archive_name"
}

mkdir -p "$artifacts_dir"
rm -f "$artifacts_dir"/*.tar.gz "$artifacts_dir/SHA256SUMS"

pnpm build
test -d .output/public
test -d .output/server
archive_output "${package_name}-${package_version}-nitro-server.tar.gz" public server

NITRO_PRESET=github_pages pnpm build
test -d .output/public
archive_output "${package_name}-${package_version}-github-pages.tar.gz" public

(
  cd "$artifacts_dir"
  sha256sum *.tar.gz > SHA256SUMS
)
