import fs from "fs";
import { brotliCompressSync, gzipSync } from "node:zlib";
import path from "path";
import { isGitHubPagesBuild } from "../config";

if (isGitHubPagesBuild()) {
	const publicDir = path.resolve(import.meta.dirname, "..", ".output/public");
	const indexHtml = fs.readFileSync(path.join(publicDir, "index.html"));
	const fallbackPath = path.join(publicDir, "404.html");

	fs.writeFileSync(fallbackPath, indexHtml);
	fs.writeFileSync(`${fallbackPath}.gz`, gzipSync(indexHtml));
	fs.writeFileSync(`${fallbackPath}.br`, brotliCompressSync(indexHtml));
}
