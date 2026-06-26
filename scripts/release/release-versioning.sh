#!/usr/bin/env bash
set -euo pipefail

release_semver_tag_pattern='^v[0-9]+\.[0-9]+\.[0-9]+([-.][0-9A-Za-z.-]+)?$'

release_package_version()
{
  node -p "require('./package.json').version"
}

release_package_name()
{
  node -p "require('./package.json').name"
}

release_semver_tags_array()
{
  local output_name="$1"
  local -n output_ref="$output_name"
  local tag=''

  output_ref=()

  while read -r tag; do
    if [[ "$tag" =~ $release_semver_tag_pattern ]]; then
      output_ref+=("$tag")
    fi
  done < <(git tag --sort=-v:refname)
}

release_semver_tags()
{
  local tags=()
  local tag=''

  release_semver_tags_array tags

  for tag in "${tags[@]}"; do
    printf '%s\n' "$tag"
  done
}

latest_release_tag()
{
  local tags=()
  release_semver_tags_array tags

  if [[ "${#tags[@]}" -gt 0 ]]; then
    printf '%s\n' "${tags[0]}"
  fi
}

previous_release_tag()
{
  local current_tag="$1"
  local seen_current=0
  local tags=()
  local tag=''

  release_semver_tags_array tags

  for tag in "${tags[@]}"; do
    if [[ "$current_tag" == "latest" ]]; then
      printf '%s\n' "$tag"
      return 0
    fi

    if [[ "$seen_current" -eq 1 ]]; then
      printf '%s\n' "$tag"
      return 0
    fi

    if [[ "$tag" == "$current_tag" ]]; then
      seen_current=1
    fi
  done
}

increment_release_version()
{
  local version="$1"
  local bump="${2:-patch}"
  local major=''
  local minor=''
  local patch=''

  IFS='.' read -r major minor patch <<<"$version"

  if [[ ! "$major.$minor.$patch" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "error: invalid semver '$version'." >&2
    return 1
  fi

  case "$bump" in
    patch)
      patch=$((patch + 1))
      ;;
    minor)
      minor=$((minor + 1))
      patch=0
      ;;
    major)
      major=$((major + 1))
      minor=0
      patch=0
      ;;
    *)
      echo "error: unsupported bump '$bump': expected patch, minor, or major." >&2
      return 1
      ;;
  esac

  printf '%s.%s.%s\n' "$major" "$minor" "$patch"
}

release_repository_url()
{
  local remote_url=''

  if [[ -n "${RELEASE_REPOSITORY_URL:-}" ]]; then
    printf '%s\n' "${RELEASE_REPOSITORY_URL%/}"
    return 0
  fi

  remote_url="$(git config --get remote.origin.url)"

  if [[ "$remote_url" =~ ^https?:// ]]; then
    printf '%s\n' "${remote_url%.git}"
    return 0
  fi

  if [[ "$remote_url" =~ ^git@([^:]+):(.+)$ ]]; then
    printf 'https://%s/%s\n' "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]%.git}"
    return 0
  fi

  if [[ "$remote_url" =~ ^ssh://git@([^/]+)/(.+)$ ]]; then
    printf 'https://%s/%s\n' "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]%.git}"
    return 0
  fi

  echo "error: unsupported remote.origin.url '$remote_url'." >&2
  return 1
}

release_first_commit()
{
  git rev-list --max-parents=0 HEAD | tail -n 1
}
