import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

export default defineConfig({
  // The server reports the package version it ships in
  define: { __PLEXUI_MCP_VERSION__: JSON.stringify(version) },
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "es2022",
  bundle: true,
  dts: false,
  clean: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
