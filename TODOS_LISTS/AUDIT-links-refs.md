# AUDIT: Links And Refs

## File Map

| Path                                                        | Role                                              |
| ----------------------------------------------------------- | ------------------------------------------------- |
| `src/pages/repo/components/InfoSection.tsx`                 | Repo header owner/repo internal links.            |
| `src/pages/repo/owner/components/RepoCard.tsx`              | Owner page repo card internal links.              |
| `src/components/Header/index.tsx`                           | Header external links.                            |
| `src/lib/github/refs.ts`                                    | Branch, tag, release grouping and selection keys. |
| `src/lib/github/api.ts`                                     | Paginated branch, tag, release API fetching.      |
| `src/pages/repo/components/RepoRefSelector.island.lazy.tsx` | Repository ref selector and URL sync.             |
| `src/pages/repo/index.tsx`                                  | SSR repo page ref selector island.                |
| `src/pages/repo/RepoPageClient.tsx`                         | SPA repo page ref selector.                       |
| `src/lib/ghloc/api.ts`                                      | Slash-safe LOC ref URL encoding.                  |
| `scripts/test-repo-refs.ts`                                 | Deterministic ref grouping and LOC URL tests.     |
| `scripts/verify-pages-artifact.ts`                          | Pages artifact blocklist for stale upstream URLs. |

## Flow Map

| Flow               | Input                                           | Output                                                            |
| ------------------ | ----------------------------------------------- | ----------------------------------------------------------------- |
| Searched repo page | Client-rendered `InfoSectionContent`            | Internal links include `/repos-analyzer/`.                        |
| Owner page cards   | Client-rendered `RepoCardClient`                | Card links include `/repos-analyzer/`.                            |
| Header links       | Repository URL from runtime config              | Source, latest release, deploy workflow links point at this fork. |
| Ref loading        | Branches, tags, releases from GitHub REST pages | Grouped selector options.                                         |
| Ref selection      | Selector key                                    | `branch`, `refType` URL params and reset `locsPath`.              |
| LOC fetch          | Branch/tag/release value                        | Encoded ref segment sent to LOC service.                          |

## Fixed Locations

| Location                          | Change                                                         | Effect                                             |
| --------------------------------- | -------------------------------------------------------------- | -------------------------------------------------- |
| `InfoSection.tsx`                 | Default base path changed from `/` to document meta base path. | SPA repo links keep GitHub Pages subpath.          |
| `RepoCard.tsx`                    | Default base path changed from `/` to document meta base path. | SPA owner cards keep GitHub Pages subpath.         |
| `Header/index.tsx`                | Removed old upstream AMO and gist URLs.                        | Header links target current repo surfaces.         |
| `api.ts`                          | Added paginated `getRepoRefs`.                                 | Branches, tags, releases load beyond first page.   |
| `RepoRefSelector.island.lazy.tsx` | Added grouped ref selector.                                    | Branch/tag/release selection changes analyzed ref. |
| `ghloc/api.ts`                    | Encoded ref path segment.                                      | Slash refs do not split LOC service route.         |
| `verify-pages-artifact.ts`        | Added stale upstream URL blocklist.                            | Pages build fails if old links return.             |

## Scope Completion Map

| Requirement                                 | Concrete implementation                                    | Verification                                           |
| ------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------ |
| Fix searched repo links                     | `getDocumentBasePath()` defaults in client-rendered links. | Browser harness checks owner/repo href prefixes.       |
| Fix userscript link and related stale links | Header links use `repositoryUrl` releases/workflow.        | Artifact verifier blocks old AMO/gist URLs.            |
| Select branches                             | `RepoRefSelector` branch optgroup.                         | Browser harness selects `feature/x`.                   |
| Select tags                                 | `RepoRefSelector` tag optgroup.                            | `scripts/test-repo-refs.ts` covers tag selection keys. |
| Select releases                             | `RepoRefSelector` release optgroup.                        | Browser harness selects release `v1.0.0`.              |
| Preserve LOC correctness for slash refs     | `encodeURIComponent(branch)` in LOC URL.                   | `pnpm test:repo-refs` expects `feature%2Fx`.           |

## Complexity

| Operation    | Time                      | Space                       |
| ------------ | ------------------------- | --------------------------- |
| Ref fetch    | O(p) requests for p pages | O(r) refs                   |
| Ref grouping | O(b log b + t log t + r)  | O(b + t + r)                |
| Ref lookup   | O(b + t + r)              | O(b + t + r) flattened refs |

## Commands

| Command                                                                                                                              | Result |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| `pnpm test:repo-refs`                                                                                                                | Pass   |
| `pnpm lint`                                                                                                                          | Pass   |
| `GITHUB_REPOSITORY=FanaticPythoner/repos-analyzer NITRO_PRESET=github_pages bash -lc 'pnpm build && pnpm run verify:pages-artifact'` | Pass   |
| Browser link/ref harness against `.output/public`                                                                                    | Pass   |
