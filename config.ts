import { execFileSync } from "node:child_process";
import { normalizeBasePath, normalizeSiteUrl } from "./src/lib/public-path";

export const CLIENT_ENTRY = "./src/client/index.tsx";

interface RepositorySlug {
	owner: string;
	name: string;
}

const readRemoteUrl = (): string | null => {
	try {
		return execFileSync("git", ["config", "--get", "remote.origin.url"], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
	} catch {
		return null;
	}
};

const repositorySlugFromRemote = (): RepositorySlug | null => {
	const remoteUrl = readRemoteUrl();
	const match =
		remoteUrl?.match(/^https:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?$/) ??
		remoteUrl?.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/);

	if (!match) {
		return null;
	}

	return { owner: match[1], name: match[2] };
};

const repositorySlugFromEnv = (): RepositorySlug | null => {
	const repository = process.env.GITHUB_REPOSITORY;

	if (!repository) {
		return null;
	}

	const [owner, name] = repository.split("/");

	if (!owner || !name) {
		throw new Error("GITHUB_REPOSITORY must match <owner>/<repo>.");
	}

	return { owner, name };
};

const getRepositorySlug = (): RepositorySlug | null => {
	return repositorySlugFromEnv() ?? repositorySlugFromRemote();
};

const requireRepositorySlug = (): RepositorySlug => {
	const slug = getRepositorySlug();

	if (!slug) {
		throw new Error("GitHub repository slug is required for GitHub Pages output.");
	}

	return slug;
};

export const getRepositoryName = (): string => {
	return requireRepositorySlug().name;
};

export const getRepositoryOwner = (): string => {
	return requireRepositorySlug().owner;
};

export const getRepositoryUrl = (): string => {
	const { owner, name } = requireRepositorySlug();

	return `https://github.com/${owner}/${name}`;
};

export const isGitHubPagesBuild = (): boolean => {
	return process.env.NITRO_PRESET === "github_pages" || process.env.GITHUB_PAGES === "true";
};

export const getAppBasePath = (): string => {
	return normalizeBasePath(
		process.env.APP_BASE_PATH ??
			process.env.GITHUB_PAGES_BASE_PATH ??
			(isGitHubPagesBuild() ? `/${getRepositoryName()}/` : "/"),
	);
};

export const getGitHubPagesSiteUrl = (): string => {
	const { owner, name } = requireRepositorySlug();
	const siteUrl = normalizeSiteUrl(`https://${owner.toLowerCase()}.github.io/${name}/`);

	if (!siteUrl) {
		throw new Error("GitHub Pages site URL is required.");
	}

	return siteUrl;
};

export const getPublicSiteUrl = (): string | null => {
	return normalizeSiteUrl(
		process.env.PUBLIC_SITE_URL ??
			process.env.GITHUB_PAGES_SITE_URL ??
			(isGitHubPagesBuild() ? getGitHubPagesSiteUrl() : null),
	);
};
