const gitHubOwnerPattern = "[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?";
const gitHubRepoPattern = "[A-Za-z0-9._-]+";

const gitHubUrlRegex = new RegExp(
	`^(?:https?:\\/\\/)?(?:www\\.)?github\\.com\\/(?<owner>${gitHubOwnerPattern})(?:\\/(?<repo>${gitHubRepoPattern})(?:[\\/?#].*)?)?\\/?$`,
	"i",
);
const gitHubRepoPathRegex = new RegExp(
	`^(?<owner>${gitHubOwnerPattern})\\/(?<repo>${gitHubRepoPattern})\\/?$`,
);
const gitHubOwnerPathRegex = new RegExp(`^(?<owner>${gitHubOwnerPattern})\\/$`);
const incompleteGitHubPathRegex = new RegExp(`^${gitHubOwnerPattern}\\/$`);

export const SEARCH_DEBOUNCE_MS = 900;
export const SEARCH_RESULT_LIMIT = 10;
export const MIN_SEARCH_QUERY_LENGTH = 3;

export interface SearchNavigationTarget {
	owner: string;
	path: string;
	repo?: string;
}

const trimInput = (value: string): string => value.trim();

const fromGitHubUrl = (value: string): SearchNavigationTarget | null => {
	const match = gitHubUrlRegex.exec(value);
	const owner = match?.groups?.owner;

	if (!owner) {
		return null;
	}

	const repo = match.groups?.repo;

	return repo ? { owner, repo, path: `/${owner}/${repo}` } : { owner, path: `/${owner}` };
};

const fromRepositoryPath = (value: string): SearchNavigationTarget | null => {
	const match = gitHubRepoPathRegex.exec(value);
	const owner = match?.groups?.owner;
	const repo = match?.groups?.repo;

	return owner && repo ? { owner, repo, path: `/${owner}/${repo}` } : null;
};

const fromOwnerPath = (value: string): SearchNavigationTarget | null => {
	const match = gitHubOwnerPathRegex.exec(value);
	const owner = match?.groups?.owner;

	return owner ? { owner, path: `/${owner}` } : null;
};

export const getSearchNavigationTarget = (value: string): SearchNavigationTarget | null => {
	const input = trimInput(value);

	return fromGitHubUrl(input) ?? fromRepositoryPath(input) ?? fromOwnerPath(input);
};

export const normalizePastedSearchInput = (value: string): string => {
	const input = trimInput(value);
	const target = fromGitHubUrl(input);

	return target?.repo ? `${target.owner}/${target.repo}` : input;
};

export const getSearchQueryCandidate = (value: string): string => {
	const input = trimInput(value);

	if (input.length < MIN_SEARCH_QUERY_LENGTH) {
		return "";
	}

	const urlTarget = fromGitHubUrl(input);
	if (urlTarget) {
		return urlTarget.repo ? `${urlTarget.owner}/${urlTarget.repo}` : "";
	}

	if (incompleteGitHubPathRegex.test(input)) {
		return "";
	}

	return input;
};
