import assert from "node:assert/strict";
import {
	buildCommitActivity,
	COMMIT_ACTIVITY_DAYS,
	COMMIT_ACTIVITY_PAGE_CONCURRENCY,
	COMMIT_ACTIVITY_PAGE_SIZE,
	getCommitActivitySince,
	GHApiCommitResponse,
	parseLastPageFromLink,
} from "../src/lib/github/commit-activity";

const commit = (date: string): GHApiCommitResponse =>
	({
		commit: {
			author: { date },
			committer: { date },
		},
	}) as GHApiCommitResponse;

const now = new Date("2026-06-26T17:30:00.000Z");
const activity = buildCommitActivity(
	[
		commit("2025-07-03T16:11:03Z"),
		commit("2025-07-03T16:02:04Z"),
		commit("2025-07-03T15:55:08Z"),
		commit("2025-07-03T15:54:31Z"),
		commit("2025-07-03T15:53:04Z"),
		commit("2025-07-03T15:51:51Z"),
		commit("2025-07-02T17:33:12Z"),
		commit("2025-06-15T19:04:45Z"),
	],
	now,
);
const nonZero = activity
	.filter(week => week.total > 0)
	.map(week => ({
		days: week.days,
		total: week.total,
		week: new Date(week.week * 1000).toISOString().slice(0, 10),
	}));

assert.equal(COMMIT_ACTIVITY_DAYS, 365);
assert.equal(COMMIT_ACTIVITY_PAGE_SIZE, 100);
assert.equal(COMMIT_ACTIVITY_PAGE_CONCURRENCY, 6);
assert.equal(getCommitActivitySince(now), "2025-06-27T00:00:00.000Z");
assert.equal(
	activity.reduce((total, week) => total + week.total, 0),
	7,
);
assert.deepEqual(nonZero, [
	{
		days: [0, 0, 0, 1, 6, 0, 0],
		total: 7,
		week: "2025-06-29",
	},
]);

assert.equal(parseLastPageFromLink(null), 1);
assert.equal(
	parseLastPageFromLink(
		'<https://api.github.com/repositories/1/commits?per_page=100&page=2>; rel="next", <https://api.github.com/repositories/1/commits?per_page=100&page=8>; rel="last"',
	),
	8,
);

console.log("commit-activity ok");
