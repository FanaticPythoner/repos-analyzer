import { Island } from "~/lib/island";
import { CommonSectionProps } from "../../types";
import CommitsSectionContent from "./CommitsSectionContent.island.lazy";

interface CommitsSectionProps extends CommonSectionProps {
	branch: string;
}

export const CommitsSection = (props: CommitsSectionProps) => {
	return (
		<Island
			Component={CommitsSectionContent}
			props={{
				...props,
				activity: undefined,
			}}
		/>
	);
};
