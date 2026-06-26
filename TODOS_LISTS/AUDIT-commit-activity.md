# AUDIT: Commit Activity

## File Map

| Path                                                                             | Role                                                                              |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `src/lib/github/commit-activity.ts`                                              | Commit-list normalization, activity window construction, pagination link parsing. |
| `src/lib/github/api.ts`                                                          | Branch-aware GitHub commits endpoint pagination and activity aggregation.         |
| `src/lib/query/useQuery.tsx`                                                     | In-flight query dedupe and stale response guard.                                  |
| `src/pages/repo/components/CommitsSection/index.tsx`                             | Client-only commit activity island boundary.                                      |
| `src/pages/repo/components/CommitsSection/CommitsSectionContent.island.lazy.tsx` | Branch-aware query and dynamic heatmap rendering.                                 |
| `scripts/test-commit-activity.ts`                                                | Deterministic aggregation and Link header tests.                                  |
| `package.json`                                                                   | `test:commit-activity` script registration.                                       |
| `justfile`                                                                       | `test-commit-activity` recipe and `test` recipe integration.                      |

## Flow Map

| Flow               | Input                                                            | Output                                                         |
| ------------------ | ---------------------------------------------------------------- | -------------------------------------------------------------- |
| Repo page load     | `owner`, `repo`, `branch`                                        | Commit island skeleton renders without server-side stats wait. |
| Activity fetch     | GitHub `/repos/{owner}/{repo}/commits?sha={branch}&since={date}` | Paginated commit objects.                                      |
| Aggregation        | Commit committer dates                                           | 365-day Sunday-indexed week grid.                              |
| Heatmap render     | Activity week grid                                               | Dynamic SVG width matching week count.                         |
| Duplicate rerender | Same query key while request is pending                          | Existing in-flight promise reused.                             |

## Fixed Locations

| Location                                | Change                                                        | Effect                                                          |
| --------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------- |
| `api.ts`                                | Removed `/stats/commit_activity` polling path.                | Eliminates `202` polling delay.                                 |
| `api.ts`                                | Added `sha=branch`, `since`, `per_page=100`, Link pagination. | Commit data matches selected branch and includes merge commits. |
| `commit-activity.ts`                    | Added 365-day UTC aggregation.                                | ChainedPy shows 7 commits in active window.                     |
| `CommitsSection/index.tsx`              | Removed server-side activity fetch.                           | Repo shell renders without blocking on commit graph.            |
| `CommitsSectionContent.island.lazy.tsx` | Query key includes `branch`.                                  | Branch changes invalidate activity cache.                       |
| `useQuery.tsx`                          | In-flight request cache.                                      | Rerenders do not duplicate commit requests.                     |

## Scope Completion Map

| Requirement                    | Concrete implementation                                                     | Verification                                                         |
| ------------------------------ | --------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Correct commit count           | `buildCommitActivity` counts commit-list entries by UTC day.                | `pnpm test:commit-activity` expects ChainedPy fixture total `7`.     |
| Branch correctness             | `getCommitActivity(owner, repo, branch, signal)` passes `sha`.              | `pnpm lint` type-checks component/API call chain.                    |
| Faster load                    | Commit section is client island and no longer SSR-waits for stats endpoint. | Browser harness loads repo page and observes no stats endpoint call. |
| No stats polling               | `/stats/commit_activity` removed from API path.                             | `rg stats/commit_activity src` returns no matches.                   |
| No duplicate same-key requests | `requestCache` reused while pending.                                        | Browser harness observes one commit page request per page.           |

## Complexity

| Operation   | Time                               | Space               |
| ----------- | ---------------------------------- | ------------------- |
| Page fetch  | O(p) requests for p pages          | O(c) commit objects |
| Aggregation | O(c + w) for c commits and w weeks | O(w) week grid      |
| Link parse  | O(l) over Link header length       | O(1) auxiliary      |

## Commands

| Command                                                                                                                              | Result |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| `pnpm test:commit-activity`                                                                                                          | Pass   |
| `pnpm test:search-input`                                                                                                             | Pass   |
| `pnpm lint`                                                                                                                          | Pass   |
| `GITHUB_REPOSITORY=FanaticPythoner/repos-analyzer NITRO_PRESET=github_pages bash -lc 'pnpm build && pnpm run verify:pages-artifact'` | Pass   |
| Commit browser harness against `.output/public`                                                                                      | Pass   |
| `just test`                                                                                                                          | Pass   |
