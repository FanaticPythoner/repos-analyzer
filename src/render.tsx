import { EventHandlerRequest, H3Event } from "h3";
import { html, raw } from "hono/html";
import { Child } from "hono/jsx";
import { renderToReadableStream } from "hono/jsx/streaming";
import { getAssets } from "./assets";
import { App } from "./components/App";
import { SSRContext, SSRContextValue } from "./lib/context";
import { IslandFC } from "./lib/island/types";
import { dedupePreload, getPreloadForModule, PreloadEntry } from "./lib/preload";
import { normalizeBasePath, normalizeSiteUrl, stripBasePath } from "./lib/public-path";
import { Router } from "./lib/router/Router";
import { DEFAULT_THEME } from "./lib/theme";
import { useManifest } from "./manifest";

interface RenderPageOptions {
	title?: string;
	event: H3Event<EventHandlerRequest>;
	ogImage?: string;
	preload?: PreloadEntry[];
	preloadIslands?: IslandFC[];
}

export const renderPage = async (
	page: Child,
	{ title, event, ogImage, preload = [], preloadIslands }: RenderPageOptions,
) => {
	const url = getRequestURL(event);

	const runtimeConfig = useRuntimeConfig(event);
	const clientEntry = runtimeConfig.clientEntry;
	const basePath = normalizeBasePath(runtimeConfig.publicBasePath);
	const repositoryUrl = runtimeConfig.publicRepositoryUrl;
	const siteUrl = normalizeSiteUrl(runtimeConfig.publicSiteUrl);
	const manifest = await useManifest();

	if (!manifest) {
		throw new Error("Failed to retrieve manifest");
	}

	const assets = getAssets({ manifest, clientEntry, basePath });
	const preconnect = ["https://api.github.com", "https://ghloc.ifels.dev"];

	if (preloadIslands) {
		const islandPreloads = preloadIslands
			.map(island => island.src && getPreloadForModule(island.src, manifest, basePath))
			.filter(v => !!v);

		preload = dedupePreload([...preload, ...islandPreloads].flat());
	}

	const timing = event.context.timing;

	const context: SSRContextValue = {
		url: getRequestURL(event),
		basePath,
		repositoryUrl,
		siteUrl,
		meta: {
			title,
			ogImage,
		},
		timing,
		assets,
		preconnect,
		preload,
		manifest,
		theme: DEFAULT_THEME,
	};

	setHeader(event, "Content-Type", "text/html; charset=UTF-8");

	const docType = raw("<!DOCTYPE html>");

	const app = (
		<SSRContext.Provider value={context}>
			<Router ssrPath={stripBasePath(basePath, url.pathname)} ssrSearch={url.search}>
				<App>{page}</App>
			</Router>
		</SSRContext.Provider>
	);

	return renderToReadableStream(html`${docType}${app}`);
};
