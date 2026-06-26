import { Endpoints } from "@octokit/types";
import { FetchError } from "ofetch";
import { cachedApiFunction } from "../cache";
import { dayjs } from "../dayjs";
import { baseFetcher } from "../fetcher";
import { toast } from "../toasts/toasts";
import { isClient } from "../utils";
import {
	buildCommitActivity,
	COMMIT_ACTIVITY_PAGE_CONCURRENCY,
	COMMIT_ACTIVITY_PAGE_SIZE,
	GHApiCommitActivityResponse,
	GHApiCommitResponse,
	getCommitActivitySince,
	parseLastPageFromLink,
} from "./commit-activity";
import { buildGitHubRepoRefGroups, GitHubRepoRefGroups } from "./refs";
import { getRawGitHubFileUrl } from "./utils";

const createClientFetcher = () => {
	return baseFetcher.create({
		async onResponseError(error) {
			if (error.response?.status === 403) {
				const limit = parseInt(error.response.headers.get("x-ratelimit-remaining")!, 10);
				const reset = parseInt(error.response.headers.get("x-ratelimit-reset")!, 10) * 1000;

				if (limit === 0) {
					toast.show({
						id: "github-api-limit",
						type: "error",
						content: `GitHub API limit reached. Reset ${dayjs().to(reset)}.`,
					});
				}
			}
		},
	});
};

const createServerFetcher = () => {
	return baseFetcher.create({
		retry: 0,
		async onRequest({ options }) {
			const token = import.meta.env.NITRO_GITHUB_TOKEN;

			if (token) {
				options.headers.append("Authorization", `token ${token}`);
			}
		},
		headers: {
			"User-Agent": "ghloc",
		},
	});
};

const fetcher = isClient ? createClientFetcher() : createServerFetcher();

export type GHApiGetRepoResponse = Endpoints["GET /repos/{owner}/{repo}"]["response"]["data"];

export type GHApiGetRepoHealthResponse =
	Endpoints["GET /repos/{owner}/{repo}/community/profile"]["response"]["data"];

export type GHApiGetCommitActivityResponse = GHApiCommitActivityResponse;

export type GHApiSearchReposResponse = Endpoints["GET /search/repositories"]["response"]["data"];

export type GHApiGetReposResponse = Endpoints["GET /users/{username}/repos"]["response"]["data"];

export type GHApiGetBranchesResponse =
	Endpoints["GET /repos/{owner}/{repo}/branches"]["response"]["data"];

export type GHApiGetTagsResponse = Endpoints["GET /repos/{owner}/{repo}/tags"]["response"]["data"];

export type GHApiGetReleasesResponse =
	Endpoints["GET /repos/{owner}/{repo}/releases"]["response"]["data"];

type GHApiRepoHealthFile = NonNullable<
	NonNullable<GHApiGetRepoHealthResponse["files"]>["issue_template"]
>;

type GHApiContentItem = {
	name: string;
	type: string;
	url: string;
	html_url: string | null;
};

const issueTemplateFileRegex = /\.(?:md|ya?ml)$/i;
const issueTemplateConfigRegex = /^config\.ya?ml$/i;

const getContents = async (owner: string, repo: string, path: string) => {
	try {
		return await fetcher<GHApiContentItem | GHApiContentItem[]>(
			`https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
		);
	} catch (error) {
		if (error instanceof FetchError && error.statusCode === 404) {
			return null;
		}

		throw error;
	}
};

const assertCommitPage = (value: unknown): GHApiCommitResponse[] => {
	if (!Array.isArray(value)) {
		throw new Error("GitHub commits response must be an array.");
	}

	return value;
};

const fetchCommitPage = async (
	owner: string,
	repo: string,
	branch: string,
	since: string,
	page: number,
	signal?: AbortSignal,
) => {
	const response = await fetcher.raw<GHApiCommitResponse[]>(
		`https://api.github.com/repos/${owner}/${repo}/commits`,
		{
			params: {
				sha: branch,
				since,
				per_page: COMMIT_ACTIVITY_PAGE_SIZE,
				page,
			},
			signal,
		},
	);

	return {
		commits: assertCommitPage(response._data),
		lastPage: parseLastPageFromLink(response.headers.get("link")),
	};
};

const fetchCommitActivityCommits = async (
	owner: string,
	repo: string,
	branch: string,
	since: string,
	signal?: AbortSignal,
): Promise<GHApiCommitResponse[]> => {
	const firstPage = await fetchCommitPage(owner, repo, branch, since, 1, signal);
	const commits = [...firstPage.commits];

	for (
		let pageStart = 2;
		pageStart <= firstPage.lastPage;
		pageStart += COMMIT_ACTIVITY_PAGE_CONCURRENCY
	) {
		const pageEnd = Math.min(
			pageStart + COMMIT_ACTIVITY_PAGE_CONCURRENCY - 1,
			firstPage.lastPage,
		);
		const pages = await Promise.all(
			Array.from({ length: pageEnd - pageStart + 1 }, (_, index) =>
				fetchCommitPage(owner, repo, branch, since, pageStart + index, signal),
			),
		);

		for (const page of pages) {
			commits.push(...page.commits);
		}
	}

	return commits;
};

const fetchGitHubArrayPage = async <TItem>(url: string, page: number, signal?: AbortSignal) => {
	const response = await fetcher.raw<TItem[]>(url, {
		params: {
			per_page: COMMIT_ACTIVITY_PAGE_SIZE,
			page,
		},
		signal,
	});

	if (!Array.isArray(response._data)) {
		throw new Error("GitHub paginated response must be an array.");
	}

	return {
		items: response._data,
		lastPage: parseLastPageFromLink(response.headers.get("link")),
	};
};

const fetchGitHubArray = async <TItem>(url: string, signal?: AbortSignal): Promise<TItem[]> => {
	const firstPage = await fetchGitHubArrayPage<TItem>(url, 1, signal);
	const items = [...firstPage.items];

	for (
		let pageStart = 2;
		pageStart <= firstPage.lastPage;
		pageStart += COMMIT_ACTIVITY_PAGE_CONCURRENCY
	) {
		const pageEnd = Math.min(
			pageStart + COMMIT_ACTIVITY_PAGE_CONCURRENCY - 1,
			firstPage.lastPage,
		);
		const pages = await Promise.all(
			Array.from({ length: pageEnd - pageStart + 1 }, (_, index) =>
				fetchGitHubArrayPage<TItem>(url, pageStart + index, signal),
			),
		);

		for (const page of pages) {
			items.push(...page.items);
		}
	}

	return items;
};

const isIssueTemplateFile = (item: GHApiContentItem) => {
	return (
		item.type === "file" &&
		issueTemplateFileRegex.test(item.name) &&
		!issueTemplateConfigRegex.test(item.name)
	);
};

export const ghApi = {
	getRepo: cachedApiFunction("ghApi.getRepo", (owner: string, repo: string) => {
		return fetcher<GHApiGetRepoResponse>(`https://api.github.com/repos/${owner}/${repo}`);
	}),

	getRepoHealth: cachedApiFunction("ghApi.getRepoHealth", (owner: string, repo: string) => {
		return fetcher<GHApiGetRepoHealthResponse>(
			`https://api.github.com/repos/${owner}/${repo}/community/profile`,
		);
	}),

	getRepoRefs: cachedApiFunction(
		"ghApi.getRepoRefs",
		async (
			owner: string,
			repo: string,
			defaultBranch?: string | null,
			signal?: AbortSignal,
		): Promise<GitHubRepoRefGroups> => {
			const [branches, tags, releases] = await Promise.all([
				fetchGitHubArray<GHApiGetBranchesResponse[number]>(
					`https://api.github.com/repos/${owner}/${repo}/branches`,
					signal,
				),
				fetchGitHubArray<GHApiGetTagsResponse[number]>(
					`https://api.github.com/repos/${owner}/${repo}/tags`,
					signal,
				),
				fetchGitHubArray<GHApiGetReleasesResponse[number]>(
					`https://api.github.com/repos/${owner}/${repo}/releases`,
					signal,
				),
			]);

			return buildGitHubRepoRefGroups({ branches, defaultBranch, tags, releases });
		},
	),

	getIssueTemplate: cachedApiFunction(
		"ghApi.getIssueTemplate",
		async (owner: string, repo: string): Promise<GHApiRepoHealthFile | null> => {
			const contents = await getContents(owner, repo, ".github/ISSUE_TEMPLATE");

			if (!Array.isArray(contents)) {
				return null;
			}

			const template = contents.find(isIssueTemplateFile);

			if (!template) {
				return null;
			}

			if (!template.html_url) {
				return null;
			}

			return {
				url: template.url,
				html_url: template.html_url,
			};
		},
	),

	getFile: cachedApiFunction(
		"ghApi.getFile",
		async (owner: string, repo: string, path: string, branch: string) => {
			try {
				return await baseFetcher(getRawGitHubFileUrl(owner, repo, branch, path), {
					responseType: "text",
				});
			} catch (error) {
				if (error instanceof FetchError && error.statusCode === 404) {
					return "{}";
				}

				throw error;
			}
		},
	),

	getFileMeta: cachedApiFunction(
		"ghApi.getFileMeta",
		async (owner: string, repo: string, path: string, branch: string) => {
			const url = getRawGitHubFileUrl(owner, repo, branch, path);

			const response = await baseFetcher.raw(url, { method: "HEAD" });

			const contentType = response.headers.get("content-type")!;
			const contentLength = response.headers.get("content-length");
			const size = contentLength ? parseInt(contentLength, 10) : 0;

			let type: "image" | "text" | null = null;
			if (contentType.startsWith("text/plain")) {
				type = "text";
			} else if (contentType.startsWith("image/")) {
				type = "image";
			}

			return { type, size };
		},
	),

	getCommitActivity: cachedApiFunction(
		"ghApi.getCommitActivity",
		async (owner: string, repo: string, branch: string, signal?: AbortSignal) => {
			const since = getCommitActivitySince();
			const commits = await fetchCommitActivityCommits(owner, repo, branch, since, signal);

			return buildCommitActivity(commits);
		},
	),

	searchRepos: cachedApiFunction(
		"ghApi.searchRepos",
		async (query: string, perPage = 10, signal?: AbortSignal) => {
			return fetcher<GHApiSearchReposResponse>("https://api.github.com/search/repositories", {
				params: { q: query, per_page: perPage },
				signal,
			});
		},
	),

	getRepos: cachedApiFunction("ghApi.getRepos", async (owner: string, limit = 3 * 20) => {
		return fetcher<GHApiGetReposResponse>(`https://api.github.com/users/${owner}/repos`, {
			params: { per_page: limit, sort: "updated" },
		});
	}),
};
