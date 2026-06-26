import fs from "fs";
import { brotliCompressSync, gzipSync } from "node:zlib";
import path from "path";
import { isGitHubPagesBuild } from "../config";

if (isGitHubPagesBuild()) {
	const publicDir = path.resolve(import.meta.dirname, "..", ".output/public");
	const indexHtml = fs.readFileSync(path.join(publicDir, "index.html"));
	const notFoundPath = path.join(publicDir, "404.html");

	fs.writeFileSync(notFoundPath, indexHtml);
	fs.writeFileSync(`${notFoundPath}.gz`, gzipSync(indexHtml));
	fs.writeFileSync(`${notFoundPath}.br`, brotliCompressSync(indexHtml));
}
