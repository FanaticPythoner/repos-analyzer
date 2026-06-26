import { ErrorPlaceholder } from "~/components/ErrorPlaceholder";
import { Skeleton } from "~/components/Skeleton";
import { ghApi } from "~/lib/github/api";
import { useQuery } from "~/lib/query/useQuery";
import { RepoCardClient } from "./components/RepoCard";
import { OwnerPageContent } from "./OwnerPageContent";

interface OwnerPageClientProps {
	owner: string;
}

export const OwnerPageClient = ({ owner }: OwnerPageClientProps) => {
	const query = useQuery({
		queryKey: ["repos", owner],
		queryFn: () => ghApi.getRepos(owner),
	});

	if (query.status === "error") {
		return <ErrorPlaceholder>Failed to load repositories</ErrorPlaceholder>;
	}

	if (!query.data) {
		return <Skeleton class="h-96" />;
	}

	return (
		<OwnerPageContent
			owner={owner}
			repos={query.data}
			renderRepoCard={repo => <RepoCardClient repo={repo} />}
		/>
	);
};
