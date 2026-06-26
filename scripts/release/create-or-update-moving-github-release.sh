#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./release-artifacts.sh
source "$script_dir/release-artifacts.sh"
# shellcheck source=./release-versioning.sh
source "$script_dir/release-versioning.sh"

release_tag="${RELEASE_TAG:-latest}"
release_target_sha="${RELEASE_TARGET_SHA:-$(git rev-parse HEAD)}"
release_target_branch="${RELEASE_TARGET_BRANCH:-$(git branch --show-current)}"
release_title="${RELEASE_TITLE:-Latest build (${release_target_sha:0:12})}"
release_notes_file="$(mktemp)"
trap 'rm -f "$release_notes_file"' EXIT

bash "$script_dir/write-release-notes.sh" \
  --channel latest \
  --tag "$release_tag" \
  --target "$release_target_sha" \
  --target-branch "$release_target_branch" \
  --output "$release_notes_file"

mapfile -t files < <(release_artifact_files)
if [[ "${#files[@]}" -eq 0 ]]; then
  echo "error: no release artifacts found." >&2
  exit 1
fi

git tag -f "$release_tag" "$release_target_sha"
git push --force origin "refs/tags/$release_tag"

if gh release view "$release_tag" >/dev/null 2>&1; then
  gh release delete "$release_tag" --yes
fi

gh release create \
  "$release_tag" \
  "${files[@]}" \
  --title "$release_title" \
  --notes-file "$release_notes_file" \
  --prerelease \
  --target "$release_target_sha"
