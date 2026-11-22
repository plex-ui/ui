/**
 * Plex UI design tokens for platforms that do not read CSS (React Native): `@plexui/styles/tokens`.
 *
 * The CSS token files stay the one source of truth; `tokens.generated.ts` is built from them by
 * `scripts/build-tokens.mjs` (`npm run generate:tokens`), and tests/tokens keeps the two in step.
 *
 * ```ts
 * import { createTokenResolver, tokenLayers, defaultTokenContext } from "@plexui/styles/tokens"
 *
 * const tokens = createTokenResolver(tokenLayers, defaultTokenContext, { "--color-accent": "#e5484d" })
 * tokens.get("--color-text", "dark") // "#ffffff"
 * tokens.get("--accent-500", "light") // the brand accent, darker by black 20%
 * ```
 */
import type { TokenContext } from "./resolve.js"

export {
  createTokenResolver,
  declarationsFor,
  layerApplies,
  formatColor,
  mixColors,
  resolveValue,
  type ColorScheme,
  type LayerCondition,
  type TokenContext,
  type TokenLayer,
  type TokenResolver,
  type TokenValue,
} from "./resolve.js"
export { resolvedTokens, skippedDeclarations, tokenLayers } from "./tokens.generated.js"

/** The context `resolvedTokens` was built for: a phone in portrait, high density, motion allowed. */
export const defaultTokenContext: TokenContext = { width: 393, highDensity: true, reducedMotion: false }
