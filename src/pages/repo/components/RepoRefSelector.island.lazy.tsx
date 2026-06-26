import { Select } from "~/components/Select";
import { ghApi } from "~/lib/github/api";
import {
	findGitHubRepoRef,
	GitHubRepoRef,
	GitHubRepoRefGroups,
	GitHubRepoRefKind,
	repoRefKey,
} from "~/lib/github/refs";
import { useQuery } from "~/lib/query/useQuery";
import { useRouter } from "~/lib/router/useRouter";

interface RepoRefSelectorProps {
	branch: string;
	defaultBranch?: string | null;
	owner: string;
	repo: string;
}

const emptyGroups = (branch: string): GitHubRepoRefGroups => ({
	branches: [{ kind: "branch", label: branch, value: branch }],
	tags: [],
	releases: [],
});

const isRefKind = (value: string | null): value is GitHubRepoRefKind => {
	return value === "branch" || value === "tag" || value === "release";
};

const renderOptions = (label: string, refs: GitHubRepoRef[]) => {
	if (!refs.length) {
		return null;
	}

	return (
		<optgroup label={label}>
			{refs.map(ref => (
				<option
					key={repoRefKey(ref.kind, ref.value)}
					value={repoRefKey(ref.kind, ref.value)}
				>
					{ref.label}
				</option>
			))}
		</optgroup>
	);
};

export default function RepoRefSelector({
	branch,
	defaultBranch,
	owner,
	repo,
}: RepoRefSelectorProps) {
	const router = useRouter();
	const refType = router.search.get("refType");

	const refsQuery = useQuery({
		queryKey: ["repoRefs", owner, repo, defaultBranch],
		queryFn: ({ signal }) => ghApi.getRepoRefs(owner, repo, defaultBranch, signal),
	});
	const groups = refsQuery.data ?? emptyGroups(branch);
	const selectedRef =
		findGitHubRepoRef(groups, branch, isRefKind(refType) ? refType : null) ??
		groups.branches[0];

	const selectRef = (key: string) => {
		const refs = [...groups.branches, ...groups.tags, ...groups.releases];
		const nextRef = refs.find(ref => repoRefKey(ref.kind, ref.value) === key);

		if (!nextRef) {
			return;
		}

		router.setSearch(prev => {
			const next = new URLSearchParams(prev);
			next.set("branch", nextRef.value);
			next.set("refType", nextRef.kind);
			next.delete("locsPath");

			return next;
		});
	};

	return (
		<div class="flex max-w-full flex-wrap items-center gap-2">
			<span class="text-sm font-medium text-muted">Ref</span>
			<Select
				class="max-w-[18rem] truncate"
				value={repoRefKey(selectedRef.kind, selectedRef.value)}
				onChange={event => {
					if (event.target instanceof HTMLSelectElement) {
						selectRef(event.target.value);
					}
				}}
				disabled={refsQuery.status === "fetching" && !refsQuery.data}
				title="Repository ref"
			>
				{renderOptions("Branches", groups.branches)}
				{renderOptions("Tags", groups.tags)}
				{renderOptions("Releases", groups.releases)}
			</Select>
		</div>
	);
}
