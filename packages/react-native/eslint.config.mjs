// Lint of @plexui/react-native. The package keeps its own config: the root one is the Next.js config of the docs
// site, and React Native code runs another React (the example app pins one Expo SDK).
import reactHooks from "eslint-plugin-react-hooks"
import { defineConfig, globalIgnores } from "eslint/config"
import tseslint from "typescript-eslint"

export default defineConfig([
  globalIgnores(["dist/**", "src/icons/**", "example/node_modules/**", "example/.expo/**", "example/dist/**", "example/test-results/**", "example/playwright-report/**"]),
  ...tseslint.configs.recommended,
  reactHooks.configs.flat["recommended-latest"],
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  // Metro reads a CommonJS config
  { files: ["example/metro.config.js"], rules: { "@typescript-eslint/no-require-imports": "off" } },
])
