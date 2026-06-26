import { Child } from "hono/jsx";

interface RepoPageLayoutProps {
	info: Child;
	health: Child;
	pkg: Child;
	commits: Child;
	locs: Child;
}

export const RepoPageLayout = ({ info, health, pkg, commits, locs }: RepoPageLayoutProps) => {
	return (
		<div class="flex flex-col gap-2">
			{info}

			<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
				{health}
				{pkg}
			</div>

			{commits}
			{locs}
		</div>
	);
};
