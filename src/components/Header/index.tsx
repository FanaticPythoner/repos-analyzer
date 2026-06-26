import { useSSRContext } from "~/lib/context";
import { Island } from "~/lib/island";
import { joinBasePath } from "~/lib/public-path";
import { CodeIcon } from "../icons/CodeIcon";
import { ExternalLinkIcon } from "../icons/ExternalLinkIcon";
import { GitHubIcon } from "../icons/GitHubIcon";
import { SearchIcon } from "../icons/SearchIcon";
import { HeaderItem } from "./HeaderItem";
import ThemeToggle from "./ThemeToggle.island";

export const Header = () => {
	const { basePath, repositoryUrl } = useSSRContext();

	return (
		<header class="mb-1">
			<div class="flex justify-end gap-1 xs:gap-0">
				<a href={joinBasePath(basePath, "/")} title="Search repos">
					<HeaderItem>
						<SearchIcon />
					</HeaderItem>
				</a>
				<Island Component={ThemeToggle} props={{}} />
				<a href={repositoryUrl} target="_blank" rel="noopener" title="Project source code">
					<HeaderItem>
						<GitHubIcon />
					</HeaderItem>
				</a>
				<a
					href={`${repositoryUrl}/releases/latest`}
					target="_blank"
					rel="noopener"
					title="Latest release"
				>
					<HeaderItem>
						<ExternalLinkIcon />
					</HeaderItem>
				</a>
				<a
					href={`${repositoryUrl}/actions/workflows/deploy.yml`}
					target="_blank"
					rel="noopener"
					title="Deploy workflow"
				>
					<HeaderItem>
						<CodeIcon />
					</HeaderItem>
				</a>
			</div>
		</header>
	);
};
