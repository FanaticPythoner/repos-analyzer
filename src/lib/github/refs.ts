export type GitHubRepoRefKind = "branch" | "tag" | "release";

export interface GitHubRepoRef {
	kind: GitHubRepoRefKind;
	label: string;
	value: string;
}

export interface GitHubRepoRefGroups {
	branches: GitHubRepoRef[];
	tags: GitHubRepoRef[];
	releases: GitHubRepoRef[];
}

export interface GitHubRepoRefsInput {
	branches: { name: string }[];
	defaultBranch?: string | null;
	tags: { name: string }[];
	releases: { name?: string | null; tag_name: string }[];
}

export const repoRefKey = (kind: GitHubRepoRefKind, value: string): string => {
	return `${kind}:${value}`;
};

const byName = <T extends { name: string }>(a: T, b: T): number => a.name.localeCompare(b.name);

const releaseLabel = (release: { name?: string | null; tag_name: string }): string => {
	return release.name ? `${release.name} (${release.tag_name})` : release.tag_name;
};

export const buildGitHubRepoRefGroups = ({
	branches,
	defaultBranch,
	tags,
	releases,
}: GitHubRepoRefsInput): GitHubRepoRefGroups => {
	const sortedBranches = branches.toSorted((a, b) => {
		if (a.name === defaultBranch) {
			return -1;
		}

		if (b.name === defaultBranch) {
			return 1;
		}

		return byName(a, b);
	});

	return {
		branches: sortedBranches.map(branch => ({
			kind: "branch",
			label: branch.name === defaultBranch ? `${branch.name} (default)` : branch.name,
			value: branch.name,
		})),
		tags: tags.toSorted(byName).map(tag => ({
			kind: "tag",
			label: tag.name,
			value: tag.name,
		})),
		releases: [...releases].map(release => ({
			kind: "release",
			label: releaseLabel(release),
			value: release.tag_name,
		})),
	};
};

export const findGitHubRepoRef = (
	groups: GitHubRepoRefGroups,
	value: string,
	kind?: GitHubRepoRefKind | null,
): GitHubRepoRef | null => {
	const refs = [...groups.branches, ...groups.tags, ...groups.releases];

	return (
		refs.find(ref => ref.value === value && (!kind || ref.kind === kind)) ??
		refs.find(ref => ref.value === value) ??
		null
	);
};
