#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./release-artifacts.sh
source "$script_dir/release-artifacts.sh"
# shellcheck source=./release-versioning.sh
source "$script_dir/release-versioning.sh"

: "${RELEASE_TAG:?RELEASE_TAG must be set.}"

prerelease="${PRERELEASE:-false}"
case "$prerelease" in
  true|false)
    ;;
  *)
    echo "error: PRERELEASE must be true or false." >&2
    exit 1
    ;;
esac

release_target_sha="${RELEASE_TARGET_SHA:-$(git rev-list -n 1 "$RELEASE_TAG")}"
release_notes_file="$(mktemp)"
release_title="${RELEASE_TITLE:-$(release_package_name) ${RELEASE_TAG#v}}"
trap 'rm -f "$release_notes_file"' EXIT

bash "$script_dir/write-release-notes.sh" \
  --channel stable \
  --tag "$RELEASE_TAG" \
  --target "$release_target_sha" \
  --output "$release_notes_file"

mapfile -t files < <(release_artifact_files)
if [[ "${#files[@]}" -eq 0 ]]; then
  echo "error: no release artifacts found." >&2
  exit 1
fi

if gh release view "$RELEASE_TAG" >/dev/null 2>&1; then
  release_id="$(gh api "repos/{owner}/{repo}/releases/tags/$RELEASE_TAG" --jq '.id')"
  gh api \
    --method PATCH \
    "repos/{owner}/{repo}/releases/$release_id" \
    -f name="$release_title" \
    -F prerelease="$prerelease" \
    -F body=@"$release_notes_file" \
    >/dev/null
  gh release upload "$RELEASE_TAG" "${files[@]}" --clobber
  exit 0
fi

args=(
  "$RELEASE_TAG"
  "${files[@]}"
  --title "$release_title"
  --notes-file "$release_notes_file"
  --verify-tag
)
if [[ "$prerelease" == 'true' ]]; then
  args+=(--prerelease)
fi

gh release create "${args[@]}"
