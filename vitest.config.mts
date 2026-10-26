import { defineConfig } from "vitest/config"

// React-vs-Vue DOM parity tests (`npm run test:parity`). React renders from
// packages/ui/src and Vue from packages/vue/src; both import the same CSS
// modules from @plexui/styles, kept unscoped so snapshots read "Button".
export default defineConfig({
  css: {
    // Skip the docs app's Tailwind PostCSS config: the CSS is already compiled
    postcss: { plugins: [] },
  },
  oxc: {
    jsx: { runtime: "automatic", importSource: "react" },
  },
  test: {
    environment: "jsdom",
    include: ["tests/parity/**/*.test.{ts,tsx}"],
    css: {
      include: [/\.module\.css$/],
      modules: { classNameStrategy: "non-scoped" },
    },
  },
})
