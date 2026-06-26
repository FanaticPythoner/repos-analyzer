import { formatNumber } from "~/lib/format";
import { Locs, ghlocApi } from "~/lib/ghloc/api";
import { ghApi } from "~/lib/github/api";
import { getLanguageFromExtension } from "~/lib/languages";

const colors = {
	text: "#e5e7eb",
	bg: "#181a1b",
	border: "#2f3335",
	highlight: "#2f3335",
};

const escapeXml = (value: string) => {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
};

export default defineEventHandler(async event => {
	const { owner, repo } = getRouterParams(event);
	let { branch, filter } = getQuery<{
		branch?: string;
		filter?: string;
		format?: string;
	}>(event);

	const { timing } = event.context;

	let locs: Locs;
	try {
		if (!branch) {
			branch = (await timing.timeAsync("branch", () => ghApi.getRepo(owner, repo)))
				.default_branch;
		}

		locs = await timing.timeAsync("locs", () =>
			ghlocApi.getLocs({ owner, repo, branch, filter }),
		);
	} catch (e) {
		console.error("Failed to fetch locs", e);
		throw createError({ statusCode: 500, statusMessage: "Failed to fetch locs" });
	}

	const totalLocs = locs.loc;
	const topLangs = Object.entries(locs.locByLangs ?? {}).slice(0, 6);

	setHeader(event, "cache-control", "public, no-transform, max-age=900");
	setHeader(event, "content-type", "image/svg+xml; charset=utf-8");

	return renderOgImage({ owner, repo, totalLocs, topLangs });
});

function renderOgImage({
	owner,
	repo,
	totalLocs,
	topLangs,
}: {
	owner: string;
	repo: string;
	totalLocs: number;
	topLangs: [lang: string, loc: number][];
}) {
	const formatted = formatNumber(totalLocs);
	const length = formatted.length;
	const totalFontSize = 128 - 8 * Math.max(length - 8, 0);
	const percentageBase = Math.max(totalLocs, 1);
	const rows = topLangs.map(([lang, loc], index) =>
		renderLangRow({
			lang,
			loc,
			percentage: (loc / percentageBase) * 100,
			y: 370 + index * 76,
		}),
	);

	return `\
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
	<rect width="1200" height="630" fill="${colors.bg}"/>
	<text x="600" y="112" fill="${colors.text}" font-family="Arial, sans-serif" font-size="56" font-weight="700" text-anchor="middle">${escapeXml(owner)}/${escapeXml(repo)}</text>
	<line x1="0" y1="165" x2="1200" y2="165" stroke="${colors.border}" stroke-width="2"/>
	<line x1="600" y1="165" x2="600" y2="630" stroke="${colors.border}" stroke-width="2"/>
	<text x="300" y="375" fill="${colors.text}" font-family="Arial, sans-serif" font-size="${totalFontSize}" font-weight="700" text-anchor="middle">${escapeXml(formatted)}</text>
	<text x="300" y="455" fill="${colors.text}" font-family="Arial, sans-serif" font-size="56" text-anchor="middle">lines</text>
	${rows.join("\n\t")}
</svg>`;
}

function renderLangRow({
	lang,
	loc,
	percentage,
	y,
}: {
	lang: string;
	loc: number;
	percentage: number;
	y: number;
}) {
	const width = Math.max(0, Math.min(1, percentage / 100)) * 500;
	const label = getLanguageFromExtension(lang) ?? lang;
	const value = `${formatNumber(loc)} (${percentage.toFixed(1)}%)`;

	return `\
<g>
	<rect x="650" y="${y - 42}" width="${width}" height="56" rx="6" fill="${colors.highlight}"/>
	<text x="670" y="${y}" fill="${colors.text}" font-family="Arial, sans-serif" font-size="34">${escapeXml(label)}</text>
	<text x="1140" y="${y}" fill="${colors.text}" font-family="Arial, sans-serif" font-size="30" text-anchor="end">${escapeXml(value)}</text>
</g>`;
}
