import path from "path";
import { CLIENT_ENTRY, getAppBasePath, getPublicSiteUrl, getRepositoryUrl } from "./config";
import { islands } from "./src/lib/island/plugin";

export default defineNitroConfig({
	compatibilityDate: "2025-07-22",
	srcDir: "src",
	errorHandler: "~/error",
	compressPublicAssets: {
		gzip: true,
		brotli: true,
	},
	runtimeConfig: {
		clientEntry: path.normalize(CLIENT_ENTRY),
		publicBasePath: getAppBasePath(),
		publicRepositoryUrl: getRepositoryUrl(),
		publicSiteUrl: getPublicSiteUrl() ?? undefined,
	},
	rollupConfig: {
		plugins: [islands.rollup()],
	},
	timing: true,
	prerender: {
		routes: ["/", "/404.html"],
		crawlLinks: false,
	},
	experimental: {
		wasm: true,
	},
	publicAssets: [
		{
			baseURL: "assets",
			dir: "../dist-vite/assets",
			maxAge: 365 * 24 * 60 * 60,
		},
		{
			dir: "../dist-vite",
		},
	],
	serverAssets: [
		{
			baseName: "vite",
			dir: "../dist-vite/.vite",
		},
	],
	typescript: {
		tsConfig: {
			compilerOptions: {
				strict: true,
				jsx: "react-jsx",
				// Nitro tsconfig injects nano-jsx factories; Hono JSX uses jsxImportSource.
				jsxFactory: "",
				jsxFragmentFactory: "",
				jsxImportSource: "hono/jsx",
			},
		},
	},
	esbuild: {
		options: {
			jsx: "automatic",
			jsxImportSource: "hono/jsx",
		},
	},
});
