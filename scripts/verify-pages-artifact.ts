import fs from "fs";
import path from "path";
import { getAppBasePath, getPublicSiteUrl, getRepositoryUrl } from "../config";

class PagesArtifactError extends Error {
	constructor(errors: string[]) {
		super(
			`GitHub Pages artifact invariant failed:\n${errors.map(error => `- ${error}`).join("\n")}`,
		);
		this.name = "PagesArtifactError";
	}
}

interface TextPattern {
	label: string;
	pattern: RegExp;
}

const publicDir = path.resolve(import.meta.dirname, "..", ".output/public");
const textExtensions = new Set([
	".css",
	".html",
	".js",
	".json",
	".map",
	".txt",
	".webmanifest",
	".xml",
]);

const blockedPatterns: TextPattern[] = [
	{
		label: "README/Jekyll shell",
		pattern:
			/This site is open source|Improve this page|GitHub Pages deployment|<h1[^>]*>repos-analyzer/i,
	},
	{ label: "Vercel app URL", pattern: /ghloc\.vercel\.app|https?:\/\/[^"'()\s]*vercel\.app/i },
	{ label: "root asset URL", pattern: /(?:href|src)=["']\/assets\//i },
];

const readText = (filePath: string): string => fs.readFileSync(filePath, "utf8");

const listFiles = (dir: string): string[] =>
	fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
		const entryPath = path.join(dir, entry.name);

		return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
	});

const relative = (filePath: string): string =>
	path.relative(publicDir, filePath).replaceAll(path.sep, "/");

const existsFile = (filePath: string): boolean =>
	fs.existsSync(filePath) && fs.statSync(filePath).isFile();

const assert = (condition: boolean, message: string, errors: string[]): void => {
	if (!condition) {
		errors.push(message);
	}
};

const verifyTextFiles = (files: string[], errors: string[]): void => {
	for (const filePath of files) {
		if (!textExtensions.has(path.extname(filePath))) {
			continue;
		}

		const text = readText(filePath);

		for (const { label, pattern } of blockedPatterns) {
			assert(!pattern.test(text), `${relative(filePath)} contains ${label}.`, errors);
		}
	}
};

const main = (): void => {
	const errors: string[] = [];
	const basePath = getAppBasePath();
	const siteUrl = getPublicSiteUrl();
	const repositoryUrl = getRepositoryUrl();
	const indexPath = path.join(publicDir, "index.html");
	const notFoundPath = path.join(publicDir, "404.html");

	assert(
		fs.existsSync(publicDir) && fs.statSync(publicDir).isDirectory(),
		".output/public is missing.",
		errors,
	);
	assert(existsFile(indexPath), "index.html is missing.", errors);
	assert(existsFile(notFoundPath), "404.html is missing.", errors);
	assert(existsFile(path.join(publicDir, ".nojekyll")), ".nojekyll is missing.", errors);
	assert(
		existsFile(path.join(publicDir, "manifest.webmanifest")),
		"manifest.webmanifest is missing.",
		errors,
	);
	assert(existsFile(path.join(publicDir, "index.html.gz")), "index.html.gz is missing.", errors);
	assert(existsFile(path.join(publicDir, "index.html.br")), "index.html.br is missing.", errors);
	assert(existsFile(path.join(publicDir, "404.html.gz")), "404.html.gz is missing.", errors);
	assert(existsFile(path.join(publicDir, "404.html.br")), "404.html.br is missing.", errors);

	if (errors.length === 0) {
		const files = listFiles(publicDir);
		const indexHtml = readText(indexPath);
		const notFoundHtml = readText(notFoundPath);
		const assetFiles = files.filter(filePath => relative(filePath).startsWith("assets/"));

		assert(
			indexHtml === notFoundHtml,
			"404.html must mirror index.html for SPA routes.",
			errors,
		);
		assert(assetFiles.length > 0, "assets directory is empty.", errors);
		assert(
			indexHtml.includes('<meta name="application-name" content="ghloc"'),
			"index.html is missing ghloc application metadata.",
			errors,
		);
		assert(
			indexHtml.includes(`content="${basePath}"`),
			`index.html is missing base path ${basePath}.`,
			errors,
		);
		assert(
			indexHtml.includes(`href="${basePath}assets/`),
			`index.html is missing ${basePath} stylesheet preload path.`,
			errors,
		);
		assert(
			indexHtml.includes(`src="${basePath}assets/`),
			`index.html is missing ${basePath} script path.`,
			errors,
		);
		assert(
			indexHtml.includes('island-src="src/pages/app/AppShell.island.lazy.tsx"'),
			"index.html is missing the app shell island.",
			errors,
		);
		assert(
			indexHtml.includes(`href="${basePath}manifest.webmanifest"`),
			"index.html is missing the base-path manifest URL.",
			errors,
		);
		assert(
			indexHtml.includes(repositoryUrl),
			`index.html is missing repository URL ${repositoryUrl}.`,
			errors,
		);

		if (siteUrl) {
			assert(
				indexHtml.includes(`href="${siteUrl}"`),
				`index.html is missing canonical URL ${siteUrl}.`,
				errors,
			);
			assert(
				indexHtml.includes(`content="${siteUrl}"`),
				`index.html is missing social URL ${siteUrl}.`,
				errors,
			);
		}

		verifyTextFiles(files, errors);

		if (errors.length === 0) {
			console.log(
				JSON.stringify(
					{
						assets: assetFiles.length,
						basePath,
						files: files.length,
						publicDir,
						repositoryUrl,
						siteUrl,
					},
					null,
					2,
				),
			);
		}
	}

	if (errors.length > 0) {
		throw new PagesArtifactError(errors);
	}
};

main();
