import { useEffect, useLayoutEffect, useRef, useState } from "hono/jsx";
import { SearchIcon } from "~/components/icons/SearchIcon";
import { SpinnerIcon } from "~/components/icons/SpinnerIcon";
import { Input } from "~/components/Input";
import { useDebouncedValue } from "~/lib/debounce";
import { ghApi } from "~/lib/github/api";
import { toDocumentPath } from "~/lib/public-path";
import { useQuery } from "~/lib/query/useQuery";
import { useRouter } from "~/lib/router/useRouter";
import { cn } from "~/lib/utils";
import {
	getSearchNavigationTarget,
	getSearchQueryCandidate,
	normalizePastedSearchInput,
	SEARCH_DEBOUNCE_MS,
	SEARCH_RESULT_LIMIT,
} from "./search-input-behavior";
import { SearchResults } from "./SearchResults";

export default function IndexPageContent() {
	const router = useRouter();

	const inputRef = useRef<HTMLInputElement>(null);
	const queryValue = router.search.get("query") ?? "";
	const [inputValue, setInputValue] = useState(queryValue);
	const inputCandidate = getSearchQueryCandidate(inputValue);
	const [committedQuery, setCommittedQuery] = useDebouncedValue(
		inputCandidate,
		SEARCH_DEBOUNCE_MS,
	);
	const canUseQueryResults = committedQuery.length > 0 && inputCandidate === committedQuery;

	const [activeIndex, setActiveIndex] = useState(0);

	const query = useQuery({
		queryKey: ["searchRepos", committedQuery],
		queryFn: ({ signal }) => ghApi.searchRepos(committedQuery, SEARCH_RESULT_LIMIT, signal),
		enabled: committedQuery.length > 0,
	});
	const queryItems = canUseQueryResults ? query.data?.items : undefined;
	const maxActiveIndex = Math.max((queryItems?.length ?? 1) - 1, 0);

	const syncCommittedQueryParam = (value: string) => {
		if (queryValue === value) {
			return;
		}

		router.setSearch(
			prev => {
				const next = new URLSearchParams(prev);

				if (value) {
					next.set("query", value);
				} else {
					next.delete("query");
				}

				return next;
			},
			{ replace: true },
		);
	};

	const commitSearch = (value: string) => {
		const nextQuery = getSearchQueryCandidate(value);
		setCommittedQuery(nextQuery);
		syncCommittedQueryParam(nextQuery);
	};

	const navigateToSearchTarget = (value: string) => {
		const target = getSearchNavigationTarget(value);

		if (!target) {
			return false;
		}

		location.href = toDocumentPath(target.path);

		return true;
	};

	useEffect(() => {
		inputRef.current?.focus();

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				inputRef.current?.focus();
			}
		};

		document.addEventListener("keydown", onKeyDown);

		return () => {
			document.removeEventListener("keydown", onKeyDown);
		};
	}, []);

	useEffect(() => {
		setInputValue(queryValue);
		setCommittedQuery(getSearchQueryCandidate(queryValue));
	}, [queryValue]);

	useEffect(() => {
		syncCommittedQueryParam(committedQuery);
	}, [committedQuery]);

	useLayoutEffect(() => {
		setActiveIndex(0);
	}, [query?.data, committedQuery, inputCandidate]);

	const onChange = (e: Event) => {
		if (e.target instanceof HTMLInputElement) {
			const inputEvent = e as InputEvent;
			const newQuery =
				"inputType" in inputEvent && inputEvent.inputType === "insertFromPaste"
					? normalizePastedSearchInput(e.target.value)
					: e.target.value;

			setInputValue(newQuery);
		}
	};

	const onKeyDown = (e: KeyboardEvent) => {
		if (e.key === "Enter") {
			const item = queryItems?.[activeIndex];

			if (item) {
				location.href = toDocumentPath(
					`/${item.full_name}?branch=${encodeURIComponent(item.default_branch)}`,
				);
			} else if (!navigateToSearchTarget(inputValue)) {
				commitSearch(inputValue);
			}
		} else if (e.key === "ArrowDown") {
			setActiveIndex(Math.min(activeIndex + 1, maxActiveIndex));
			e.preventDefault();
		} else if (e.key === "ArrowUp") {
			setActiveIndex(Math.max(activeIndex - 1, 0));
			e.preventDefault();
		}
	};

	return (
		<div class="group mx-auto flex w-full max-w-xl flex-grow flex-col gap-4 md:justify-center">
			<div class="max-h-0.5 flex-grow md:max-h-16" />

			<h1 class="text-center text-lg">Count lines of code in a GitHub repository</h1>

			<div class="flex-shrink-0">
				<Input
					onKeyDown={onKeyDown}
					ref={inputRef}
					value={inputValue}
					onChange={onChange}
					inputClass="py-3 text-center text-2xl font-light"
					type="text"
					placeholder="facebook/react"
					autofocus
					autocomplete="off"
					autocorrect="off"
					autocapitalize="off"
					spellcheck={false}
					after={
						<button
							type="button"
							aria-label="Search repositories"
							onClick={() => {
								if (!navigateToSearchTarget(inputValue)) {
									commitSearch(inputValue);
								}
							}}
							class={cn(
								"flex h-8 w-8 cursor-pointer items-center justify-center border-0 bg-transparent p-0 transition-colors duration-100",
								"text-neutral-400 group-focus-within:text-black dark:text-neutral-500 dark:group-focus-within:text-neutral-400",
							)}
						>
							{canUseQueryResults && query.status === "fetching" ? (
								<SpinnerIcon class="animate-spin" />
							) : (
								<SearchIcon />
							)}
						</button>
					}
				/>
			</div>

			<div class="h-0 flex-grow md:max-h-[36rem]">
				<SearchResults
					activeIndex={activeIndex}
					onChangeActiveIndex={setActiveIndex}
					items={queryItems}
				/>
			</div>
		</div>
	);
}
