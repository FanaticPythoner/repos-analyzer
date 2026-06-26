export const normalizeBasePath = (value?: string | null): string => {
	if (!value || value === "/") {
		return "/";
	}

	const stripped = value.replace(/^\/+|\/+$/g, "");

	return stripped ? `/${stripped}/` : "/";
};

export const removeLeadingSlash = (path: string) => path.replace(/^\/+/, "");

export const stripBasePath = (basePath: string, path: string): string => {
	const normalizedBasePath = normalizeBasePath(basePath);
	const normalizedPath = `/${removeLeadingSlash(path)}`;

	if (normalizedBasePath === "/") {
		return normalizedPath;
	}

	if (normalizedPath === normalizedBasePath.slice(0, -1)) {
		return "/";
	}

	if (normalizedPath.startsWith(normalizedBasePath)) {
		return `/${normalizedPath.slice(normalizedBasePath.length)}`;
	}

	return normalizedPath;
};

export const joinBasePath = (basePath: string, path: string): string => {
	const normalizedBasePath = normalizeBasePath(basePath);
	const normalizedPath = `/${removeLeadingSlash(path)}`;

	if (normalizedBasePath === "/") {
		return normalizedPath;
	}

	if (normalizedPath === "/") {
		return normalizedBasePath;
	}

	if (normalizedPath.startsWith(normalizedBasePath)) {
		return normalizedPath;
	}

	return `${normalizedBasePath}${removeLeadingSlash(normalizedPath)}`;
};

export const normalizeSiteUrl = (value?: string | null): string | null => {
	if (!value) {
		return null;
	}

	const url = new URL(value);
	url.pathname = normalizeBasePath(url.pathname);
	url.search = "";
	url.hash = "";

	return url.toString();
};

export const joinSiteUrl = (siteUrl: string, basePath: string, path: string): string => {
	const normalizedSiteUrl = normalizeSiteUrl(siteUrl);

	if (!normalizedSiteUrl) {
		throw new Error("siteUrl is required.");
	}

	return new URL(removeLeadingSlash(stripBasePath(basePath, path)), normalizedSiteUrl).toString();
};

export const getDocumentBasePath = (): string => {
	if (typeof document === "undefined") {
		return "/";
	}

	return normalizeBasePath(
		document.querySelector<HTMLMetaElement>('meta[name="ghloc:base-path"]')?.content,
	);
};

export const toDocumentPath = (path: string): string => {
	return joinBasePath(getDocumentBasePath(), path);
};
