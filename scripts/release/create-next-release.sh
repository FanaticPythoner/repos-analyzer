#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./release-versioning.sh
source "$script_dir/release-versioning.sh"

bump='patch'
push_release=0

require_clean_worktree()
{
  local status_output=''

  status_output="$(git status --short)"
  if [[ -n "$status_output" ]]; then
    echo "error: working tree must be clean before release creation." >&2
    printf '%s\n' "$status_output" >&2
    return 1
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --)
      shift
      ;;
    --bump)
      bump="$2"
      shift 2
      ;;
    --push)
      push_release=1
      shift
      ;;
    *)
      echo "error: unknown argument '$1'." >&2
      exit 1
      ;;
  esac
done

require_clean_worktree

latest_tag="$(latest_release_tag)"
current_version="$(release_package_version)"

if [[ -n "$latest_tag" ]]; then
  next_version="$(increment_release_version "${latest_tag#v}" "$bump")"
else
  next_version="$current_version"
fi

next_tag="v${next_version}"

if git rev-parse "$next_tag" >/dev/null 2>&1; then
  echo "error: tag '$next_tag' exists." >&2
  exit 1
fi

if [[ "$current_version" != "$next_version" ]]; then
  node - "$next_version" <<'NODE'
const fs = require("node:fs");
const nextVersion = process.argv[2];
const file = "package.json";
const contents = JSON.parse(fs.readFileSync(file, "utf8"));
contents.version = nextVersion;
fs.writeFileSync(file, JSON.stringify(contents, null, "\t") + "\n");
NODE
  git add package.json
  git commit -m "release: ${next_tag}"
fi

git tag -a "$next_tag" -m "Release ${next_tag}"

notes_file="artifacts/release-notes/${next_tag}.md"
bash "$script_dir/write-release-notes.sh" \
  --channel stable \
  --tag "$next_tag" \
  --target "$next_tag" \
  --output "$notes_file"

if [[ "$push_release" -eq 1 ]]; then
  git push origin master
  git push origin "$next_tag"
fi

printf 'Created %s.\n' "$next_tag"
printf 'Release notes: %s\n' "$notes_file"
