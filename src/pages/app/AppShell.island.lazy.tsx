import { ErrorPlaceholder } from "~/components/ErrorPlaceholder";
import { useRouter } from "~/lib/router/useRouter";
import IndexPageContent from "~/pages/index/components/IndexPageContent.island.lazy";
import { OwnerPageClient } from "~/pages/repo/owner/OwnerPageClient";
import { RepoPageClient } from "~/pages/repo/RepoPageClient";

const pathSegments = (pathname: string): string[] => {
	return pathname
		.split("/")
		.map(segment => segment.trim())
		.filter(Boolean)
		.map(segment => decodeURIComponent(segment));
};

export default function AppShell() {
	const router = useRouter();
	const [owner, repo, ...rest] = pathSegments(router.pathname);

	if (!owner) {
		return <IndexPageContent />;
	}

	if (!repo) {
		return <OwnerPageClient owner={owner} />;
	}

	if (rest.length) {
		return <ErrorPlaceholder>Unsupported route</ErrorPlaceholder>;
	}

	return <RepoPageClient owner={owner} repo={repo} />;
}
