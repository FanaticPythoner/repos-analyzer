import type { Manifest, ManifestChunk } from "vite";
import { joinBasePath } from "./lib/public-path";

interface GetAssetsOptions {
	manifest: Manifest;
	clientEntry: string;
	basePath: string;
}

export interface Assets {
	css: string[];
	script: string;
	preloads: string[];
}

export const getAssets = ({ manifest, clientEntry, basePath }: GetAssetsOptions): Assets => {
	const chunk = manifest[clientEntry];
	const script = joinBasePath(basePath, chunk.file);

	const css = chunk.css?.map(link => joinBasePath(basePath, link)) ?? [];
	const preloads = [];

	const importedChunks = getImportedChunks(manifest, clientEntry);

	for (const chunk of importedChunks) {
		preloads.push(joinBasePath(basePath, chunk.file));
		css.push(...(chunk.css?.map(link => joinBasePath(basePath, link)) ?? []));
	}

	return { css, script, preloads };
};

const getImportedChunks = (manifest: Manifest, name: string): ManifestChunk[] => {
	const seen = new Set<string>();

	const innerGetImportedChunks = (chunk: ManifestChunk): ManifestChunk[] => {
		const chunks: ManifestChunk[] = [];
		for (const file of chunk.imports ?? []) {
			const importee = manifest[file];
			if (seen.has(file)) {
				continue;
			}
			seen.add(file);

			chunks.push(...innerGetImportedChunks(importee));
			chunks.push(importee);
		}

		return chunks;
	};

	return innerGetImportedChunks(manifest[name]);
};
