#!/usr/bin/env bash
set -euo pipefail

remote_name='origin'
base_branch='master'
source_branch='master'
branch_name=''
no_wait=0
pr_mode='prompt'
issue_urls=()
parsed_owner=''
parsed_repo=''
parsed_number=''
target_repo_slug=''

usage()
{
  cat <<'EOF'
Usage:
  issue-branch.sh name [options] ISSUE_URL...
  issue-branch.sh create [options] ISSUE_URL...
  issue-branch.sh stage [options] ISSUE_URL...
  issue-branch.sh push [options] ISSUE_URL...
  issue-branch.sh pr [options] ISSUE_URL...
  issue-branch.sh flow [options] ISSUE_URL...

Options:
  --branch NAME        Override derived branch name.
  --remote NAME        Git remote for base fetch and branch push. Default: origin.
  --base NAME          Remote base branch. Default: master.
  --source NAME        Local source branch carrying pending changes. Default: master.
  --repo OWNER/REPO    GitHub repository for issue URLs. Default: origin URL.
  --no-wait           Push without interactive Enter prompt.
  --pr                Create PR without prompt after push.
  --no-pr             Skip PR creation after push.
  -h, --help          Show usage.

Default branch:
  fix/issue-N-title-slug
  fix/issues-N-N-title-slugs
EOF
}

fail()
{
  printf 'error: %s\n' "$*" >&2
  exit 1
}

require_command()
{
  command -v "$1" >/dev/null 2>&1 || fail "required command '$1' is not available."
}

repo_root()
{
  git rev-parse --show-toplevel 2>/dev/null
}

current_branch()
{
  git symbolic-ref --quiet --short HEAD
}

require_git_repo()
{
  local root=''

  require_command git
  root="$(repo_root)" || fail 'current directory is not inside a Git repository.'
  cd "$root"
}

require_remote()
{
  git remote get-url "$remote_name" >/dev/null 2>&1 || fail "remote '$remote_name' was not found."
}

remote_repo_slug()
{
  local remote_url=''

  if [[ -n "${ISSUE_BRANCH_REPO:-}" ]]; then
    printf '%s\n' "$ISSUE_BRANCH_REPO"
    return 0
  fi

  remote_url="$(git config --get "remote.${remote_name}.url")" || fail "remote '$remote_name' has no URL."

  if [[ "$remote_url" =~ ^https://github\.com/([^/]+)/([^/.]+)(\.git)?$ ]]; then
    printf '%s/%s\n' "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}"
    return 0
  fi

  if [[ "$remote_url" =~ ^git@github\.com:([^/]+)/([^/.]+)(\.git)?$ ]]; then
    printf '%s/%s\n' "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}"
    return 0
  fi

  fail "unsupported GitHub remote URL '$remote_url'."
}

parse_args()
{
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --branch)
        [[ $# -ge 2 ]] || fail '--branch requires a value.'
        branch_name="$2"
        shift 2
        ;;
      --remote)
        [[ $# -ge 2 ]] || fail '--remote requires a value.'
        remote_name="$2"
        shift 2
        ;;
      --base)
        [[ $# -ge 2 ]] || fail '--base requires a value.'
        base_branch="$2"
        shift 2
        ;;
      --source)
        [[ $# -ge 2 ]] || fail '--source requires a value.'
        source_branch="$2"
        shift 2
        ;;
      --repo)
        [[ $# -ge 2 ]] || fail '--repo requires OWNER/REPO.'
        target_repo_slug="$2"
        shift 2
        ;;
      --no-wait)
        no_wait=1
        shift
        ;;
      --pr)
        pr_mode='yes'
        shift
        ;;
      --no-pr)
        pr_mode='no'
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      --)
        shift
        while [[ $# -gt 0 ]]; do
          issue_urls+=( "$1" )
          shift
        done
        ;;
      -*)
        fail "unknown option '$1'."
        ;;
      *)
        issue_urls+=( "$1" )
        shift
        ;;
    esac
  done
}

ensure_target_repo_slug()
{
  if [[ -z "$target_repo_slug" ]]; then
    require_git_repo
    target_repo_slug="$(remote_repo_slug)"
  fi

  [[ "$target_repo_slug" =~ ^[^/]+/[^/]+$ ]] || fail "invalid repository slug '$target_repo_slug'."
}

target_owner()
{
  printf '%s\n' "${target_repo_slug%%/*}"
}

target_repo()
{
  printf '%s\n' "${target_repo_slug#*/}"
}

parse_issue_url()
{
  local url="$1"

  if [[ ! "$url" =~ ^https://github\.com/([^/]+)/([^/]+)/issues/([0-9]+)([/?#].*)?$ ]]; then
    fail "unsupported issue URL '$url'. Expected https://github.com/OWNER/REPO/issues/NUMBER."
  fi

  parsed_owner="${BASH_REMATCH[1]}"
  parsed_repo="${BASH_REMATCH[2]}"
  parsed_number="${BASH_REMATCH[3]}"

  [[ "$parsed_owner/$parsed_repo" == "$target_repo_slug" ]] || fail "issue URL must target $target_repo_slug."
}

slugify_title()
{
  printf '%s' "$1" \
    | LC_ALL=C tr '[:upper:]' '[:lower:]' \
    | LC_ALL=C sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/-{2,}/-/g'
}

read_issue_title()
{
  local url="$1"
  local metadata=''
  local title=''
  local viewed_number=''

  require_command gh
  metadata="$(env -u DEBUG -u GH_DEBUG GH_PROMPT_DISABLED=1 gh issue view "$url" --json number,title --jq '[.number, .title] | @tsv' 2>&1)" \
    || fail "could not read issue metadata for '$url': $metadata"

  viewed_number="${metadata%%$'\t'*}"
  title="${metadata#*$'\t'}"

  [[ "$viewed_number" == "$parsed_number" ]] || fail "metadata number mismatch for '$url'."
  [[ -n "$title" ]] || fail "issue '$url' has an empty title."

  printf '%s\n' "$title"
}

issue_records()
{
  local url=''
  local title=''

  [[ ${#issue_urls[@]} -gt 0 ]] || fail 'at least one GitHub issue URL is required.'

  for url in "${issue_urls[@]}"; do
    parse_issue_url "$url"
    title="$(read_issue_title "$url")"
    printf '%s\t%s\n' "$parsed_number" "$title"
  done | sort -n -k1,1
}

derive_branch_name()
{
  local records=()
  local record=''
  local number=''
  local title=''
  local slug=''
  local joined_numbers=''
  local joined_slugs=''
  local records_output=''

  records_output="$(issue_records)"
  mapfile -t records <<< "$records_output"

  for record in "${records[@]}"; do
    number="${record%%$'\t'*}"
    title="${record#*$'\t'}"
    slug="$(slugify_title "$title")"
    [[ -n "$slug" ]] || fail "issue '$number' title cannot form a branch slug."

    if [[ -z "$joined_numbers" ]]; then
      joined_numbers="$number"
      joined_slugs="$slug"
    else
      joined_numbers="${joined_numbers}-${number}"
      joined_slugs="${joined_slugs}-${slug}"
    fi
  done

  if [[ ${#records[@]} -eq 1 ]]; then
    printf 'fix/issue-%s-%s\n' "$joined_numbers" "$joined_slugs"
  else
    printf 'fix/issues-%s-%s\n' "$joined_numbers" "$joined_slugs"
  fi
}

resolve_branch_name()
{
  ensure_target_repo_slug

  if [[ -z "$branch_name" ]]; then
    branch_name="$(derive_branch_name)"
  fi

  git check-ref-format --branch "$branch_name" >/dev/null 2>&1 || fail "invalid branch name '$branch_name'."

  case "$branch_name" in
    "$base_branch"|"$source_branch"|master|main)
      fail "branch '$branch_name' is protected."
      ;;
  esac

  printf '%s\n' "$branch_name"
}

fetch_base()
{
  require_remote
  git fetch --no-tags --force "$remote_name" "+refs/heads/$base_branch:refs/remotes/$remote_name/$base_branch"
  git rev-parse --verify "refs/remotes/$remote_name/$base_branch^{commit}" >/dev/null
}

remote_branch_exists()
{
  local status=0

  set +e
  git ls-remote --exit-code --heads "$remote_name" "$branch_name" >/dev/null 2>&1
  status="$?"
  set -e

  case "$status" in
    0)
      return 0
      ;;
    2)
      return 1
      ;;
    *)
      fail "could not inspect remote branch '$remote_name/$branch_name'."
      ;;
  esac
}

require_no_branch_collision()
{
  if git rev-parse --verify "refs/heads/$branch_name" >/dev/null 2>&1; then
    fail "local branch '$branch_name' already exists."
  fi

  if remote_branch_exists; then
    fail "remote branch '$remote_name/$branch_name' already exists."
  fi
}

base_ref()
{
  printf 'refs/remotes/%s/%s\n' "$remote_name" "$base_branch"
}

create_local_branch_from_ref()
{
  git branch --no-track "$branch_name" "$1"
}

set_branch_upstream()
{
  git branch --set-upstream-to="$remote_name/$branch_name" "$branch_name" >/dev/null
}

push_branch_ref()
{
  git push "$remote_name" "refs/heads/$branch_name:refs/heads/$branch_name"
  set_branch_upstream
}

create_branch()
{
  require_git_repo
  branch_name="$(resolve_branch_name)"
  fetch_base
  require_no_branch_collision
  create_local_branch_from_ref "$(base_ref)"
  push_branch_ref
  printf 'created branch %s from %s/%s\n' "$branch_name" "$remote_name" "$base_branch"
}

require_clean_merge_state()
{
  local unmerged=''

  unmerged="$(git diff --name-only --diff-filter=U)"
  [[ -z "$unmerged" ]] || fail "unmerged paths block branch preparation: $unmerged"
}

require_source_changes()
{
  local status=0

  set +e
  git diff --quiet --exit-code HEAD
  status="$?"
  set -e

  case "$status" in
    0)
      fail 'no tracked source changes to move.'
      ;;
    1)
      return 0
      ;;
    *)
      fail 'could not inspect tracked source changes.'
      ;;
  esac
}

require_no_untracked_source_changes()
{
  local untracked=''

  untracked="$(git ls-files --others --exclude-standard)"
  [[ -z "$untracked" ]] || fail "untracked paths are present; only tracked changes can move: $untracked"
}

apply_patch_if_present()
{
  local patch_file="$1"
  local mode="$2"

  [[ -s "$patch_file" ]] || return 0

  case "$mode" in
    index)
      git apply --index "$patch_file"
      ;;
    worktree)
      git apply "$patch_file"
      ;;
    *)
      fail "unsupported patch mode '$mode'."
      ;;
  esac
}

restore_source_changes()
{
  local source_ref="$1"
  local staged_patch_file="$2"
  local unstaged_patch_file="$3"

  git switch "$source_ref" >/dev/null
  apply_patch_if_present "$staged_patch_file" index
  apply_patch_if_present "$unstaged_patch_file" worktree
}

stage_branch_changes()
{
  local active_branch=''
  local staged_patch_file=''
  local unstaged_patch_file=''

  require_git_repo
  branch_name="$(resolve_branch_name)"
  require_clean_merge_state

  active_branch="$(current_branch)" || fail 'detached HEAD cannot supply source changes.'
  [[ "$active_branch" == "$source_branch" ]] || fail "current branch '$active_branch' does not match source '$source_branch'."
  git rev-parse --verify "refs/heads/$branch_name" >/dev/null 2>&1 || fail "local branch '$branch_name' was not found."
  require_source_changes
  require_no_untracked_source_changes

  staged_patch_file="$(mktemp "${TMPDIR:-/tmp}/issue-branch-index.XXXXXX.patch")"
  unstaged_patch_file="$(mktemp "${TMPDIR:-/tmp}/issue-branch-worktree.XXXXXX.patch")"
  trap 'rm -f "$staged_patch_file" "$unstaged_patch_file"' RETURN

  git diff --cached --binary > "$staged_patch_file"
  git diff --binary > "$unstaged_patch_file"
  git restore --staged :/
  git restore --worktree :/
  git switch "$branch_name" >/dev/null

  if ! apply_patch_if_present "$staged_patch_file" index || ! apply_patch_if_present "$unstaged_patch_file" worktree; then
    restore_source_changes "$source_branch" "$staged_patch_file" "$unstaged_patch_file"
    fail "source patch apply failed on '$branch_name'. Source changes restored."
  fi

  printf 'staged changes on %s\n' "$branch_name"
}

fetch_branch()
{
  require_remote
  git fetch --no-tags --force "$remote_name" "+refs/heads/$branch_name:refs/remotes/$remote_name/$branch_name"
  git rev-parse --verify "refs/remotes/$remote_name/$branch_name^{commit}" >/dev/null
}

remote_branch_ref_exists()
{
  if remote_branch_exists; then
    fetch_branch >/dev/null
    return 0
  fi

  return 1
}

commits_ahead_of()
{
  git rev-list --count "$1"..HEAD
}

push_current_branch()
{
  git push "$remote_name" "HEAD:refs/heads/$branch_name"
  set_branch_upstream
}

push_after_commit()
{
  local active_branch=''
  local ahead_count='0'
  local compare_ref=''

  require_git_repo
  branch_name="$(resolve_branch_name)"
  fetch_base

  while true; do
    active_branch="$(current_branch)" || fail 'detached HEAD cannot be pushed.'
    [[ "$active_branch" == "$branch_name" ]] || fail "current branch '$active_branch' does not match target '$branch_name'."

    if remote_branch_ref_exists; then
      compare_ref="$remote_name/$branch_name"
    else
      compare_ref="$(base_ref)"
    fi

    ahead_count="$(commits_ahead_of "$compare_ref")"
    if [[ "$ahead_count" != '0' ]]; then
      push_current_branch
      printf 'pushed %s commit(s) to %s/%s\n' "$ahead_count" "$remote_name" "$branch_name"
      return 0
    fi

    [[ "$no_wait" -eq 0 ]] || fail "branch '$branch_name' has no local commits ahead of '$compare_ref'."
    printf "Commit staged changes on '%s'. Press Enter to push '%s/%s' after commit." "$branch_name" "$remote_name" "$branch_name"
    read -r _
  done
}

create_pr()
{
  require_git_repo
  require_command gh
  branch_name="$(resolve_branch_name)"
  env -u DEBUG -u GH_DEBUG GH_PROMPT_DISABLED=1 gh pr create \
    --repo "$target_repo_slug" \
    --base "$base_branch" \
    --head "$(target_owner):$branch_name" \
    --fill
}

prompt_pr()
{
  local answer=''

  case "$pr_mode" in
    yes)
      create_pr
      ;;
    no)
      printf 'pull request creation skipped\n'
      ;;
    prompt)
      [[ -t 0 ]] || fail 'TTY required for PR prompt. Use --pr or --no-pr.'
      printf 'Create pull request into %s %s for %s? [Y/n] ' "$target_repo_slug" "$base_branch" "$branch_name"
      read -r answer
      case "$answer" in
        ''|y|Y|yes|YES)
          create_pr
          ;;
        n|N|no|NO)
          printf 'pull request creation skipped\n'
          ;;
        *)
          fail "unsupported answer '$answer'."
          ;;
      esac
      ;;
    *)
      fail "unsupported PR mode '$pr_mode'."
      ;;
  esac
}

ensure_flow_branch()
{
  local local_ref="refs/heads/$branch_name"
  local remote_ref="refs/remotes/$remote_name/$branch_name"

  require_git_repo
  branch_name="$(resolve_branch_name)"
  fetch_base

  if git rev-parse --verify "$local_ref" >/dev/null 2>&1; then
    return 0
  fi

  if remote_branch_exists; then
    fetch_branch >/dev/null
    create_local_branch_from_ref "$remote_ref"
    set_branch_upstream
    return 0
  fi

  create_local_branch_from_ref "$(base_ref)"
}

flow()
{
  branch_name="$(resolve_branch_name)"
  ensure_flow_branch
  stage_branch_changes
  push_after_commit
  prompt_pr
}

main()
{
  local command_name="${1:-flow}"

  if [[ $# -gt 0 ]]; then
    shift
  fi

  parse_args "$@"

  case "$command_name" in
    name)
      require_command git
      resolve_branch_name
      ;;
    create)
      create_branch
      ;;
    stage)
      stage_branch_changes
      ;;
    push)
      push_after_commit
      ;;
    pr)
      create_pr
      ;;
    flow)
      flow
      ;;
    -h|--help|help)
      usage
      ;;
    *)
      fail "unknown command '$command_name'."
      ;;
  esac
}

main "$@"
