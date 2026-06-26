import { Island } from "~/lib/island";
import { CommitsSection } from "./components/CommitsSection";
import { HealthSection } from "./components/HealthSection";
import { InfoSection } from "./components/InfoSection";
import LocsSection from "./components/LocsSection/LocsSection.island.lazy";
import { PackageSection } from "./components/PackageSection";
import RepoRefSelector from "./components/RepoRefSelector.island.lazy";
import { RepoPageLayout } from "./RepoPageLayout";
import { CommonSectionProps } from "./types";

interface RepoPageProps extends CommonSectionProps {
	branch: string;
}

export const RepoPage = (props: RepoPageProps) => {
	return (
		<RepoPageLayout
			info={
				<>
					<InfoSection {...props} />
					<Island
						Component={RepoRefSelector}
						props={{
							branch: props.branch,
							defaultBranch: props.data?.default_branch,
							owner: props.owner,
							repo: props.repo,
						}}
					/>
				</>
			}
			health={<HealthSection {...props} />}
			pkg={<PackageSection {...props} />}
			commits={<CommitsSection {...props} />}
			locs={<Island Component={LocsSection} props={props} />}
		/>
	);
};
