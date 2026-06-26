import { defineOxlintConfig } from "@pajecawav/tools";

export default defineOxlintConfig({
	ignorePatterns: [".output", ".nitro", "dist", "dist-vite"],
});
