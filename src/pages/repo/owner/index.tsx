import { useSSRContext } from "~/lib/context";
import { ghApi } from "~/lib/github/api";
import { RepoCard } from "./components/RepoCard";
import { OwnerPageContent } from "./OwnerPageContent";

interface OwnerPageProps {
	owner: string;
}

export const OwnerPage = async ({ owner }: OwnerPageProps) => {
	const { timing } = useSSRContext();

	const repos = await timing.timeAsync("repos", () => ghApi.getRepos(owner));

	return (
		<OwnerPageContent
			owner={owner}
			repos={repos}
			renderRepoCard={repo => <RepoCard repo={repo} />}
		/>
	);
};
