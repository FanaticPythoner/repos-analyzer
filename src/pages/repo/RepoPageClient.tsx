import { useEffect } from "hono/jsx";
import { ErrorPlaceholder } from "~/components/ErrorPlaceholder";
import { Skeleton } from "~/components/Skeleton";
import { ghApi } from "~/lib/github/api";
import { useQuery } from "~/lib/query/useQuery";
import { useRouter } from "~/lib/router/useRouter";
import CommitsSectionContent from "./components/CommitsSection/CommitsSectionContent.island.lazy";
import { HealthSectionClient } from "./components/HealthSection";
import { InfoSectionContent } from "./components/InfoSection";
import LocsSection from "./components/LocsSection/LocsSection.island.lazy";
import { PackageSectionClient } from "./components/PackageSection/PackageSectionClient";
import RepoRefSelector from "./components/RepoRefSelector.island.lazy";
import { RepoPageLayout } from "./RepoPageLayout";

interface RepoPageClientProps {
	owner: string;
	repo: string;
}

export const RepoPageClient = ({ owner, repo }: RepoPageClientProps) => {
	const router = useRouter();
	const requestedBranch = router.search.get("branch");

	const query = useQuery({
		queryKey: ["repo", owner, repo],
		queryFn: () => ghApi.getRepo(owner, repo),
	});

	const branch = requestedBranch ?? query.data?.default_branch;
	const defaultBranch = query.data?.default_branch;

	useEffect(() => {
		if (requestedBranch || !defaultBranch) {
			return;
		}

		router.setSearch(
			prev => {
				prev.set("branch", defaultBranch);

				return prev;
			},
			{ replace: true },
		);
	}, [requestedBranch, defaultBranch]);

	if (query.status === "error") {
		return <ErrorPlaceholder>Failed to load repo info</ErrorPlaceholder>;
	}

	if (!branch) {
		return <Skeleton class="h-96" />;
	}

	const props = { owner, repo, branch, data: query.data ?? null };

	return (
		<RepoPageLayout
			info={
				<>
					<InfoSectionContent {...props} />
					<RepoRefSelector
						branch={branch}
						defaultBranch={defaultBranch}
						owner={owner}
						repo={repo}
					/>
				</>
			}
			health={<HealthSectionClient {...props} />}
			pkg={<PackageSectionClient {...props} />}
			commits={<CommitsSectionContent {...props} activity={undefined} />}
			locs={<LocsSection {...props} />}
		/>
	);
};
