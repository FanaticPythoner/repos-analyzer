# GitHub Pages Release Audit

## File Map

| Path                                     | Role                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| `.github/workflows/deploy.yml`           | Builds release archives, creates `latest` prerelease, deploys Pages.           |
| `justfile`                               | Local build, lint, Pages, release, changelog, and script-test entrypoints.     |
| `scripts/release/*.sh`                   | Shared release versioning, notes, changelog, archives, GitHub release actions. |
| `scripts/branch/issue-branch.sh`         | Issue URL to branch, push, and PR workflow commands.                           |
| `CHANGELOG.md`                           | Human release history generated from git commit ranges.                        |
| `src/routes/404.html.get.tsx`            | Explicit Pages 404 route for deterministic prerender output.                   |
| `src/pages/app/AppShell.island.lazy.tsx` | Static Pages client route shell for dynamic owner and repo URLs.               |
| `scripts/build-pages-fallback.ts`        | Copies the static app shell to `404.html` for GitHub Pages fallback routing.   |
| `package.json`                           | Package name and version source for release artifacts.                         |
| `.gitignore`                             | Excludes generated release archives and build outputs.                         |

## Core Flows

| Flow              | Entry                                                       | Outputs                                                | Check                                                   |
| ----------------- | ----------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------- |
| Pages deploy      | `.github/workflows/deploy.yml`                              | `.output/public`, GitHub Pages deployment              | `just lint-actions`                                     |
| Pages fallback    | `scripts/build-pages-fallback.ts`                           | `.output/public/404.html` static app shell             | `NITRO_PRESET=github_pages pnpm build`                  |
| Moving prerelease | `scripts/release/create-or-update-moving-github-release.sh` | `latest` tag and prerelease                            | `just test-release-scripts`                             |
| Stable release    | `scripts/release/create-github-release.sh`                  | GitHub release for `RELEASE_TAG`                       | `bash -n scripts/release/*.sh`                          |
| Stable prerelease | `scripts/release/create-github-prerelease.sh`               | GitHub prerelease for `RELEASE_TAG`                    | `bash -n scripts/release/*.sh`                          |
| Artifact build    | `scripts/release/build-release-artifacts.sh`                | Pages tar, Nitro tar, `SHA256SUMS`                     | `sha256sum -c SHA256SUMS`                               |
| Changelog render  | `scripts/release/render-changelog.sh`                       | `CHANGELOG.md` format                                  | `just test-release-scripts`                             |
| Issue branch flow | `scripts/branch/issue-branch.sh`                            | Branch name, branch creation, stage, push, PR commands | `issue-branch.sh name --branch fix/probe-recipe-parity` |

## Fixed Locations

| Location                                 | Change                                                              |
| ---------------------------------------- | ------------------------------------------------------------------- |
| `.github/workflows/deploy.yml`           | Added one-build deploy path with release archives and Pages upload. |
| `justfile:291`                           | Added release env bootstrap recipe.                                 |
| `justfile:297`                           | Added release notes recipe.                                         |
| `justfile:304`                           | Added changelog recipe.                                             |
| `justfile:315`                           | Added release artifact build recipe.                                |
| `justfile:323`                           | Added stable release tag creation recipe.                           |
| `justfile:332`                           | Added tagged release recipe.                                        |
| `justfile:339`                           | Added tagged prerelease recipe.                                     |
| `justfile:346`                           | Added moving prerelease recipe.                                     |
| `justfile:353`                           | Added release script self-test recipe.                              |
| `justfile:374`                           | Added BTT-compatible issue branch recipes.                          |
| `scripts/branch/issue-branch.sh`         | Added BTT-compatible issue branch command surface.                  |
| `src/routes/404.html.get.tsx`            | Added explicit GitHub Pages 404 prerender route.                    |
| `src/pages/app/AppShell.island.lazy.tsx` | Added static owner/repo route dispatch under Pages.                 |
| `scripts/build-pages-fallback.ts`        | Added GitHub Pages SPA fallback artifact generation.                |

## Scope Completion Map

| Requirement                     | Files                                                                                                                                                              | Verification                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| GitHub Pages deploy from Action | `.github/workflows/deploy.yml`, `src/routes/404.html.get.tsx`                                                                                                      | `just lint-actions`, `NITRO_PRESET=github_pages pnpm build` via artifact build                    |
| GitHub Pages dynamic app parity | `src/pages/app/AppShell.island.lazy.tsx`, `src/pages/repo/RepoPageClient.tsx`, `src/pages/repo/owner/OwnerPageClient.tsx`, `scripts/build-pages-fallback.ts`       | Local Pages server, Playwright root and deep-link screenshots                                     |
| Better Todo Tree style Justfile | `justfile`                                                                                                                                                         | `just --fmt --check`, `just --list --unsorted`                                                    |
| Release creation                | `scripts/release/create-github-release.sh`, `scripts/release/create-github-prerelease.sh`, `scripts/release/create-or-update-moving-github-release.sh`, `justfile` | `bash -n scripts/release/*.sh`, `just test-release-scripts`                                       |
| Changelog and release notes     | `CHANGELOG.md`, `scripts/release/render-changelog.sh`, `scripts/release/write-release-notes.sh`                                                                    | `just test-release-scripts`                                                                       |
| Reproducible archives           | `scripts/release/build-release-artifacts.sh`, `scripts/release/release-artifacts.sh`                                                                               | `sha256sum -c artifacts/release/SHA256SUMS`                                                       |
| Issue branch recipes            | `justfile`, `scripts/branch/issue-branch.sh`                                                                                                                       | `bash -n scripts/branch/issue-branch.sh`, `issue-branch.sh name --branch fix/probe-recipe-parity` |
| No upstream mutation by agent   | Working tree only                                                                                                                                                  | `git status --short --untracked-files=all`                                                        |
