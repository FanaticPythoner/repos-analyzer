import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { ManifestOptions, VitePWA } from "vite-plugin-pwa";
import { CLIENT_ENTRY, getAppBasePath } from "./config";
import { islands } from "./src/lib/island/plugin";
import { joinBasePath } from "./src/lib/public-path";

const basePath = getAppBasePath();

const manifest: Partial<ManifestOptions> = {
	name: "ghloc",
	short_name: "ghloc",
	description: "Count lines of code in GitHub repository",
	icons: [
		{
			src: joinBasePath(basePath, "android-chrome-192x192.png"),
			sizes: "192x192",
			type: "image/png",
		},
		{
			src: joinBasePath(basePath, "android-chrome-512x512.png"),
			sizes: "512x512",
			type: "image/png",
		},
	],
	theme_color: "#000000",
	background_color: "#ffffff",
	display: "standalone",
	orientation: "portrait",
};

export default defineConfig({
	appType: "mpa",
	base: basePath,
	build: {
		manifest: true,
		sourcemap: true,
		outDir: "dist-vite",
		rollupOptions: {
			input: [CLIENT_ENTRY],
			preserveEntrySignatures: "allow-extension",
		},
	},
	resolve: {
		tsconfigPaths: true,
	},
	plugins: [
		islands.vite(),
		tailwindcss(),
		VitePWA({
			manifest,
			injectRegister: "auto",
			workbox: {
				globPatterns: ["**/*.{js,css,ico,png,svg}"],
				navigateFallback: null,
			},
		}),
	],
});
