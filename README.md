# ghloc

![build status](https://github.com/FanaticPythoner/repos-analyzer/actions/workflows/ci.yml/badge.svg)

Repository line-count app for GitHub repositories.

## URLs

| Surface      | URL                                                 |
| ------------ | --------------------------------------------------- |
| GitHub Pages | `https://fanaticpythoner.github.io/repos-analyzer/` |
| Source       | `https://github.com/FanaticPythoner/repos-analyzer` |

## Build

```bash
pnpm install --frozen-lockfile
pnpm build
```

## GitHub Pages Build

```bash
APP_BASE_PATH=/repos-analyzer/ \
PUBLIC_SITE_URL=https://fanaticpythoner.github.io/repos-analyzer/ \
NITRO_PRESET=github_pages \
pnpm build
```

## Release Artifacts

```bash
just build-release-artifacts
```
