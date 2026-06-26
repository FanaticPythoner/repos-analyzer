import { JSX } from "hono/jsx";
import { Manifest } from "vite";
import { joinBasePath, removeLeadingSlash } from "./public-path";

export interface PreloadEntry {
	rel?: "preload" | "modulepreload";
	href: string;
	as: string;
	crossorigin?: JSX.CrossOrigin;
}

export const getPreloadForModule = (
	src: string,
	manifest: Manifest,
	basePath: string,
): PreloadEntry[] | null => {
	const chunk = manifest[removeLeadingSlash(src)];

	if (!chunk || chunk.isEntry) {
		return null;
	}

	const preload: Array<PreloadEntry> = [
		{
			rel: "modulepreload",
			href: joinBasePath(basePath, chunk.file),
			as: "script",
			crossorigin: "",
		},
	];

	for (const imp of chunk.imports ?? []) {
		preload.push(...(getPreloadForModule(imp, manifest, basePath) ?? []));
	}

	return preload;
};

export const dedupePreload = (preload: PreloadEntry[]): PreloadEntry[] => {
	const hrefs = new Set<string>();

	return preload.filter(p => {
		if (hrefs.has(p.href)) {
			return false;
		}

		hrefs.add(p.href);

		return true;
	});
};
