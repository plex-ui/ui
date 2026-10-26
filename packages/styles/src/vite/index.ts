/**
 * Vite plugin for Plex UI.
 *
 * Importing `@plexui/styles/vite` (React apps can keep `@plexui/ui/vite`,
 * which re-exports it) and adding `plexui()` to your `plugins` array
 * eliminates every install-time gotcha documented in /docs/installation:
 *
 *   1. Pins `css.transformer = 'postcss'` so Lightning CSS doesn't
 *      reorder cascade layers strict-by-first-occurrence.
 *   2. Pins `build.cssMinify = 'esbuild'` so Vite 8's Lightning CSS
 *      minifier doesn't strip the bare `@layer` declaration.
 *   3. Injects `<style>@layer theme, base, components, utilities;</style>`
 *      into <head> as a runtime failsafe — the browser sees the layer
 *      order before any stylesheet rule arrives, regardless of how the
 *      bundler shuffles things.
 *
 * Usage:
 *
 *     // vite.config.ts
 *     import { defineConfig } from 'vite';
 *     import plexui from '@plexui/styles/vite';
 *
 *     export default defineConfig({
 *       plugins: [plexui()],
 *     });
 *
 * That replaces the manual `@layer …;` declaration in main.css and the
 * manual `css.transformer` / `build.cssMinify` overrides. Your global
 * stylesheet still needs `@import "@plexui/styles/css"` and `@source` —
 * those wire the runtime tokens and Tailwind class-extraction, which a
 * Vite plugin can't do for you.
 */

// We deliberately do NOT import from "vite". Keeping vite out of the
// build keeps it out of the runtime dependency graph entirely (the
// plugin file is a few dozen lines and only describes the shape vite
// expects). Consumers get full type-safety by declaring their config
// `defineConfig({ plugins: [plexui()] })` — vite's own types cover the
// `Plugin[]` slot, so our return value is just shaped to match it.
type ViteLikePlugin = {
  name: string
  enforce?: "pre" | "post"
  config?: () => {
    css?: { transformer?: "postcss" | "lightningcss" }
    build?: { cssMinify?: boolean | "esbuild" | "lightningcss" }
  }
  transformIndexHtml?: (html: string) => string
}

const LAYER_DECLARATION =
  "<style>@layer theme, base, components, utilities;</style>"

export type PlexUIPluginOptions = {
  /**
   * Inject the cascade-layer `<style>` tag into <head> as a runtime
   * failsafe. Defaults to `true`. Disable only if you've already added
   * the equivalent `<style>` tag to your `index.html` by hand.
   */
  injectLayerOrder?: boolean
}

export default function plexui(options: PlexUIPluginOptions = {}): ViteLikePlugin {
  const { injectLayerOrder = true } = options

  return {
    name: "@plexui/styles",
    enforce: "pre",
    config() {
      return {
        css: { transformer: "postcss" },
        build: { cssMinify: "esbuild" },
      }
    },
    transformIndexHtml(html) {
      if (!injectLayerOrder) return html
      // Place the layer declaration right after <head> so it lands
      // before any bundler-injected <link rel="stylesheet">.
      return html.replace(
        /(<head[^>]*>)/i,
        `$1\n    ${LAYER_DECLARATION}`,
      )
    },
  }
}
