import fs from "fs";
import path from "path";
import { getGitHubPagesSiteUrl, getPublicSiteUrl } from "../config";

const sitemapOut = path.resolve(import.meta.dirname, "..", "public/sitemap.xml");
const osdOut = path.resolve(import.meta.dirname, "..", "public/osd.xml");

console.log(`Generating sitemap to ${sitemapOut}`);
console.log(`Generating OpenSearch descriptor to ${osdOut}`);

const data = fs.readFileSync(path.resolve(import.meta.dirname, "./repos.txt"), "utf8");
const repos = data.trim().split("\n");
const siteUrl = getPublicSiteUrl() ?? getGitHubPagesSiteUrl();

const buildEntry = (repo: string) =>
	`\
<url>
    <loc>${new URL(repo, siteUrl).toString()}</loc>
</url>`.trim();

const sitemap = `\
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"> 
    ${repos.map(repo => buildEntry(repo)).join("\n")}
</urlset>`.trim();

const osd = `\
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/" xmlns:moz="http://www.mozilla.org/2006/browser/search/">
    <ShortName>ghloc</ShortName>
    <Description>Search GitHub repos on ghloc</Description>
    <InputEncoding>UTF-8</InputEncoding>
    <Image width="32" height="32" type="image/x-icon">${new URL("favicon.ico", siteUrl)}</Image>
    <Tags>ghloc</Tags>
    <Url type="text/html" template="${siteUrl}?q={searchTerms}" />
    <moz:SearchForm>${siteUrl}</moz:SearchForm>
</OpenSearchDescription>`.trim();

fs.writeFileSync(sitemapOut, sitemap, "utf8");
fs.writeFileSync(osdOut, osd, "utf8");
