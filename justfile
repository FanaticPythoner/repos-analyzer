set shell := ["bash", "-euo", "pipefail", "-c"]

node_bootstrap := '''
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

# Re-anchor NVM_DIR onto $SUDO_USER home when sudo hides user-level nvm.
if [[ -n "${SUDO_USER:-}" ]] && [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
  sudo_user_home="$(getent passwd "$SUDO_USER" 2>/dev/null | cut -d: -f6)"
  if [[ -n "$sudo_user_home" ]] && [[ -s "$sudo_user_home/.nvm/nvm.sh" ]]; then
    export NVM_DIR="$sudo_user_home/.nvm"
  fi
fi

if ! command -v node >/dev/null 2>&1 || ! command -v corepack >/dev/null 2>&1; then
  if [[ -s "$NVM_DIR/nvm.sh" ]]; then
    . "$NVM_DIR/nvm.sh"
    nvm use --silent >/dev/null 2>&1
  fi
fi

if ! command -v node >/dev/null 2>&1; then
  latest_nvm_node="$(find "$NVM_DIR/versions/node" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | sort -V | tail -n 1)"
  if [[ -n "$latest_nvm_node" ]]; then
    export PATH="$latest_nvm_node/bin:$PATH"
  fi
fi

# Linuxbrew Node path covers sudo secure_path and non-login shells.
if ! command -v node >/dev/null 2>&1 && [[ -x /home/linuxbrew/.linuxbrew/bin/node ]]; then
  export PATH="/home/linuxbrew/.linuxbrew/bin:$PATH"
fi

command -v node >/dev/null 2>&1 || { echo "error: Node.js is not available." >&2; exit 1; }
command -v corepack >/dev/null 2>&1 || { echo "error: corepack is not available." >&2; exit 1; }

package_manager="$(node - <<'NODE'
const fs = require("node:fs");
const value = JSON.parse(fs.readFileSync("package.json", "utf8")).packageManager;
if (typeof value !== "string" || !/^pnpm@\d+\.\d+\.\d+(?:[+-].+)?$/.test(value)) {
  console.error("error: package.json packageManager must be pnpm@<version>.");
  process.exit(1);
}
process.stdout.write(value);
NODE
)"
pnpm_descriptor="${package_manager%%+*}"
pnpm_version="${pnpm_descriptor#pnpm@}"

if ! command -v pnpm >/dev/null 2>&1; then
  corepack enable pnpm >/dev/null
fi

corepack prepare "$pnpm_descriptor" --activate >/dev/null
actual_pnpm_version="$(pnpm --version)"
if [[ "$actual_pnpm_version" != "$pnpm_version" ]]; then
  echo "error: pnpm $pnpm_version required; found $actual_pnpm_version." >&2
  exit 1
fi
'''

actions_bootstrap := '''
tools_root="$PWD/.cache/just-tools"
bin_dir="$tools_root/bin"
downloads_dir="$tools_root/downloads"
actionlint_version="1.7.12"
act_version="0.2.87"

mkdir -p "$bin_dir" "$downloads_dir"

case "$(uname -m)" in
  x86_64|amd64)
    actionlint_arch="amd64"
    act_archive="act_Linux_x86_64.tar.gz"
    ;;
  aarch64|arm64)
    actionlint_arch="arm64"
    act_archive="act_Linux_arm64.tar.gz"
    ;;
  *)
    echo "error: unsupported architecture $(uname -m)." >&2
    exit 1
    ;;
esac

if [[ ! -x "$bin_dir/actionlint" ]]; then
  actionlint_archive="actionlint_${actionlint_version}_linux_${actionlint_arch}.tar.gz"
  curl -fsSL "https://github.com/rhysd/actionlint/releases/download/v${actionlint_version}/${actionlint_archive}" -o "$downloads_dir/$actionlint_archive"
  tar -xzf "$downloads_dir/$actionlint_archive" -C "$bin_dir" actionlint
  chmod +x "$bin_dir/actionlint"
fi

if [[ ! -x "$bin_dir/act" ]]; then
  curl -fsSL "https://github.com/nektos/act/releases/download/v${act_version}/${act_archive}" -o "$downloads_dir/$act_archive"
  tar -xzf "$downloads_dir/$act_archive" -C "$bin_dir" act
  chmod +x "$bin_dir/act"
fi

export PATH="$bin_dir:$PATH"

command -v actionlint >/dev/null 2>&1 || { echo "error: actionlint is not available." >&2; exit 1; }
command -v act >/dev/null 2>&1 || { echo "error: act is not available." >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "error: curl is not available." >&2; exit 1; }
command -v tar >/dev/null 2>&1 || { echo "error: tar is not available." >&2; exit 1; }
'''

# Examples:
#   just
# just default
default:
    @just --list --unsorted

# Examples:
# just setup
setup:
    #!/usr/bin/env bash
    set -euo pipefail
    {{ node_bootstrap }}
    pnpm install --frozen-lockfile

# Examples:
# just prepare
prepare:
    #!/usr/bin/env bash
    set -euo pipefail
    {{ node_bootstrap }}
    pnpm prepare

# Examples:
# just prepare-tools
prepare-tools:
    #!/usr/bin/env bash
    set -euo pipefail
    {{ node_bootstrap }}
    pnpm prepare:tools

# Examples:
# just prepare-nitro
prepare-nitro:
    #!/usr/bin/env bash
    set -euo pipefail
    {{ node_bootstrap }}
    pnpm prepare:nitro

# Examples:
# just build
build:
    #!/usr/bin/env bash
    set -euo pipefail
    {{ node_bootstrap }}
    pnpm build

# Examples:
# just build-languages
build-languages:
    #!/usr/bin/env bash
    set -euo pipefail
    {{ node_bootstrap }}
    pnpm build:languages

# Examples:
# just build-sitemap
build-sitemap:
    #!/usr/bin/env bash
    set -euo pipefail
    {{ node_bootstrap }}
    pnpm build:sitemap

# Examples:
# just build-vite
build-vite:
    #!/usr/bin/env bash
    set -euo pipefail
    {{ node_bootstrap }}
    pnpm build:vite

# Examples:
# just build-nitro
build-nitro:
    #!/usr/bin/env bash
    set -euo pipefail
    {{ node_bootstrap }}
    pnpm build:nitro

# Examples:
# just pages-build
pages-build:
    #!/usr/bin/env bash
    set -euo pipefail
    {{ node_bootstrap }}
    NITRO_PRESET=github_pages pnpm build

# Examples:
# just pages-verify
pages-verify:
    #!/usr/bin/env bash
    set -euo pipefail
    just pages-build
    test -f .output/public/index.html
    test -d .output/public/assets

# Examples:
# just lint
lint:
    #!/usr/bin/env bash
    set -euo pipefail
    {{ node_bootstrap }}
    pnpm lint

# Examples:
# just lint-oxlint
lint-oxlint:
    #!/usr/bin/env bash
    set -euo pipefail
    {{ node_bootstrap }}
    pnpm lint:oxlint

# Examples:
# just lint-tsc
lint-tsc:
    #!/usr/bin/env bash
    set -euo pipefail
    {{ node_bootstrap }}
    pnpm lint:tsc

# Examples:
# just lint-format
lint-format:
    #!/usr/bin/env bash
    set -euo pipefail
    {{ node_bootstrap }}
    pnpm lint:format

# Examples:
# just lint-actions
lint-actions:
    #!/usr/bin/env bash
    set -euo pipefail
    {{ actions_bootstrap }}
    actionlint .github/workflows/*.yml

# Examples:
# just format
format:
    #!/usr/bin/env bash
    set -euo pipefail
    {{ node_bootstrap }}
    pnpm format

# Examples:
# just test
test:
    #!/usr/bin/env bash
    set -euo pipefail
    just ci
    just test-commit-activity
    just test-repo-refs
    just test-search-input
    just test-release-scripts

# Examples:
# just test-commit-activity
test-commit-activity:
    #!/usr/bin/env bash
    set -euo pipefail
    {{ node_bootstrap }}
    pnpm test:commit-activity

# Examples:
# just test-repo-refs
test-repo-refs:
    #!/usr/bin/env bash
    set -euo pipefail
    {{ node_bootstrap }}
    pnpm test:repo-refs

# Examples:
# just test-search-input
test-search-input:
    #!/usr/bin/env bash
    set -euo pipefail
    {{ node_bootstrap }}
    pnpm test:search-input

# Examples:
# just ci
ci:
    #!/usr/bin/env bash
    set -euo pipefail
    just build
    just lint

# Examples:
# just test-actions-ci
test-actions-ci:
    #!/usr/bin/env bash
    set -euo pipefail
    {{ actions_bootstrap }}
    command -v docker >/dev/null 2>&1 || { echo "error: docker is not available." >&2; exit 1; }
    rm -rf .cache/act-artifacts
    mkdir -p .cache/act-artifacts
    act pull_request \
      -W .github/workflows/ci.yml \
      -j ci \
      -P ubuntu-latest=ghcr.io/catthehacker/ubuntu:act-24.04 \
      --container-architecture linux/amd64 \
      --artifact-server-path .cache/act-artifacts

# Examples:
# just test-actions-release-build
test-actions-release-build:
    #!/usr/bin/env bash
    set -euo pipefail
    {{ node_bootstrap }}
    bash scripts/release/build-release-artifacts.sh
    (cd artifacts/release && sha256sum -c SHA256SUMS)

# Examples:
# just test-actions-latest-build
test-actions-latest-build:
    #!/usr/bin/env bash
    set -euo pipefail
    just test-release-scripts

# Examples:
# just test-actions
test-actions:
    #!/usr/bin/env bash
    set -euo pipefail
    just test
    just lint-actions
    just test-actions-ci
    just test-actions-release-build
    just test-actions-latest-build

# Examples:
# just bootstrap-release-env
bootstrap-release-env:
    #!/usr/bin/env bash
    set -euo pipefail
    bash scripts/release/bootstrap-release-environment.sh

# Examples:
# just release-notes -- --tag latest --target HEAD --output artifacts/release-notes/latest.md
release-notes *args:
    #!/usr/bin/env bash
    set -euo pipefail
    {{ node_bootstrap }}
    bash scripts/release/write-release-notes.sh {{ args }}

# Examples:
# just changelog
# just changelog -- --include-head
changelog *args:
    #!/usr/bin/env bash
    set -euo pipefail
    {{ node_bootstrap }}
    bash scripts/release/render-changelog.sh {{ args }}

# Examples:
# just build-release-artifacts
build-release-artifacts:
    #!/usr/bin/env bash
    set -euo pipefail
    {{ node_bootstrap }}
    bash scripts/release/build-release-artifacts.sh

# Examples:
# just next-release --bump patch
# just next-release --bump patch --push
next-release *args:
    #!/usr/bin/env bash
    set -euo pipefail
    {{ node_bootstrap }}
    bash scripts/release/create-next-release.sh {{ args }}

# Examples:
# RELEASE_TAG=v0.1.0 just create-github-release
create-github-release:
    #!/usr/bin/env bash
    set -euo pipefail
    bash scripts/release/create-github-release.sh

# Examples:
# RELEASE_TAG=v0.1.0 just create-github-prerelease
create-github-prerelease:
    #!/usr/bin/env bash
    set -euo pipefail
    bash scripts/release/create-github-prerelease.sh

# Examples:
# just create-moving-github-prerelease
create-moving-github-prerelease:
    #!/usr/bin/env bash
    set -euo pipefail
    bash scripts/release/create-or-update-moving-github-release.sh

# Examples:
# just test-release-scripts
test-release-scripts:
    #!/usr/bin/env bash
    set -euo pipefail
    {{ node_bootstrap }}

    tmp_dir="$(mktemp -d)"
    trap 'rm -rf "$tmp_dir"' EXIT

    bash -n scripts/release/*.sh
    bash scripts/release/write-release-notes.sh \
      --channel latest \
      --tag latest \
      --target HEAD \
      --target-branch "$(git branch --show-current)" \
      --output "$tmp_dir/latest.md"
    bash scripts/release/render-changelog.sh \
      --include-head \
      --output "$tmp_dir/CHANGELOG.md"
    test -s "$tmp_dir/latest.md"
    test -s "$tmp_dir/CHANGELOG.md"

# Examples:
# just issue-branch-all https://github.com/FanaticPythoner/repos-analyzer/issues/1
issue-branch-all *args:
    #!/usr/bin/env bash
    set -euo pipefail
    bash scripts/branch/issue-branch.sh flow {{ args }}

# Examples:
# just issue-branch-name https://github.com/FanaticPythoner/repos-analyzer/issues/1
issue-branch-name *args:
    #!/usr/bin/env bash
    set -euo pipefail
    bash scripts/branch/issue-branch.sh name {{ args }}

# Examples:
# just issue-branch-create https://github.com/FanaticPythoner/repos-analyzer/issues/1
issue-branch-create *args:
    #!/usr/bin/env bash
    set -euo pipefail
    bash scripts/branch/issue-branch.sh create {{ args }}

# Examples:
# just issue-branch-stage https://github.com/FanaticPythoner/repos-analyzer/issues/1
issue-branch-stage *args:
    #!/usr/bin/env bash
    set -euo pipefail
    bash scripts/branch/issue-branch.sh stage {{ args }}

# Examples:
# just issue-branch-push https://github.com/FanaticPythoner/repos-analyzer/issues/1
issue-branch-push *args:
    #!/usr/bin/env bash
    set -euo pipefail
    bash scripts/branch/issue-branch.sh push {{ args }}

# Examples:
# just issue-branch-pr https://github.com/FanaticPythoner/repos-analyzer/issues/1
issue-branch-pr *args:
    #!/usr/bin/env bash
    set -euo pipefail
    bash scripts/branch/issue-branch.sh pr {{ args }}

# Examples:
#   just dev
# just dev -- --host 0.0.0.0
dev *args:
    #!/usr/bin/env bash
    set -euo pipefail
    {{ node_bootstrap }}
    pnpm dev {{ args }}

# Examples:
# just preview
preview *args:
    #!/usr/bin/env bash
    set -euo pipefail
    {{ node_bootstrap }}
    pnpm preview {{ args }}

# Examples:
#   just clean
#   just clean --force
# just clean force
clean *flags:
    #!/usr/bin/env bash
    set -euo pipefail

    force=0

    for flag in {{ flags }}; do
      case "$flag" in
        force|--force|-f)
          force=1
          ;;
        *)
          echo "error: unsupported clean flag '$flag'. Supported flag: force" >&2
          exit 1
          ;;
      esac
    done

    rm -rf dist dist-vite .nitro .output artifacts node_modules/.cache
    rm -rf .cache/act-artifacts .cache/just-tools

    if [[ "$force" -eq 1 ]]; then
      rm -rf node_modules
    fi
