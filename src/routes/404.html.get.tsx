import { IndexPage } from "~/pages/index";
import IndexPageContent from "~/pages/index/components/IndexPageContent.island.lazy";
import { renderPage } from "~/render";

export default defineEventHandler(event => {
	setResponseStatus(event, 404);
	setHeader(event, "cache-control", "public, max-age=60");

	return renderPage(<IndexPage />, {
		event,
		preloadIslands: [IndexPageContent],
	});
});
