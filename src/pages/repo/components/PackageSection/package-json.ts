import { PackageJson } from "./types";

export const parsePackageJson = (raw: string): PackageJson | null => {
	try {
		const parsed = JSON.parse(raw) as PackageJson;

		if (!parsed || typeof parsed.name !== "string" || parsed.private) {
			return null;
		}

		return parsed;
	} catch {
		return null;
	}
};
