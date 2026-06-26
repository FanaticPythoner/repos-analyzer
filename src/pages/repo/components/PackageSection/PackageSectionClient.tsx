import { Skeleton } from "~/components/Skeleton";
import { ghApi } from "~/lib/github/api";
import { npmApi } from "~/lib/npm/api";
import { useQuery } from "~/lib/query/useQuery";
import { CommonSectionProps } from "../../types";
import { Section } from "../Section";
import { parsePackageJson } from "./package-json";
import PackageSectionContent from "./PackageSectionContent.island.lazy";
import { PackageSectionFallback } from "./PackageSectionFallback";

interface PackageSectionClientProps extends CommonSectionProps {
	branch: string;
}

export const PackageSectionClient = ({ owner, repo, branch }: PackageSectionClientProps) => {
	const packageQuery = useQuery({
		queryKey: ["packageJson", owner, repo, branch],
		queryFn: () => ghApi.getFile(owner, repo, "package.json", branch),
	});

	if (packageQuery.status === "error") {
		return <PackageSectionFallback />;
	}

	if (!packageQuery.data) {
		return (
			<Section title="Package">
				<Skeleton class="h-32" />
			</Section>
		);
	}

	const pkg = parsePackageJson(packageQuery.data);

	if (!pkg) {
		return (
			<PackageSectionFallback>
				No npm package detected in the project root.
			</PackageSectionFallback>
		);
	}

	const npmQuery = useQuery({
		queryKey: ["npm", pkg.name],
		queryFn: () => npmApi.getPackage(pkg.name),
	});

	return <PackageSectionContent pkg={pkg} bundle={null} npm={npmQuery.data ?? null} />;
};
