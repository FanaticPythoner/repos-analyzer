import { Endpoints } from "@octokit/types";

export const COMMIT_ACTIVITY_DAYS = 365;
export const COMMIT_ACTIVITY_PAGE_SIZE = 100;
export const COMMIT_ACTIVITY_PAGE_CONCURRENCY = 6;

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DAYS_IN_WEEK = 7;

export type GHApiCommitResponse =
	Endpoints["GET /repos/{owner}/{repo}/commits"]["response"]["data"][number];

export interface GHApiCommitActivityWeek {
	week: number;
	days: number[];
	total: number;
}

export type GHApiCommitActivityResponse = GHApiCommitActivityWeek[];

export interface CommitActivityWindow {
	firstDayMs: number;
	gridStartMs: number;
	todayMs: number;
	weekCount: number;
}

const utcDayStartMs = (date: Date): number => {
	return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

export const getCommitActivityWindow = (now = new Date()): CommitActivityWindow => {
	const todayMs = utcDayStartMs(now);
	const firstDayMs = todayMs - (COMMIT_ACTIVITY_DAYS - 1) * DAY_IN_MS;
	const firstDay = new Date(firstDayMs).getUTCDay();
	const gridStartMs = firstDayMs - firstDay * DAY_IN_MS;
	const daySpan = Math.floor((todayMs - gridStartMs) / DAY_IN_MS) + 1;

	return {
		firstDayMs,
		gridStartMs,
		todayMs,
		weekCount: Math.ceil(daySpan / DAYS_IN_WEEK),
	};
};

export const getCommitActivitySince = (now = new Date()): string => {
	return new Date(getCommitActivityWindow(now).firstDayMs).toISOString();
};

export const getCommitDateMs = (commit: GHApiCommitResponse): number | null => {
	const value = commit.commit.committer?.date ?? commit.commit.author?.date;

	if (!value) {
		return null;
	}

	const time = Date.parse(value);

	return Number.isFinite(time) ? time : null;
};

export const createEmptyCommitActivity = (
	window: CommitActivityWindow,
): GHApiCommitActivityResponse => {
	return Array.from({ length: window.weekCount }, (_, weekIndex) => ({
		week: Math.floor((window.gridStartMs + weekIndex * DAYS_IN_WEEK * DAY_IN_MS) / 1000),
		days: Array.from({ length: DAYS_IN_WEEK }, () => 0),
		total: 0,
	}));
};

export const buildCommitActivity = (
	commits: GHApiCommitResponse[],
	now = new Date(),
): GHApiCommitActivityResponse => {
	const window = getCommitActivityWindow(now);
	const activity = createEmptyCommitActivity(window);
	const tomorrowMs = window.todayMs + DAY_IN_MS;

	for (const commit of commits) {
		const commitDateMs = getCommitDateMs(commit);

		if (commitDateMs === null) {
			continue;
		}

		const dayMs = utcDayStartMs(new Date(commitDateMs));

		if (dayMs < window.firstDayMs || dayMs >= tomorrowMs) {
			continue;
		}

		const dayOffset = Math.floor((dayMs - window.gridStartMs) / DAY_IN_MS);
		const weekIndex = Math.floor(dayOffset / DAYS_IN_WEEK);
		const dayIndex = dayOffset % DAYS_IN_WEEK;
		const week = activity[weekIndex];

		if (!week) {
			continue;
		}

		week.days[dayIndex] += 1;
		week.total += 1;
	}

	return activity;
};

export const parseLastPageFromLink = (link: string | null): number => {
	if (!link) {
		return 1;
	}

	for (const segment of link.split(",")) {
		if (!segment.includes('rel="last"')) {
			continue;
		}

		const match = /<([^>]+)>/.exec(segment);
		const url = match?.[1];

		if (!url) {
			return 1;
		}

		const page = Number.parseInt(new URL(url).searchParams.get("page") ?? "", 10);

		return Number.isFinite(page) && page > 0 ? page : 1;
	}

	return 1;
};
