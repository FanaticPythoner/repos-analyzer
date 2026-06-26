# AUDIT: Search API Throttle

## File Map

| Path                                                          | Role                                                                             |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/pages/index/components/IndexPageContent.island.lazy.tsx` | Search input state, keyboard handling, result selection, search button handling. |
| `src/pages/index/components/search-input-behavior.ts`         | Pure parsing, normalization, debounce constants, direct navigation targets.      |
| `src/lib/github/api.ts`                                       | GitHub search fetcher with `AbortSignal` propagation.                            |
| `src/lib/query/useQuery.tsx`                                  | Query key hashing, result cache, in-flight request dedupe, abort guards.         |
| `scripts/test-search-input-behavior.ts`                       | Deterministic parser and behavior invariant test.                                |
| `package.json`                                                | `test:search-input` script registration.                                         |
| `justfile`                                                    | `test-search-input` recipe and `test` recipe integration.                        |

## Flow Map

| Flow                  | Input                                                   | Network condition                                               |
| --------------------- | ------------------------------------------------------- | --------------------------------------------------------------- |
| Draft typing          | Local `inputValue` changes                              | No URL write. No GitHub request before debounce.                |
| Debounced search      | `getSearchQueryCandidate(inputValue)` stable for 900 ms | One `/search/repositories` request per uncached key.            |
| Incomplete owner path | `FanaticPythoner/`                                      | Candidate is empty. No search request.                          |
| Enter owner path      | `FanaticPythoner/`                                      | Direct navigation to `/FanaticPythoner`. No search request.     |
| Enter repo path       | `owner/repo`                                            | Direct navigation to `/owner/repo`. No search request required. |
| Enter text search     | Non-path query without selected result                  | Immediate commit to query key and URL. One deduped request.     |
| Stale query rerender  | Same `queryKey` before response                         | Existing request reused from `requestCache`.                    |

## Fixed Locations

| Location                           | Change                                                         | Effect                                                         |
| ---------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------- |
| `IndexPageContent.island.lazy.tsx` | URL-driven input replaced by local draft plus committed query. | Keystrokes stop mutating `?query=` and history.                |
| `IndexPageContent.island.lazy.tsx` | Enter and search button share commit/navigation branch.        | Early trigger works without debounce wait.                     |
| `IndexPageContent.island.lazy.tsx` | Displayed results require `inputCandidate === committedQuery`. | Stale results cannot drive Enter selection.                    |
| `search-input-behavior.ts`         | GitHub URL, owner slash, repo path parsing isolated.           | Search behavior is reusable and testable.                      |
| `api.ts`                           | `ghApi.searchRepos` accepts `AbortSignal`.                     | Superseded fetches can abort at transport layer.               |
| `useQuery.tsx`                     | `dataCache`, `requestCache`, `keyRef` key guard, JSON hash.    | Duplicate same-key requests collapse to one in-flight promise. |

## Scope Completion Map

| Requirement                      | Concrete implementation                                            | Verification                                                               |
| -------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Stop API calls per character     | `inputValue` local state plus `committedQuery` debounce.           | Browser test: `react` call count `0` at 400 ms, `1` after debounce.        |
| Avoid API for `FanaticPythoner/` | `incompleteGitHubPathRegex` returns empty candidate.               | Browser test: count `0` after typing and waiting 1200 ms.                  |
| Trigger early by Enter           | `onKeyDown` calls direct navigation or `commitSearch`.             | Browser test: `solid` Enter produces exactly `1` request before debounce.  |
| Preserve click trigger           | Search icon changed to button using same commit/navigation branch. | `pnpm lint` and browser test cover render and click-safe component typing. |
| Abort stale search               | `ghApi.searchRepos(..., signal)` passes signal into fetcher.       | `pnpm lint` type-checks API contract.                                      |
| Deduplicate rerender requests    | `requestCache` and `keyRef.current = key` in `useQuery`.           | Browser test: Enter commit yields exactly `1` request.                     |
| Keep release/test recipes wired  | `test:search-input`, `just test-search-input`, `just test`.        | `just test` and `just test-release-scripts` exit `0`.                      |

## Complexity

| Function                    | Time                           | Space                                        |
| --------------------------- | ------------------------------ | -------------------------------------------- |
| `getSearchQueryCandidate`   | O(n) over input length         | O(1) auxiliary                               |
| `getSearchNavigationTarget` | O(n) over input length         | O(1) auxiliary                               |
| `useQuery` cache lookup     | O(k) JSON hash over key length | O(q + r) cache entries and in-flight entries |

## Commands

| Command                                                                                                                              | Result |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| `pnpm test:search-input`                                                                                                             | Pass   |
| `pnpm lint`                                                                                                                          | Pass   |
| `GITHUB_REPOSITORY=FanaticPythoner/repos-analyzer NITRO_PRESET=github_pages bash -lc 'pnpm build && pnpm run verify:pages-artifact'` | Pass   |
| Browser network harness against `.output/public`                                                                                     | Pass   |
| `just test`                                                                                                                          | Pass   |
| `just test-release-scripts`                                                                                                          | Pass   |
