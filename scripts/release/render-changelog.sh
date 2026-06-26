#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./release-versioning.sh
source "$script_dir/release-versioning.sh"

output_file='CHANGELOG.md'
through_tag=''
include_head=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --output)
      output_file="$2"
      shift 2
      ;;
    --through-tag)
      through_tag="$2"
      shift 2
      ;;
    --include-head)
      include_head=1
      shift
      ;;
    *)
      echo "error: unknown argument '$1'." >&2
      exit 1
      ;;
  esac
done

if [[ -z "$through_tag" ]]; then
  through_tag="$(latest_release_tag)"
fi

release_tags=()
release_semver_tags_array release_tags

selected_tags=()
include_tags=0

for tag in "${release_tags[@]}"; do
  if [[ -z "$through_tag" || "$tag" == "$through_tag" ]]; then
    include_tags=1
  fi

  if [[ "$include_tags" -eq 1 ]]; then
    selected_tags+=("$tag")
  fi
done

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT
mkdir -p "$(dirname "$output_file")"

{
  echo "# $(release_package_name) Changelog"
  echo
  echo "Release notes are generated from semver tags."
  echo

  if [[ "$include_head" -eq 1 ]]; then
    head_notes="$tmp_dir/head.md"
    bash "$script_dir/write-release-notes.sh" \
      --channel latest \
      --tag latest \
      --target HEAD \
      --target-branch "$(git branch --show-current)" \
      --output "$head_notes"
    echo "## Unreleased"
    echo
    tail -n +3 "$head_notes"
    echo
  fi

  if [[ "${#selected_tags[@]}" -eq 0 ]]; then
    echo "## Releases"
    echo
    echo "- No semver release tags found."
    exit 0
  fi

  for tag in "${selected_tags[@]}"; do
    section_file="$tmp_dir/${tag}.md"
    release_date="$(git for-each-ref --format='%(creatordate:short)' "refs/tags/$tag")"

    bash "$script_dir/write-release-notes.sh" \
      --channel stable \
      --tag "$tag" \
      --target "$tag" \
      --output "$section_file"

    printf '## %s - %s\n' "$tag" "$release_date"
    echo
    tail -n +3 "$section_file"
    echo
  done
} > "$output_file"
