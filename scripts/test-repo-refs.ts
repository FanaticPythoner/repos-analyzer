import assert from "node:assert/strict";
import { buildGitHubRepoRefGroups, findGitHubRepoRef, repoRefKey } from "../src/lib/github/refs";
import { joinBasePath } from "../src/lib/public-path";

(
	globalThis as typeof globalThis & { defineCachedFunction: <TFn>(fn: TFn) => TFn }
).defineCachedFunction = fn => fn;

const { getGhlocGetLocsUrl } = await import("../src/lib/ghloc/api");

const groups = buildGitHubRepoRefGroups({
	branches: [{ name: "feature/x" }, { name: "main" }],
	defaultBranch: "main",
	releases: [
		{ name: "Stable", tag_name: "v1.0.0" },
		{ name: null, tag_name: "v0.9.0" },
	],
	tags: [{ name: "v1.0.0" }, { name: "v0.9.0" }],
});

assert.deepEqual(
	groups.branches.map(ref => ref.value),
	["main", "feature/x"],
);
assert.deepEqual(
	groups.branches.map(ref => ref.label),
	["main (default)", "feature/x"],
);
assert.deepEqual(
	groups.tags.map(ref => ref.value),
	["v0.9.0", "v1.0.0"],
);
assert.deepEqual(
	groups.releases.map(ref => ref.label),
	["Stable (v1.0.0)", "v0.9.0"],
);

assert.equal(repoRefKey("branch", "feature/x"), "branch:feature/x");
assert.deepEqual(findGitHubRepoRef(groups, "v1.0.0", "release"), {
	kind: "release",
	label: "Stable (v1.0.0)",
	value: "v1.0.0",
});
assert.deepEqual(findGitHubRepoRef(groups, "v1.0.0", null), {
	kind: "tag",
	label: "v1.0.0",
	value: "v1.0.0",
});
assert.equal(findGitHubRepoRef(groups, "missing", null), null);

assert.equal(
	getGhlocGetLocsUrl({
		owner: "FanaticPythoner",
		repo: "ChainedPy",
		branch: "feature/x",
	}).toString(),
	"https://ghloc.ifels.dev/FanaticPythoner/ChainedPy/feature%2Fx?pretty=false",
);
assert.equal(
	joinBasePath("/repos-analyzer/", "/FanaticPythoner/ChainedPy"),
	"/repos-analyzer/FanaticPythoner/ChainedPy",
);

console.log("repo-refs ok");
