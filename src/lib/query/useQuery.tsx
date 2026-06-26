import { useEffect, useRef, useState } from "hono/jsx";
import { isClient } from "../utils";

type QueryKey = (string | number | undefined | null)[];

interface QueryFnContext<TKey extends QueryKey> {
	queryKey: TKey;
	signal: AbortSignal;
}

type QueryState<TData> =
	| { status: "pending"; data: undefined; error: null }
	| { status: "success"; data: TData; error: null }
	| { status: "fetching"; data?: TData; error: null }
	| { status: "error"; data?: TData; error: unknown };

export interface UseQueryOptions<TData, TKey extends QueryKey> {
	queryKey: TKey;
	queryFn: (ctx: QueryFnContext<TKey>) => Promise<TData>;
	initialData?: TData | undefined;
	enabled?: boolean;
}

const dataCache = new Map<string, unknown>();
const requestCache = new Map<string, Promise<unknown>>();

const getHash = (key: QueryKey): string => {
	return JSON.stringify(key);
};

export const useQuery = <TData, TKey extends QueryKey>({
	queryKey,
	queryFn,
	initialData,
	enabled = true,
}: UseQueryOptions<TData, TKey>): QueryState<TData> => {
	const key = getHash(queryKey);
	const keyRef = useRef<string | null>(null);

	const [state, setState] = useState<QueryState<TData>>(() => {
		if (initialData !== undefined) {
			if (isClient) {
				dataCache.set(key, initialData);
			}

			return { status: "success", data: initialData, error: null };
		}

		return { status: "pending", data: undefined, error: null };
	});

	useEffect(() => {
		if (!enabled) {
			keyRef.current = null;
			return;
		}

		if (key === keyRef.current) {
			return;
		}

		keyRef.current = key;

		const cachedData = dataCache.get(key) as TData | undefined;
		if (cachedData !== undefined) {
			setState({ status: "success", data: cachedData, error: null });
			return;
		}

		const ac = new AbortController();

		setState(prev => ({ status: "fetching", data: prev.data, error: null }));

		const cachedRequest = requestCache.get(key) as Promise<TData> | undefined;
		const request =
			cachedRequest ??
			Promise.resolve()
				.then(() => queryFn({ queryKey, signal: ac.signal }))
				.then(data => {
					dataCache.set(key, data);

					return data;
				});

		if (!cachedRequest) {
			requestCache.set(key, request);
		}

		request
			.then(data => {
				if (!ac.signal.aborted && keyRef.current === key) {
					setState({ status: "success", data, error: null });
				}
			})
			.catch(error => {
				if (!ac.signal.aborted && keyRef.current === key) {
					setState({ status: "error", error });
				}
			})
			.finally(() => {
				if (requestCache.get(key) === request) {
					requestCache.delete(key);
				}
			});

		return () => {
			ac.abort();
		};
	}, [key, enabled]);

	return state;
};
