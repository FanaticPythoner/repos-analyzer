import assert from "node:assert/strict";
import {
	getSearchNavigationTarget,
	getSearchQueryCandidate,
	MIN_SEARCH_QUERY_LENGTH,
	normalizePastedSearchInput,
	SEARCH_DEBOUNCE_MS,
	SEARCH_RESULT_LIMIT,
} from "../src/pages/index/components/search-input-behavior";

interface Case<T> {
	input: string;
	output: T;
}

const candidateCases: Case<string>[] = [
	{ input: "", output: "" },
	{ input: "ab", output: "" },
	{ input: "abc", output: "abc" },
	{ input: " FanaticPythoner/ ", output: "" },
	{ input: "FanaticPythoner/repos-analyzer", output: "FanaticPythoner/repos-analyzer" },
	{
		input: "https://github.com/FanaticPythoner/repos-analyzer/issues/1",
		output: "FanaticPythoner/repos-analyzer",
	},
	{ input: "https://github.com/FanaticPythoner/", output: "" },
];

const pasteCases: Case<string>[] = [
	{
		input: "https://github.com/FanaticPythoner/repos-analyzer/issues/1",
		output: "FanaticPythoner/repos-analyzer",
	},
	{ input: " FanaticPythoner/repos-analyzer ", output: "FanaticPythoner/repos-analyzer" },
];

for (const { input, output } of candidateCases) {
	assert.equal(getSearchQueryCandidate(input), output);
}

for (const { input, output } of pasteCases) {
	assert.equal(normalizePastedSearchInput(input), output);
}

assert.deepEqual(getSearchNavigationTarget("FanaticPythoner/"), {
	owner: "FanaticPythoner",
	path: "/FanaticPythoner",
});

assert.deepEqual(getSearchNavigationTarget("FanaticPythoner/repos-analyzer"), {
	owner: "FanaticPythoner",
	repo: "repos-analyzer",
	path: "/FanaticPythoner/repos-analyzer",
});

assert.equal(getSearchNavigationTarget("react"), null);
assert.equal(SEARCH_DEBOUNCE_MS, 900);
assert.equal(SEARCH_RESULT_LIMIT, 10);
assert.equal(MIN_SEARCH_QUERY_LENGTH, 3);

console.log("search-input-behavior ok");
