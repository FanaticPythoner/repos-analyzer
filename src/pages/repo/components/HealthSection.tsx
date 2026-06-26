import { ErrorPlaceholder } from "~/components/ErrorPlaceholder";
import { CheckCircleIcon } from "~/components/icons/CheckCircleIcon";
import { XCircleIcon } from "~/components/icons/XCircleIcon";
import { Skeleton } from "~/components/Skeleton";
import { useSSRContext } from "~/lib/context";
import { ghApi, GHApiGetRepoHealthResponse } from "~/lib/github/api";
import { useQuery } from "~/lib/query/useQuery";
import { cn } from "~/lib/utils";
import { CommonSectionProps } from "../types";
import { Section } from "./Section";

type HealthSectionProps = CommonSectionProps;
type HealthFiles = NonNullable<GHApiGetRepoHealthResponse["files"]>;
type HealthFile = NonNullable<HealthFiles[keyof HealthFiles]>;

const HealthSectionItem = ({ text, url }: { text: string; url?: string }) => {
	const isSuccess = !!url;
	const Icon = isSuccess ? CheckCircleIcon : XCircleIcon;

	const Component = isSuccess ? "a" : "span";
	const componentProps = isSuccess
		? {
				href: url,
				target: "_blank",
				rel: "noopener",
			}
		: {};

	return (
		<li>
			<Component
				class={cn(
					"flex items-center gap-2 transition-colors duration-75",
					isSuccess && "hover:text-link",
				)}
				{...componentProps}
			>
				<Icon
					class={cn(
						"inline-block h-5 w-5 flex-shrink-0",
						isSuccess ? "text-success" : "text-error",
					)}
				/>
				<span class="overflow-hidden text-ellipsis">{text}</span>
			</Component>
		</li>
	);
};

const title = "Repo health";

interface HealthSectionContentProps {
	health: GHApiGetRepoHealthResponse;
	issue?: HealthFile | null;
}

const HealthSectionContent = ({ health, issue: issueFile }: HealthSectionContentProps) => {
	const {
		license,
		readme,
		code_of_conduct: coc,
		contributing,
		pull_request_template: pr,
	} = health.files ?? {};
	const issue = health.files?.issue_template ?? issueFile ?? null;

	return (
		<Section title={title}>
			<ul class="flex flex-col items-start">
				<HealthSectionItem text={readme ? "Readme" : "No Readme"} url={readme?.html_url} />
				<HealthSectionItem
					text={(license?.key === "other" ? "License" : license?.name) || "No license"}
					url={license?.html_url ?? undefined}
				/>
				<HealthSectionItem
					text={
						coc
							? `Code of conduct` + (coc.key === "other" ? "" : ` (${coc.name})`)
							: "No code of conduct"
					}
					url={coc?.html_url ?? undefined}
				/>
				<HealthSectionItem
					text={contributing ? "Contribution guidelines" : "No contribution guidelines"}
					url={contributing?.html_url ?? undefined}
				/>
				<HealthSectionItem
					text={issue ? "Issue template" : "No issue template"}
					url={issue?.html_url ?? undefined}
				/>
				<HealthSectionItem
					text={pr ? "Pull request template" : "No pull request template"}
					url={pr?.html_url ?? undefined}
				/>
			</ul>
		</Section>
	);
};

const HealthSectionLoading = () => (
	<Section title={title}>
		<Skeleton class="h-32" />
	</Section>
);

const HealthSectionUnavailable = ({ children }: { children: string }) => (
	<Section title={title}>
		<ErrorPlaceholder>{children}</ErrorPlaceholder>
	</Section>
);

export const HealthSection = async ({ owner, repo, data }: HealthSectionProps) => {
	const { timing } = useSSRContext();

	if (data?.fork) {
		return (
			<HealthSectionUnavailable>Health is disabled for forked repos</HealthSectionUnavailable>
		);
	}

	let health: GHApiGetRepoHealthResponse;
	try {
		health = await timing.timeAsync("health", () => ghApi.getRepoHealth(owner, repo));
	} catch {
		return <HealthSectionUnavailable>Failed to load repo health</HealthSectionUnavailable>;
	}

	const issue =
		health.files?.issue_template ??
		(await timing.timeAsync("issue_template", () => ghApi.getIssueTemplate(owner, repo)));

	return <HealthSectionContent health={health} issue={issue} />;
};

export const HealthSectionClient = ({ owner, repo, data }: HealthSectionProps) => {
	const healthQuery = useQuery({
		queryKey: ["repoHealth", owner, repo],
		queryFn: () => ghApi.getRepoHealth(owner, repo),
		enabled: !data?.fork,
	});

	const issueQuery = useQuery({
		queryKey: ["issueTemplate", owner, repo],
		queryFn: () => ghApi.getIssueTemplate(owner, repo),
		enabled: !!healthQuery.data && !healthQuery.data.files?.issue_template,
	});

	if (data?.fork) {
		return (
			<HealthSectionUnavailable>Health is disabled for forked repos</HealthSectionUnavailable>
		);
	}

	if (healthQuery.status === "error") {
		return <HealthSectionUnavailable>Failed to load repo health</HealthSectionUnavailable>;
	}

	if (!healthQuery.data) {
		return <HealthSectionLoading />;
	}

	return <HealthSectionContent health={healthQuery.data} issue={issueQuery.data} />;
};
