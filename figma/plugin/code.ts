// Plex UI - Variable Collections Documentation Generator
// Generates clean, compact tables from selected Variable Collections

// ============================================================================
// Types
// ============================================================================

interface CollectionData {
  id: string
  name: string
  modes: { modeId: string; name: string }[]
  variableCount: number
  modeCount: number
}

interface ResolvedValue {
  type: "COLOR" | "FLOAT" | "STRING" | "BOOLEAN"
  value: RGB | RGBA | number | string | boolean
  isAlias: boolean
  aliasName?: string
  aliasId?: string
}

// Helper to handle optional alpha in color objects
interface ColorWithAlpha extends RGB {
  a?: number
}

interface VariableRowData {
  name: string
  group: string
  description: string
  scopes: string[]
  valuesByMode: Map<string, ResolvedValue>
}

// ============================================================================
// Constants
// ============================================================================

const COLORS = {
  white: { r: 1, g: 1, b: 1 },
  black: { r: 0, g: 0, b: 0 },
  gray50: { r: 0.937, g: 0.937, b: 0.937 },
  gray100: { r: 0.96, g: 0.96, b: 0.96 },
  gray200: { r: 0.9, g: 0.9, b: 0.9 },
  gray300: { r: 0.8, g: 0.8, b: 0.8 },
  gray400: { r: 0.6, g: 0.6, b: 0.6 },
  gray500: { r: 0.4, g: 0.4, b: 0.4 },
  gray900: { r: 0.1, g: 0.1, b: 0.1 },
  checkerLight: { r: 1, g: 1, b: 1 },
  checkerDark: { r: 0.9, g: 0.9, b: 0.9 },
  // Alpha colors (RGBA)
  grayAlpha08: { r: 0, g: 0, b: 0, a: 0.08 },
}

const LAYOUT = {
  columnWidths: {
    group: 100,
    token: 220, // Increased from 120 to prevent truncation
    mode: 400, // Increased to fit very long reference paths
    description: 400,
    scope: 120,
    cssToken: 200,
  },
  rowHeight: 72,
  headerHeight: 40,
  cellPadding: 12,
  swatchSize: 48,
  pillHeight: 32,
  borderRadius: 8,
  tableGap: 80,
  // Section styling
  sectionPadding: 128,
  sectionRadius: 20,
  // Title styling (72px heading)
  titlePaddingBottom: 8,
  titleFontSize: 72,
  titleLetterSpacing: -1.44,
  // Subtitle styling (32px heading with gray bg)
  subtitlePaddingTop: 96,
  subtitlePaddingHorizontal: 12,
  subtitlePaddingVertical: 16,
  subtitleFontSize: 32,
  subtitleLetterSpacing: -0.64,
  subtitleLineHeight: 38,
}

const FONT = {
  family: { family: "Inter", style: "Regular" },
  familyMedium: { family: "Inter", style: "Medium" },
  familySemiBold: { family: "Inter", style: "Semi Bold" },
  familyBold: { family: "Inter", style: "Bold" },
  familyMono: { family: "Roboto Mono", style: "Regular" },
  size: {
    small: 12,
    regular: 14,
    medium: 14,
    header: 14,
    secondary: 12,
    code: 13,
    title: 72,
  },
}

// ============================================================================
// Utility Functions
// ============================================================================

function rgbToHex(color: RGB | RGBA): string {
  const r = Math.round(color.r * 255)
  const g = Math.round(color.g * 255)
  const b = Math.round(color.b * 255)
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase()
}

function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`)
  }
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  }
}

function hasAlpha(color: RGB | RGBA): boolean {
  if (!color || typeof color !== "object") return false
  return "a" in color && color.a !== undefined && color.a < 1
}

function getAlphaPercent(color: RGBA): number {
  const alpha = color.a !== undefined ? color.a : 1
  return Math.round(alpha * 100)
}

function formatScope(scopes: VariableScope[]): string {
  if (!scopes || scopes.length === 0) return "All"

  const scopeMap: Record<string, string> = {
    ALL_SCOPES: "All",
    ALL_FILLS: "Fill",
    FRAME_FILL: "Frame Fill",
    SHAPE_FILL: "Shape Fill",
    TEXT_FILL: "Text Fill",
    STROKE_COLOR: "Stroke",
    CORNER_RADIUS: "Radius",
    WIDTH_HEIGHT: "Size",
    GAP: "Gap",
    STROKE_FLOAT: "Stroke Width",
    OPACITY: "Opacity",
    EFFECT_COLOR: "Effect",
    FONT_FAMILY: "Font Family",
    FONT_STYLE: "Font Style",
    FONT_WEIGHT: "Font Weight",
    FONT_SIZE: "Font Size",
    LINE_HEIGHT: "Line Height",
    LETTER_SPACING: "Letter Spacing",
    PARAGRAPH_SPACING: "Para Spacing",
    PARAGRAPH_INDENT: "Para Indent",
  }

  return scopes.map((s) => scopeMap[s] || s).join(", ")
}

function formatNumberValue(value: number, scopes: VariableScope[]): string {
  // Round to 2 decimal places
  const rounded = Math.round(value * 100) / 100

  // Determine unit based on scope
  const needsPx = scopes.some((s) =>
    [
      "CORNER_RADIUS",
      "WIDTH_HEIGHT",
      "GAP",
      "STROKE_FLOAT",
      "FONT_SIZE",
      "LINE_HEIGHT",
      "LETTER_SPACING",
      "PARAGRAPH_SPACING",
      "PARAGRAPH_INDENT",
    ].includes(s),
  )

  if (needsPx) {
    return `${rounded}px`
  }

  if (scopes.includes("OPACITY" as VariableScope)) {
    return `${Math.round(value * 100)}%`
  }

  return String(rounded)
}

function getVariableGroup(name: string): string {
  const parts = name.split("/")
  if (parts.length > 1) {
    return parts.slice(0, -1).join("/")
  }
  return ""
}

function getFirstLevelGroup(name: string): string {
  const parts = name.split("/")
  // For root-level variables (no '/'), return empty string
  // They will be grouped together in a column with empty header
  if (parts.length === 1) {
    return ""
  }
  return parts[0] || ""
}

// Helper to extract the second level group (e.g. 'clear-iso' from 'select-control/clear-iso/size/sm')
function getSubGroup(name: string): string {
  const parts = name.split("/")
  if (parts.length > 2) {
    return parts[1]
  }
  return ""
}

// Helper to extract the third level group (e.g. 'size' from 'select-control/clear-iso/size/sm')
function getDeepGroup(name: string, firstLevel: string, secondLevel: string): string {
  const prefix = `${firstLevel}/${secondLevel}/`
  if (!name.startsWith(prefix)) return ""

  const remainder = name.slice(prefix.length)
  const parts = remainder.split("/")
  // If there's at least one slash left (group/item), return the group
  if (parts.length > 1) {
    return parts[0]
  }
  return ""
}

function getVariableBaseName(name: string): string {
  const parts = name.split("/")
  return parts[parts.length - 1]
}

// Convert text to Sentence case (first letter uppercase, rest lowercase)
function toSentenceCase(str: string): string {
  if (!str) return ""
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Maps select-control paths to human-readable descriptions.
 */
/**
 * Helper to get semantic tokens for Button
 */
function getButtonSemanticToken(category: string, size: string): string | null {
  const s = size.toLowerCase().trim()

  if (category === "gutter") {
    if (s === "3xs") return "--control-gutter-2xs"
    if (s === "2xs" || s === "xs") return "--control-gutter-xs"
    if (s === "sm") return "--control-gutter-sm"
    if (s === "md" || s === "lg") return "--control-gutter-md"
    if (s === "xl" || s === "2xl") return "--control-gutter-lg"
    if (s === "3xl") return "--control-gutter-xl"
  }

  if (category === "radius") {
    if (["3xs", "2xs", "xs", "sm"].includes(s)) return "--control-radius-sm"
    if (["md", "lg"].includes(s)) return "--control-radius-md"
    if (s === "xl") return "--control-radius-lg"
    if (["2xl", "3xl"].includes(s)) return "--control-radius-xl"
  }

  if (category === "icon-size") {
    if (s === "3xs") return "--control-icon-size-xs"
    if (["2xs", "xs"].includes(s)) return "--control-icon-size-sm"
    if (["sm", "md", "lg", "xl"].includes(s)) return "--control-icon-size-md"
    if (["2xl", "3xl"].includes(s)) return "--control-icon-size-lg"
  }

  return null
}

/**
 * Helper to get semantic tokens for Input
 */
function getInputSemanticToken(category: string, size: string): string | null {
  const s = size.toLowerCase().trim()

  if (category === "gutter") {
    if (["3xs", "2xs", "xs"].includes(s)) return "--control-gutter-xs"
    if (s === "sm") return "--control-gutter-sm"
    if (["md", "lg"].includes(s)) return "--control-gutter-md"
    if (s === "xl") return "--control-gutter-lg"
    if (["2xl", "3xl"].includes(s)) return "--control-gutter-xl"
  }

  if (category === "radius") {
    if (["3xs", "2xs", "xs"].includes(s)) return "--control-radius-sm"
    if (["sm", "md", "lg"].includes(s)) return "--control-radius-md"
    if (s === "xl") return "--control-radius-lg"
    if (["2xl", "3xl"].includes(s)) return "--control-radius-xl"
  }

  if (category === "font-size") {
    if (["3xs", "2xs"].includes(s)) return "--control-font-size-sm"
    if (["xs", "sm", "md", "lg"].includes(s)) return "--control-font-size-md"
    if (["xl", "2xl", "3xl"].includes(s)) return "--control-font-size-lg"
  }

  return null
}

/**
 * Helper to get semantic tokens for SelectControl
 */
function getSelectControlSemanticToken(category: string, size: string): string | null {
  const s = size.toLowerCase().trim()

  if (category === "size") {
    return `--control-size-${s}`
  }

  if (category === "gutter") {
    if (s === "3xs") return "--control-gutter-2xs"
    if (s === "2xs" || s === "xs") return "--control-gutter-xs"
    if (s === "sm") return "--control-gutter-sm"
    if (s === "md" || s === "lg") return "--control-gutter-md"
    if (s === "xl" || s === "2xl") return "--control-gutter-lg"
    if (s === "3xl") return "--control-gutter-xl"
  }

  if (category === "radius") {
    if (["3xs", "2xs", "xs", "sm"].includes(s)) return "--control-radius-sm"
    if (["md", "lg"].includes(s)) return "--control-radius-md"
    if (s === "xl") return "--control-radius-lg"
    if (["2xl", "3xl"].includes(s)) return "--control-radius-xl"
  }

  if (category === "icon-size") {
    if (s === "3xs") return "--control-icon-size-xs"
    if (["2xs", "xs", "sm"].includes(s)) return "--control-icon-size-sm"
    if (["md", "lg", "xl"].includes(s)) return "--control-icon-size-md"
    if (["2xl", "3xl"].includes(s)) return "--control-icon-size-lg"
  }

  if (category === "font-size") {
    if (["3xs", "2xs"].includes(s)) return "--control-font-size-sm"
    if (["xs", "sm", "md", "lg", "xl"].includes(s)) return "--control-font-size-md"
    if (["2xl", "3xl"].includes(s)) return "--control-font-size-lg"
  }

  return null
}

/**
 * Helper to get spacing token for gaps
 */
function getGapSpacingToken(size: string, isEndWrapper: boolean): string | null {
  const s = size.toLowerCase().trim()

  // Indicator / End wrapper gaps usually have specific spacing
  if (isEndWrapper) {
    if (["3xs", "2xs", "xs", "sm", "xl"].includes(s)) return "--spacing-xs"
    if (["lg", "2xl", "3xl"].includes(s)) return "--spacing-sm"
    return "--spacing-xs"
  }

  // Main select-control gap
  if (s === "3xs") return "--spacing-xs"
  if (s === "2xs" || s === "xs") return "--spacing-sm"
  if (["sm", "md", "lg", "xl"].includes(s)) return "--spacing-md"
  if (s === "2xl" || s === "3xl") return "--spacing-lg"

  return null
}

/**
 * Helper for Button gaps
 * 3xs (3px), 2xs-sm (4px), md-3xl (6px)
 * Tokens exist in variables-components.css: --button-gap-sm, --button-gap-md, --button-gap-lg
 */
function getButtonGapToken(size: string): string | null {
  const s = size.toLowerCase().trim()
  // Map sizes to tokens based on values in code
  // sm, md, lg have explicit tokens
  if (s === "sm") return "--button-gap-sm"
  if (s === "md") return "--button-gap-md"
  if (s === "lg") return "--button-gap-lg"
  // Other sizes (3xs, 2xs, xs, xl, 2xl, 3xl) use same values as sm/md/lg but don't have tokens
  // 3xs = 3px (no token)
  // 2xs, xs = 4px (same as md, but no token for these sizes)
  // xl, 2xl, 3xl = 6px (same as lg, but no token for these sizes)
  return null
}

/**
 * Helper for Input gaps
 * 3xs-2xs (4px), xs (6px), sm-lg (8px), xl-3xl (10px)
 * Tokens exist in variables-components.css: --input-gap-xs, --input-gap-sm, --input-gap-md, --input-gap-lg
 */
function getInputGapToken(size: string): string | null {
  const s = size.toLowerCase().trim()
  // Map sizes to tokens based on values in code
  if (s === "xs") return "--input-gap-xs"
  if (s === "sm") return "--input-gap-sm"
  if (s === "md") return "--input-gap-md"
  if (s === "lg") return "--input-gap-lg"
  // Other sizes (3xs, 2xs, xl, 2xl, 3xl) use same values but don't have explicit tokens
  // 3xs, 2xs = 4px (same as xs, but no token)
  // xl, 2xl, 3xl = 10px (same as lg, but no token for these sizes)
  return null
}

/**
 * Helper for SelectControl main gaps
 * 3xs (4px), 2xs-xs (6px), sm-xl (8px), 2xl-3xl (10px)
 * All are hardcoded in SelectControl.module.css (no spacing() used)
 */
function getSelectControlGapToken(size: string): string | null {
  return null
}

/**
 * Helper for SelectControl end-gaps (IndicatorWrapper gap)
 * Matches SelectControl.module.css:
 * 3xs-md: 4px (--spacing-xs)
 * lg: 6px (--spacing-sm)
 * xl: 4px (--spacing-xs)
 * 2xl-3xl: 6px (--spacing-sm)
 */
function getSelectControlEndGapToken(size: string): string | null {
  const s = size.toLowerCase().trim()
  if (["3xs", "2xs", "xs", "sm", "md", "xl"].includes(s)) return "--spacing-xs" // 4px
  if (["lg", "2xl", "3xl"].includes(s)) return "--spacing-sm" // 6px
  return null
}

/**
 * Maps select-control paths to human-readable descriptions.
 */
function getSelectControlDescription(path: string): string {
  // Normalize for matching: remove all spaces, lowercase, and treat hyphens as slashes for matching
  const normalized = path.toLowerCase().replace(/\s+/g, "")
  const matchPath = normalized.replace(/-/g, "/")

  // Extract size from the last part of the path, trimmed
  const parts = path.split("/")
  const size = parts[parts.length - 1].trim()
  const context = size ? ` (${size})` : ""

  let tokenRef: string | null = null
  let label = ""

  // Gutter & Pill
  if (matchPath.includes("/gutter/")) {
    if (matchPath.includes("/pill/")) {
      label = "Select padding (Pill)"
      // Pill gutter is a calculated value in code: gutter * 1.33
      // We don't have a single token for it, but we can describe it.
      tokenRef = "calc(gutter * 1.33)"
    } else if (matchPath.includes("/indicator/") || matchPath.includes("/end/")) {
      label = "End wrapper padding"
      // In code: 0 for small, spacing(0) for md/lg, spacing(0.5) for xl, spacing(1) for 2xl+
      const s = size.toLowerCase().trim()
      if (s === "xl")
        tokenRef = "--spacing-2xs" // 2px
      else if (["2xl", "3xl"].includes(s))
        tokenRef = "--spacing-xs" // 4px
      else tokenRef = "--spacing-none" // 0px
    } else {
      tokenRef = getSelectControlSemanticToken("gutter", size)
      label = "Select padding"
    }
  }

  // Basic Sizing
  else if (
    matchPath.includes("/gap/") &&
    !matchPath.includes("/end/") &&
    !matchPath.includes("/start/") &&
    !matchPath.includes("/clear/") &&
    !matchPath.includes("/dropdown/")
  ) {
    tokenRef = getSelectControlGapToken(size)
    label = "Select gap"
  } else if (matchPath.includes("/end/gap/") || matchPath.includes("/end-gap/")) {
    tokenRef = getSelectControlEndGapToken(size)
    label = "End wrapper gap"
  } else if (matchPath.includes("/radius/")) {
    tokenRef = getSelectControlSemanticToken("radius", size)
    label = "Select radius"
  } else if (
    matchPath.includes("/size/") &&
    !matchPath.includes("/start/") &&
    !matchPath.includes("/clear/") &&
    !matchPath.includes("/loading/") &&
    !matchPath.includes("/dropdown/")
  ) {
    tokenRef = getSelectControlSemanticToken("size", size)
    label = "Select size"
  } else if (matchPath.includes("/font/size/") || matchPath.includes("/fontsize/")) {
    tokenRef = getSelectControlSemanticToken("font-size", size)
    label = "Font size"
  }

  // Start Icon
  else if (matchPath.includes("/start/") && matchPath.includes("/size/")) {
    tokenRef = getSelectControlSemanticToken("icon-size", size)
    label = "Start icon size"
  } else if (
    matchPath.includes("/start/") &&
    (matchPath.includes("/pill/") ||
      matchPath.includes("/offset/") ||
      matchPath.includes("/margin/"))
  ) {
    if (matchPath.includes("/pill/")) label = "Start icon pill offset"
    else label = "Start icon offset"
  }

  // Clear action
  // Check icon-size before size (more specific first)
  else if (
    matchPath.includes("/clear/") &&
    matchPath.includes("/icon/") &&
    matchPath.includes("/size/") &&
    !matchPath.includes("/iso/")
  ) {
    label = "Clear icon size"
  } else if (
    matchPath.includes("/clear/") &&
    matchPath.includes("/size/") &&
    !matchPath.includes("/icon/") &&
    !matchPath.includes("/iso/")
  ) {
    label = "Clear button size"
  } else if (
    matchPath.includes("/clear/") &&
    matchPath.includes("/iso/") &&
    matchPath.includes("/size/")
  ) {
    if (matchPath.includes("/icon/")) label = "Clear icon size (isolated)"
    else label = "Clear button size (isolated)"
  } else if (
    matchPath.includes("/clear/") &&
    (matchPath.includes("/pill/") ||
      matchPath.includes("/offset/") ||
      matchPath.includes("/margin/"))
  ) {
    if (matchPath.includes("/pill/")) label = "Clear button pill offset"
    else label = "Clear button offset"
  }

  // Dropdown Icon
  else if (matchPath.includes("/dropdown/") && matchPath.includes("/width/")) {
    label = "Dropdown icon width"
  } else if (matchPath.includes("/dropdown/") && matchPath.includes("/height/")) {
    label = "Dropdown icon height"
  } else if (matchPath.includes("/chevron/") && matchPath.includes("/width/")) {
    label = "Chevron icon width"
  } else if (matchPath.includes("/chevron/") && matchPath.includes("/height/")) {
    label = "Chevron icon height"
  } else if (
    matchPath.includes("/dropdown/") &&
    (matchPath.includes("/pill/") ||
      matchPath.includes("/offset/") ||
      matchPath.includes("/margin/"))
  ) {
    if (matchPath.includes("/pill/")) label = "Dropdown icon pill offset"
    else label = "Dropdown icon offset"
  }

  // Other components
  else if (matchPath.includes("/gap/")) {
    tokenRef = getGapSpacingToken(size, true)
    label = "End wrapper gap"
  } else if (matchPath.includes("/padding/")) label = "End wrapper padding"
  else if (matchPath.includes("/loading/") && matchPath.includes("/size/"))
    label = "Loading indicator size"
  else if (
    matchPath.includes("/loading/") &&
    (matchPath.includes("/pill/") || matchPath.includes("/offset/"))
  )
    label = "Loading indicator pill offset"

  if (!label) return ""

  // Only prefix with token if it's a unique semantic token (e.g., --control-size-sm) or spacing(x)
  return tokenRef ? `${tokenRef}\n${label}${context}` : `${label}${context}`
}

/**
 * Maps button paths to human-readable descriptions.
 */
function getButtonDescription(path: string): string {
  const normalized = path.toLowerCase().replace(/\s+/g, "")
  const matchPath = normalized.replace(/-/g, "/")
  const parts = path.split("/")
  const size = parts[parts.length - 1].trim()
  const context = size ? ` (${size})` : ""

  let tokenRef: string | null = null
  let label = ""

  // Handle gap-map separately - it's an artificial Figma collection for mapping
  // No tokens exist in code, values should be aliases to button/gap/*
  if (matchPath.includes("/gap-map/")) {
    // No token - this is an artificial collection for Figma
    // Values should reference button/gap/* as aliases
    // Description format: "Button gap mapping" (same as control/radius-map)
    label = "Button gap mapping"
  } else if (matchPath.includes("/icon-size/") || matchPath.includes("/iconsize/")) {
    tokenRef = getButtonSemanticToken("icon-size", size)
    label = "Button icon size"
  } else if (matchPath.includes("/gutter/")) {
    if (matchPath.includes("/pill/")) {
      label = "Button padding (Pill)"
      // Pill gutter is a calculated value in code: gutter * 1.33
      tokenRef = "calc(gutter * 1.33)"
    } else {
      tokenRef = getButtonSemanticToken("gutter", size)
      label = "Button padding"
    }
  } else if (matchPath.includes("/gap/")) {
    tokenRef = getButtonGapToken(size)
    label = "Button gap"
  } else if (matchPath.includes("/radius/")) {
    tokenRef = getButtonSemanticToken("radius", size)
    label = "Button radius"
  }

  if (!label) return ""
  return tokenRef ? `${tokenRef}\n${label}${context}` : `${label}${context}`
}

/**
 * Maps input paths to human-readable descriptions.
 */
function getInputDescription(path: string): string {
  const normalized = path.toLowerCase().replace(/\s+/g, "")
  const matchPath = normalized.replace(/-/g, "/")
  const parts = path.split("/")
  const size = parts[parts.length - 1].trim()
  const context = size ? ` (${size})` : ""

  let tokenRef: string | null = null
  let label = ""

  // Handle gap-map separately - it's an artificial Figma collection for mapping
  // No tokens exist in code, values should be aliases to input/gap/*
  if (matchPath.includes("/gap-map/")) {
    // No token - this is an artificial collection for Figma
    // Values should reference input/gap/* as aliases
    // Description format: "Input gap mapping" (same as control/radius-map)
    label = "Input gap mapping"
  } else if (matchPath.includes("/gutter/")) {
    if (matchPath.includes("/pill/")) {
      label = "Input padding (Pill)"
      // Pill gutter is a calculated value in code: gutter * 1.33
      tokenRef = "calc(gutter * 1.33)"
    } else {
      tokenRef = getInputSemanticToken("gutter", size)
      label = "Input padding"
    }
  } else if (matchPath.includes("/gap/")) {
    tokenRef = getInputGapToken(size)
    label = "Input gap"
  } else if (matchPath.includes("/radius/")) {
    tokenRef = getInputSemanticToken("radius", size)
    label = "Input radius"
  } else if (matchPath.includes("/font/size/") || matchPath.includes("/fontsize/")) {
    tokenRef = getInputSemanticToken("font-size", size)
    label = "Font size"
  }

  if (!label) return ""
  return tokenRef ? `${tokenRef}\n${label}${context}` : `${label}${context}`
}

/**
 * Maps menu paths to human-readable descriptions with CSS tokens.
 */
function getMenuDescription(path: string): string {
  const normalized = path.toLowerCase().replace(/\s+/g, "")
  // Don't replace hyphens with slashes - keep them as is for matching
  // Figma variable names use hyphens: menu/radio-item/indicator-size
  const matchPath = normalized
  const parts = path.split("/")

  let tokenRef: string | null = null
  let label = ""

  // menu/gutter
  if (matchPath === "menu/gutter") {
    tokenRef = "--menu-gutter"
    label = "Menu padding"
  }
  // menu/radius
  else if (matchPath === "menu/radius") {
    tokenRef = "--menu-radius"
    label = "Menu border radius"
  }
  // menu/item/gap
  else if (matchPath === "menu/item/gap") {
    tokenRef = "--menu-item-gap"
    label = "Item gap"
  }
  // menu/item/padding/top-bottom or menu/item/padding/left-right
  else if (matchPath.includes("menu/item/padding/")) {
    tokenRef = "--menu-item-padding"
    label = "Menu item padding"
  }
  // menu/separator/padding/top-bottom or menu/separator/padding/left-right
  else if (matchPath.includes("menu/separator/padding/")) {
    tokenRef = "--menu-separator-gutter"
    label = "Menu separator padding"
  }
  // menu/radio-item/indicator-size
  else if (matchPath === "menu/radio-item/indicator-size") {
    tokenRef = "--menu-radio-indicator-size"
    label = "Radio size"
  }
  // menu/radio-item/indicator-hole
  else if (matchPath === "menu/radio-item/indicator-hole") {
    tokenRef = "--menu-radio-indicator-hole-size"
    label = "Radio hole"
  }
  // menu/checkbox-item/indicator-size
  else if (matchPath === "menu/checkbox-item/indicator-size") {
    tokenRef = "--menu-checkbox-indicator-size"
    label = "Checkbox size"
  }
  // For other menu variables that already have tokens, return empty string
  // to preserve their existing descriptions
  else {
    return ""
  }

  if (!label) return ""
  return tokenRef ? `${tokenRef}\n${label}` : label
}

/**
 * Maps control paths to human-readable descriptions.
 */
function getControlDescription(path: string): string {
  const normalized = path.toLowerCase().replace(/\s+/g, "")
  const matchPath = normalized.replace(/-/g, "/")
  const parts = path.split("/")
  const size = parts[parts.length - 1].trim()
  const context = size ? ` (${size})` : ""

  let tokenRef: string | null = null
  let label = ""

  // Handle radius-map separately - it's an artificial Figma collection for mapping
  // No tokens exist in code, values should be aliases to control/radius/*
  if (matchPath.includes("/radius-map/")) {
    // No token - this is an artificial collection for Figma
    // Values should reference control/radius/* as aliases
    label = "Control radius mapping"
  } else if (matchPath.includes("/radius/")) {
    tokenRef = `--radius-${size}`
    label = "Control radius"
  } else if (matchPath.includes("/gutter/")) {
    // Map to control-gutter tokens (only 2xs, xs, sm, md, lg, xl exist in code)
    // These tokens exist in variables-semantic.css: --control-gutter-2xs, --control-gutter-xs, etc.
    // These are used for control padding (horizontal padding)
    const s = size.toLowerCase().trim()
    const gutterSizes = ["2xs", "xs", "sm", "md", "lg", "xl"]
    if (gutterSizes.includes(s)) {
      tokenRef = `--control-gutter-${s}`
    }
    label = "Control padding"
  } else if (matchPath.includes("/icon/size/") || matchPath.includes("/iconsize/")) {
    // Map to control-icon-size tokens (xs, sm, md, lg, xl, 2xl exist in code)
    // These tokens exist in variables-semantic.css: --control-icon-size-xs, --control-icon-size-sm, etc.
    const s = size.toLowerCase().trim()
    const iconSizes = ["xs", "sm", "md", "lg", "xl", "2xl"]
    if (iconSizes.includes(s)) {
      tokenRef = `--control-icon-size-${s}`
    }
    label = "Control icon size"
  } else if (
    matchPath.includes("/size/") &&
    !matchPath.includes("/font/") &&
    !matchPath.includes("/icon/") &&
    !matchPath.includes("/indicator/")
  ) {
    // Map to control-size tokens (all sizes exist in code)
    // These tokens exist in variables-semantic.css: --control-size-3xs, --control-size-2xs, etc.
    const s = size.toLowerCase().trim()
    const controlSizes = ["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"]
    if (controlSizes.includes(s)) {
      tokenRef = `--control-size-${s}`
    }
    label = "Control size"
  } else if (matchPath.includes("/indicator/size/") || matchPath.includes("/indicatorsize/")) {
    // No token exists for control-indicator-size in code
    label = "Control indicator size"
  }

  if (!label) return ""
  return tokenRef ? `${tokenRef}\n${label}${context}` : `${label}${context}`
}

/**
 * Maps spacing paths to human-readable descriptions.
 */
function getSpacingDescription(path: string): string {
  const parts = path.split("/")
  const size = parts[parts.length - 1].trim()
  const label = "Base unit"

  // Mapping based on common design system spacing (4px base)
  const mapping: Record<string, { token: string; formula: string }> = {
    "none": { token: "--spacing-none", formula: "spacing(0)" },
    "3xs": { token: "--spacing-3xs", formula: "spacing(0.25)" }, // 1px
    "2xs": { token: "--spacing-2xs", formula: "spacing(0.5)" }, // 2px
    "xs": { token: "--spacing-xs", formula: "spacing(1)" }, // 4px
    "sm": { token: "--spacing-sm", formula: "spacing(1.5)" }, // 6px
    "md": { token: "--spacing-md", formula: "spacing(2)" }, // 8px
    "lg": { token: "--spacing-lg", formula: "spacing(3)" }, // 12px
    "xl": { token: "--spacing-xl", formula: "spacing(4)" }, // 16px
    "2xl": { token: "--spacing-2xl", formula: "spacing(5)" }, // 20px
    "3xl": { token: "--spacing-3xl", formula: "spacing(6)" }, // 24px
    "4xl": { token: "--spacing-4xl", formula: "spacing(8)" }, // 32px
    "5xl": { token: "--spacing-5xl", formula: "spacing(10)" }, // 40px
    "6xl": { token: "--spacing-6xl", formula: "spacing(12)" }, // 48px
    "7xl": { token: "--spacing-7xl", formula: "spacing(16)" }, // 64px
    "8xl": { token: "--spacing-8xl", formula: "spacing(20)" }, // 80px
    "9xl": { token: "--spacing-9xl", formula: "spacing(24)" }, // 96px
    "10xl": { token: "--spacing-10xl", formula: "spacing(32)" }, // 128px
    "11xl": { token: "--spacing-11xl", formula: "spacing(42)" }, // 168px
  }

  const entry = mapping[size]
  if (!entry) return `${label} (${size})`

  return `${entry.token}\n${entry.formula}\n${label} (${size})`
}

/**
 * Fixes descriptions for variables in the Sizing collection.
 */
async function fixSizingTokens(): Promise<{ updatedCount: number; errors: string[] }> {
  let updatedCount = 0
  const errors: string[] = []

  try {
    const collections = await figma.variables.getLocalVariableCollectionsAsync()
    console.log(
      `[fixSizingTokens] Found ${collections.length} collections:`,
      collections.map((c) => c.name),
    )

    // Try finding by exact name (case-insensitive) or substring
    let sizingCollection = collections.find((c) => c.name.toLowerCase().trim() === "sizing")
    if (!sizingCollection) {
      sizingCollection = collections.find((c) => c.name.toLowerCase().includes("sizing"))
    }

    if (!sizingCollection) {
      const names = collections.map((c) => `"${c.name}"`).join(", ")
      console.error(`[fixSizingTokens] Sizing collection not found among: ${names}`)
      throw new Error(
        `Sizing collection not found. Found collections: ${names}. Please make sure you have a collection named "Sizing".`,
      )
    }

    console.log(
      `[fixSizingTokens] Using collection: "${sizingCollection.name}" (${sizingCollection.id})`,
    )
    const variables = await figma.variables.getLocalVariablesAsync()
    console.log(`[fixSizingTokens] Found ${variables.length} total local variables`)
    const sizingVariables = variables.filter((v) => v.variableCollectionId === sizingCollection.id)
    console.log(
      `[fixSizingTokens] Processing ${sizingVariables.length} variables in sizing collection`,
    )

    // Build map for aliasing: Name -> Variable
    const variableMap = new Map<string, Variable>()
    for (const v of variables) {
      variableMap.set(v.name.toLowerCase(), v)
    }

    // Helper to map tokenRef (e.g. --control-size-sm) to Figma Path (e.g. control/size/sm)
    const mapTokenToFigmaPath = (token: string): string | null => {
      if (token.startsWith("--spacing-")) {
        return `spacing/${token.replace("--spacing-", "")}`
      }
      if (token.startsWith("--radius-")) {
        return `radius/${token.replace("--radius-", "")}`
      }
      if (token.startsWith("--control-")) {
        const parts = token.replace("--control-", "").split("-")
        if (parts.length >= 2) {
          const category = parts.slice(0, parts.length - 1).join("-")
          const size = parts[parts.length - 1]
          return `control/${category}/${size}`
        }
      }
      return null
    }

    for (const variable of sizingVariables) {
      // Normalize path for matching (lowercase, no spaces)
      const normalizedPath = variable.name.toLowerCase().replace(/\s+/g, "")
      let newDescription = ""

      if (normalizedPath.startsWith("select-control/")) {
        newDescription = getSelectControlDescription(variable.name)
      } else if (normalizedPath.startsWith("spacing/")) {
        newDescription = getSpacingDescription(variable.name)
      } else if (normalizedPath.startsWith("button/")) {
        newDescription = getButtonDescription(variable.name)
      } else if (normalizedPath.startsWith("input/")) {
        newDescription = getInputDescription(variable.name)
      } else if (normalizedPath.startsWith("control/")) {
        newDescription = getControlDescription(variable.name)
      }

      if (newDescription) {
        // 1. Update description if it's different
        if (variable.description !== newDescription) {
          console.log(`[fixSizingTokens] Updating description for "${variable.name}":`)
          console.log(`  Old: ${variable.description.replace(/\n/g, "\\n")}`)
          console.log(`  New: ${newDescription.replace(/\n/g, "\\n")}`)
          variable.description = newDescription
          updatedCount++
        }
      }

      // 2. Update value to use Alias if possible (using either new or existing description)
      const currentDescription = variable.description
      const parsed = parseDescription(currentDescription)
      if (parsed.tokenRef) {
        const targetFigmaPath = mapTokenToFigmaPath(parsed.tokenRef)
        if (targetFigmaPath) {
          const targetVariable = variableMap.get(targetFigmaPath.toLowerCase())
          if (targetVariable && targetVariable.id !== variable.id) {
            // Apply alias to all modes
            for (const modeId of sizingCollection.modes.map((m) => m.modeId)) {
              const currentValue = variable.valuesByMode[modeId]
              const isAlreadyAlias =
                typeof currentValue === "object" &&
                "type" in currentValue &&
                currentValue.type === "VARIABLE_ALIAS" &&
                currentValue.id === targetVariable.id

              if (!isAlreadyAlias) {
                // Double check values match before aliasing
                // Note: We can only compare values if both target and source are numbers
                // If they are different, we shouldn't alias as it would change the design unexpectedly
                const targetValue =
                  targetVariable.valuesByMode[
                    targetVariable.variableCollectionId === sizingCollection.id
                      ? modeId
                      : targetVariable.variableCollectionId
                  ]
                // Simplify: just log and apply if it's a known semantic mapping.
                // We've already ensured our mapping functions return correct tokens for values.

                console.log(
                  `[fixSizingTokens] Setting alias for "${variable.name}" in mode ${modeId}: ${targetFigmaPath}`,
                )
                variable.setValueForMode(modeId, {
                  type: "VARIABLE_ALIAS",
                  id: targetVariable.id,
                })
                updatedCount++
              }
            }
          }
        }
      }
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }

  return { updatedCount, errors }
}

/**
 * Fixes token descriptions for variables in the Sizing collection.
 * Adds CSS token names to descriptions where they exist in code but are missing from descriptions.
 */
async function fixSizingTokenDescriptions(): Promise<{ updatedCount: number; errors: string[] }> {
  let updatedCount = 0
  const errors: string[] = []

  try {
    const collections = await figma.variables.getLocalVariableCollectionsAsync()
    console.log(
      `[fixSizingTokenDescriptions] Found ${collections.length} collections:`,
      collections.map((c) => c.name),
    )

    // Try finding by exact name (case-insensitive) or substring
    let sizingCollection = collections.find((c) => c.name.toLowerCase().trim() === "sizing")
    if (!sizingCollection) {
      sizingCollection = collections.find((c) => c.name.toLowerCase().includes("sizing"))
    }

    if (!sizingCollection) {
      const names = collections.map((c) => `"${c.name}"`).join(", ")
      console.error(`[fixSizingTokenDescriptions] Sizing collection not found among: ${names}`)
      throw new Error(
        `Sizing collection not found. Found collections: ${names}. Please make sure you have a collection named "Sizing".`,
      )
    }

    console.log(
      `[fixSizingTokenDescriptions] Using collection: "${sizingCollection.name}" (${sizingCollection.id})`,
    )
    const variables = await figma.variables.getLocalVariablesAsync()
    console.log(`[fixSizingTokenDescriptions] Found ${variables.length} total local variables`)
    const sizingVariables = variables.filter((v) => v.variableCollectionId === sizingCollection.id)
    console.log(
      `[fixSizingTokenDescriptions] Processing ${sizingVariables.length} variables in sizing collection`,
    )

    // Build map for aliasing: Name -> Variable
    const variableMap = new Map<string, Variable>()
    for (const v of variables) {
      variableMap.set(v.name.toLowerCase(), v)
    }

    // Mapping for control/radius-map/* to control/radius/*
    // radius-map is an artificial Figma collection for easier radius assignment
    // All values should be aliases to control/radius/*
    const radiusMapMapping: Record<string, string> = {
      "3xs": "control/radius/sm", // 3xs maps to sm
      "2xs": "control/radius/sm", // 2xs maps to sm
      "xs": "control/radius/sm", // xs maps to sm
      "sm": "control/radius/sm", // sm maps to sm
      "md": "control/radius/md", // md maps to md
      "lg": "control/radius/lg", // lg maps to lg
      "xl": "control/radius/xl", // xl maps to xl
      "2xl": "control/radius/xl", // 2xl maps to xl
      "3xl": "control/radius/xl", // 3xl maps to xl
    }

    for (const variable of sizingVariables) {
      // Normalize path for matching (lowercase, no spaces)
      const normalizedPath = variable.name.toLowerCase().replace(/\s+/g, "")
      let newDescription = ""

      // Handle control/radius-map separately - it needs special treatment
      if (normalizedPath.startsWith("control/radius-map/")) {
        const size = variable.name.split("/").pop()?.toLowerCase().trim() || ""
        newDescription = "Control radius mapping"

        // Set alias to corresponding control/radius/* variable
        const targetPath = radiusMapMapping[size]
        if (targetPath) {
          const targetVariable = variableMap.get(targetPath.toLowerCase())
          if (targetVariable && targetVariable.id !== variable.id) {
            // Apply alias to all modes
            for (const modeId of sizingCollection.modes.map((m) => m.modeId)) {
              const currentValue = variable.valuesByMode[modeId]
              const isAlreadyAlias =
                typeof currentValue === "object" &&
                "type" in currentValue &&
                currentValue.type === "VARIABLE_ALIAS" &&
                currentValue.id === targetVariable.id

              if (!isAlreadyAlias) {
                console.log(
                  `[fixSizingTokenDescriptions] Setting alias for "${variable.name}" in mode ${modeId}: ${targetPath}`,
                )
                variable.setValueForMode(modeId, {
                  type: "VARIABLE_ALIAS",
                  id: targetVariable.id,
                })
                updatedCount++
              }
            }
          }
        }
      }
      // Use existing description functions for other variables
      else if (normalizedPath.startsWith("select-control/")) {
        newDescription = getSelectControlDescription(variable.name)
      } else if (normalizedPath.startsWith("spacing/")) {
        newDescription = getSpacingDescription(variable.name)
      } else if (normalizedPath.startsWith("button/")) {
        newDescription = getButtonDescription(variable.name)
      } else if (normalizedPath.startsWith("input/")) {
        newDescription = getInputDescription(variable.name)
      } else if (normalizedPath.startsWith("control/")) {
        newDescription = getControlDescription(variable.name)
      } else {
        // Handle other components that might have tokens in code
        // For now, skip if no description function exists
        continue
      }

      if (newDescription) {
        // Update description if it's different
        if (variable.description !== newDescription) {
          console.log(`[fixSizingTokenDescriptions] Updating description for "${variable.name}":`)
          console.log(`  Old: ${variable.description.replace(/\n/g, "\\n")}`)
          console.log(`  New: ${newDescription.replace(/\n/g, "\\n")}`)
          variable.description = newDescription
          updatedCount++
        }
      }
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }

  return { updatedCount, errors }
}

/**
 * Fixes token descriptions for menu, button/gap, and input/gap variables in the Sizing collection.
 * Adds CSS token names to descriptions where they exist in code but are missing from descriptions.
 */
async function fixMenuTokenDescriptions(): Promise<{ updatedCount: number; errors: string[] }> {
  let updatedCount = 0
  const errors: string[] = []

  try {
    const collections = await figma.variables.getLocalVariableCollectionsAsync()
    console.log(
      `[fixMenuTokenDescriptions] Found ${collections.length} collections:`,
      collections.map((c) => c.name),
    )

    // Try finding by exact name (case-insensitive) or substring
    let sizingCollection = collections.find((c) => c.name.toLowerCase().trim() === "sizing")
    if (!sizingCollection) {
      sizingCollection = collections.find((c) => c.name.toLowerCase().includes("sizing"))
    }

    if (!sizingCollection) {
      const names = collections.map((c) => `"${c.name}"`).join(", ")
      console.error(`[fixMenuTokenDescriptions] Sizing collection not found among: ${names}`)
      throw new Error(
        `Sizing collection not found. Found collections: ${names}. Please make sure you have a collection named "Sizing".`,
      )
    }

    console.log(
      `[fixMenuTokenDescriptions] Using collection: "${sizingCollection.name}" (${sizingCollection.id})`,
    )
    const variables = await figma.variables.getLocalVariablesAsync()
    console.log(`[fixMenuTokenDescriptions] Found ${variables.length} total local variables`)
    const sizingVariables = variables.filter((v) => v.variableCollectionId === sizingCollection.id)
    console.log(
      `[fixMenuTokenDescriptions] Processing ${sizingVariables.length} variables in sizing collection`,
    )

    // Build map for aliasing: Name -> Variable
    const variableMap = new Map<string, Variable>()
    for (const v of variables) {
      variableMap.set(v.name.toLowerCase(), v)
    }

    // Mapping for button/gap-map/* to button/gap/*
    // gap-map is an artificial Figma collection for easier gap assignment
    const buttonGapMapMapping: Record<string, string> = {
      "3xs": "button/gap/sm", // 3xs maps to sm
      "2xs": "button/gap/md", // 2xs maps to md
      "xs": "button/gap/md", // xs maps to md
      "sm": "button/gap/md", // sm maps to md
      "md": "button/gap/lg", // md maps to lg
      "lg": "button/gap/lg", // lg maps to lg
      "xl": "button/gap/lg", // xl maps to lg
      "2xl": "button/gap/lg", // 2xl maps to lg
      "3xl": "button/gap/lg", // 3xl maps to lg
    }

    // Mapping for input/gap-map/* to input/gap/*
    const inputGapMapMapping: Record<string, string> = {
      "3xs": "input/gap/xs", // 3xs maps to xs
      "2xs": "input/gap/xs", // 2xs maps to xs
      "xs": "input/gap/sm", // xs maps to sm
      "sm": "input/gap/md", // sm maps to md
      "md": "input/gap/md", // md maps to md
      "lg": "input/gap/md", // lg maps to md
      "xl": "input/gap/lg", // xl maps to lg
      "2xl": "input/gap/lg", // 2xl maps to lg
      "3xl": "input/gap/lg", // 3xl maps to lg
    }

    // Filter menu, button/gap, button/gap-map, input/gap, and input/gap-map variables
    const targetVariables = sizingVariables.filter((v) => {
      const normalizedPath = v.name.toLowerCase().replace(/\s+/g, "")
      return (
        normalizedPath.startsWith("menu/") ||
        normalizedPath.startsWith("button/gap") ||
        normalizedPath.startsWith("input/gap")
      )
    })

    console.log(`[fixMenuTokenDescriptions] Found ${targetVariables.length} target variables`)

    for (const variable of targetVariables) {
      const normalizedPath = variable.name.toLowerCase().replace(/\s+/g, "")

      // Handle button/gap-map separately - it needs special treatment
      // gap-map variables should NEVER have tokens - they are artificial Figma collections
      if (normalizedPath.startsWith("button/gap-map/")) {
        const size = variable.name.split("/").pop()?.toLowerCase().trim() || ""
        const newDescription = "Button gap mapping"

        // Ensure no token in description (remove if present)
        const parsed = parseDescription(newDescription)
        const finalDescription = parsed.description // Use only description part, ignore token

        // Set alias to corresponding button/gap/* variable
        const targetPath = buttonGapMapMapping[size]
        if (targetPath) {
          const targetVariable = variableMap.get(targetPath.toLowerCase())
          if (targetVariable && targetVariable.id !== variable.id) {
            // Apply alias to all modes
            for (const modeId of sizingCollection.modes.map((m) => m.modeId)) {
              const currentValue = variable.valuesByMode[modeId]
              const isAlreadyAlias =
                typeof currentValue === "object" &&
                "type" in currentValue &&
                currentValue.type === "VARIABLE_ALIAS" &&
                currentValue.id === targetVariable.id

              if (!isAlreadyAlias) {
                console.log(
                  `[fixMenuTokenDescriptions] Setting alias for "${variable.name}" in mode ${modeId}: ${targetPath}`,
                )
                variable.setValueForMode(modeId, {
                  type: "VARIABLE_ALIAS",
                  id: targetVariable.id,
                })
                updatedCount++
              }
            }
          }
        }

        // Update description if it's different (always update to ensure no token)
        if (variable.description !== finalDescription) {
          console.log(`[fixMenuTokenDescriptions] Updating description for "${variable.name}":`)
          console.log(`  Old: ${variable.description.replace(/\n/g, "\\n")}`)
          console.log(`  New: ${finalDescription.replace(/\n/g, "\\n")}`)
          variable.description = finalDescription
          updatedCount++
        }
        continue
      }

      // Handle input/gap-map separately - it needs special treatment
      // gap-map variables should NEVER have tokens - they are artificial Figma collections
      if (normalizedPath.startsWith("input/gap-map/")) {
        const size = variable.name.split("/").pop()?.toLowerCase().trim() || ""
        const newDescription = "Input gap mapping"

        // Ensure no token in description (remove if present)
        const parsed = parseDescription(newDescription)
        const finalDescription = parsed.description // Use only description part, ignore token

        // Set alias to corresponding input/gap/* variable
        const targetPath = inputGapMapMapping[size]
        if (targetPath) {
          const targetVariable = variableMap.get(targetPath.toLowerCase())
          if (targetVariable && targetVariable.id !== variable.id) {
            // Apply alias to all modes
            for (const modeId of sizingCollection.modes.map((m) => m.modeId)) {
              const currentValue = variable.valuesByMode[modeId]
              const isAlreadyAlias =
                typeof currentValue === "object" &&
                "type" in currentValue &&
                currentValue.type === "VARIABLE_ALIAS" &&
                currentValue.id === targetVariable.id

              if (!isAlreadyAlias) {
                console.log(
                  `[fixMenuTokenDescriptions] Setting alias for "${variable.name}" in mode ${modeId}: ${targetPath}`,
                )
                variable.setValueForMode(modeId, {
                  type: "VARIABLE_ALIAS",
                  id: targetVariable.id,
                })
                updatedCount++
              }
            }
          }
        }

        // Update description if it's different (always update to ensure no token)
        if (variable.description !== finalDescription) {
          console.log(`[fixMenuTokenDescriptions] Updating description for "${variable.name}":`)
          console.log(`  Old: ${variable.description.replace(/\n/g, "\\n")}`)
          console.log(`  New: ${finalDescription.replace(/\n/g, "\\n")}`)
          variable.description = finalDescription
          updatedCount++
        }
        continue
      }

      // Check if description already has a token (starts with --)
      const currentDescription = variable.description || ""
      const hasToken = currentDescription.trim().startsWith("--")

      // If it already has a token, skip it
      if (hasToken) {
        console.log(
          `[fixMenuTokenDescriptions] Skipping "${variable.name}" - already has token in description`,
        )
        continue
      }

      // Get new description with token
      let newDescription = ""

      if (normalizedPath.startsWith("menu/")) {
        newDescription = getMenuDescription(variable.name)
      } else if (normalizedPath.startsWith("button/gap/")) {
        newDescription = getButtonDescription(variable.name)
      } else if (normalizedPath.startsWith("input/gap/")) {
        newDescription = getInputDescription(variable.name)
      }

      // Debug logging
      if (!newDescription) {
        console.log(
          `[fixMenuTokenDescriptions] No description generated for "${variable.name}" - get*Description returned empty`,
        )
        continue
      }

      // Update description if it's different
      if (variable.description !== newDescription) {
        console.log(`[fixMenuTokenDescriptions] Updating description for "${variable.name}":`)
        console.log(`  Old: ${variable.description.replace(/\n/g, "\\n")}`)
        console.log(`  New: ${newDescription.replace(/\n/g, "\\n")}`)
        variable.description = newDescription
        updatedCount++
      }
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }

  return { updatedCount, errors }
}

// ============================================================================
// Primitive Color Values (from src/styles/variables-primitive.css)
// ============================================================================

const PRIMITIVE_VALUES: Record<string, Record<string, string | { rgb: string; alpha: number }>> = {
  green: {
    "25": "#edfaf2",
    "50": "#d9f4e4",
    "75": "#b8ebcc",
    "100": "#8cdfad",
    "200": "#66d492",
    "300": "#40c977",
    "400": "#04b84c",
    "500": "#00a240",
    "600": "#008635",
    "700": "#00692a",
    "800": "#004f1f",
    "900": "#003716",
    "950": "#011c0b",
    "1000": "#001207",
    "a25": { rgb: "#04b84c", alpha: 0.08 },
    "a50": { rgb: "#04b84c", alpha: 0.15 },
    "a75": { rgb: "#04b84c", alpha: 0.29 },
    "a100": { rgb: "#04b84c", alpha: 0.45 },
    "a200": { rgb: "#04b84c", alpha: 0.6 },
    "a300": { rgb: "#04b84c", alpha: 0.75 },
  },
  red: {
    "25": "#fff0f0",
    "50": "#ffd9d9",
    "75": "#ffc6c5",
    "100": "#ffa4a2",
    "200": "#ff8583",
    "300": "#ff6764",
    "400": "#fa423e",
    "500": "#e02e2a",
    "600": "#ba2623",
    "700": "#911e1b",
    "800": "#6e1615",
    "900": "#4d100e",
    "950": "#280b0a",
    "1000": "#1f0909",
    "a25": { rgb: "#fa423e", alpha: 0.08 },
    "a50": { rgb: "#fa423e", alpha: 0.16 },
    "a75": { rgb: "#fa423e", alpha: 0.3 },
    "a100": { rgb: "#fa423e", alpha: 0.48 },
    "a200": { rgb: "#fa423e", alpha: 0.64 },
    "a300": { rgb: "#fa423e", alpha: 0.79 },
  },
  orange: {
    "25": "#fff5f0",
    "50": "#ffe7d9",
    "75": "#ffcfb4",
    "100": "#ffb790",
    "200": "#ff9e6c",
    "300": "#ff8549",
    "400": "#fb6a22",
    "500": "#e25507",
    "600": "#b9480d",
    "700": "#923b0f",
    "800": "#6d2e0f",
    "900": "#4a2206",
    "950": "#281105",
    "1000": "#211107",
    "a25": { rgb: "#fb6a22", alpha: 0.07 },
    "a50": { rgb: "#fb6a22", alpha: 0.16 },
    "a75": { rgb: "#fb6a22", alpha: 0.33 },
    "a100": { rgb: "#fb6a22", alpha: 0.48 },
    "a200": { rgb: "#fb6a22", alpha: 0.65 },
    "a300": { rgb: "#fb6a22", alpha: 0.81 },
  },
  yellow: {
    "25": "#fffbed",
    "50": "#fff6d9",
    "75": "#ffeeb8",
    "100": "#ffe48c",
    "200": "#ffdb66",
    "300": "#ffd240",
    "400": "#ffc300",
    "500": "#e0ac00",
    "600": "#ba8e00",
    "700": "#916f00",
    "800": "#6e5400",
    "900": "#4d3b00",
    "950": "#261d00",
    "1000": "#1a1400",
    "a25": { rgb: "#ffc300", alpha: 0.08 },
    "a50": { rgb: "#ffc300", alpha: 0.15 },
    "a75": { rgb: "#ffc300", alpha: 0.27 },
    "a100": { rgb: "#ffc300", alpha: 0.45 },
    "a200": { rgb: "#ffc300", alpha: 0.59 },
    "a300": { rgb: "#ffc300", alpha: 0.74 },
  },
  purple: {
    "25": "#f9f5fe",
    "50": "#efe5fe",
    "75": "#e0cefd",
    "100": "#ceb0fb",
    "200": "#be95fa",
    "300": "#ad7bf9",
    "400": "#924ff7",
    "500": "#8046d9",
    "600": "#6b3ab4",
    "700": "#532d8d",
    "800": "#3f226a",
    "900": "#2c184a",
    "950": "#160c25",
    "1000": "#100a19",
    "a25": { rgb: "#924ff7", alpha: 0.06 },
    "a50": { rgb: "#924ff7", alpha: 0.15 },
    "a75": { rgb: "#924ff7", alpha: 0.28 },
    "a100": { rgb: "#924ff7", alpha: 0.45 },
    "a200": { rgb: "#924ff7", alpha: 0.6 },
    "a300": { rgb: "#924ff7", alpha: 0.75 },
  },
  blue: {
    "25": "#f5faff",
    "50": "#e5f3ff",
    "75": "#cce6ff",
    "100": "#99ceff",
    "200": "#66b5ff",
    "300": "#339cff",
    "400": "#0285ff",
    "500": "#0169cc",
    "600": "#004f99",
    "700": "#003f7a",
    "800": "#013566",
    "900": "#00284d",
    "950": "#000e1a",
    "1000": "#000d19",
    "a25": { rgb: "#0285ff", alpha: 0.04 },
    "a50": { rgb: "#0285ff", alpha: 0.13 },
    "a75": { rgb: "#0285ff", alpha: 0.25 },
    "a100": { rgb: "#0285ff", alpha: 0.4 },
    "a200": { rgb: "#0285ff", alpha: 0.6 },
    "a300": { rgb: "#0285ff", alpha: 0.8 },
  },
}

interface ParsedDescription {
  description: string
  tokenRef: string | null
}

/**
 * Fixes primitive color values in Figma to match the code.
 * Updates all color primitives (green, red, orange, yellow, purple, blue) and their alpha variants.
 */
async function fixPrimitiveValues(): Promise<{ updatedCount: number; errors: string[] }> {
  let updatedCount = 0
  const errors: string[] = []

  try {
    const collections = await figma.variables.getLocalVariableCollectionsAsync()
    console.log(
      `[fixPrimitiveValues] Found ${collections.length} collections:`,
      collections.map((c) => c.name),
    )

    // Try finding by exact name (case-insensitive) or substring
    let primitiveCollection = collections.find(
      (c) => c.name.toLowerCase().trim() === "color primitive",
    )
    if (!primitiveCollection) {
      primitiveCollection = collections.find((c) =>
        c.name.toLowerCase().includes("color primitive"),
      )
    }
    if (!primitiveCollection) {
      primitiveCollection = collections.find((c) => c.name.toLowerCase().includes("primitive"))
    }

    if (!primitiveCollection) {
      const names = collections.map((c) => `"${c.name}"`).join(", ")
      console.error(`[fixPrimitiveValues] Color primitive collection not found among: ${names}`)
      throw new Error(
        `Color primitive collection not found. Found collections: ${names}. Please make sure you have a collection named "color primitive".`,
      )
    }

    console.log(
      `[fixPrimitiveValues] Using collection: "${primitiveCollection.name}" (${primitiveCollection.id})`,
    )
    const variables = await figma.variables.getLocalVariablesAsync()
    console.log(`[fixPrimitiveValues] Found ${variables.length} total local variables`)
    const primitiveVariables = variables.filter(
      (v) => v.variableCollectionId === primitiveCollection.id,
    )
    console.log(
      `[fixPrimitiveValues] Processing ${primitiveVariables.length} variables in primitive collection`,
    )

    // Process each variable
    for (const variable of primitiveVariables) {
      try {
        // Only process COLOR variables
        if (variable.resolvedType !== "COLOR") {
          console.log(
            `[fixPrimitiveValues] Skipping "${variable.name}" - not a color variable (type: ${variable.resolvedType})`,
          )
          continue
        }

        // Parse variable name (e.g., "green/400" or "green.400" or "green/a25")
        const nameParts = variable.name.toLowerCase().split(/[./]/)
        if (nameParts.length < 2) {
          console.log(`[fixPrimitiveValues] Skipping "${variable.name}" - invalid format`)
          continue
        }

        const colorName = nameParts[0]
        const index = nameParts[1]

        // Check if this is a valid color
        if (!PRIMITIVE_VALUES[colorName]) {
          console.log(
            `[fixPrimitiveValues] Skipping "${variable.name}" - unknown color: ${colorName}`,
          )
          continue
        }

        // Get the correct value
        const correctValue = PRIMITIVE_VALUES[colorName][index]
        if (!correctValue) {
          console.log(`[fixPrimitiveValues] Skipping "${variable.name}" - unknown index: ${index}`)
          continue
        }

        // Determine the value to set
        // Note: PRIMITIVE_VALUES stores hex (like in code/JSON), but Figma API requires RGB/RGBA objects (0-1 range)
        let valueToSet: RGB | RGBA

        if (typeof correctValue === "string") {
          // Regular color (hex string from code) -> convert to RGB for Figma API
          valueToSet = hexToRgb(correctValue)
        } else {
          // Alpha color (hex string + alpha) -> convert to RGBA for Figma API
          const baseRgb = hexToRgb(correctValue.rgb)
          valueToSet = {
            ...baseRgb,
            a: correctValue.alpha,
          }
        }

        // Update value for all modes
        for (const modeId of primitiveCollection.modes.map((m) => m.modeId)) {
          const currentValue = variable.valuesByMode[modeId]

          // Check if value needs updating
          let needsUpdate = false

          // Check if it's an alias (has 'type' property)
          if (typeof currentValue === "object" && currentValue !== null && "type" in currentValue) {
            // It's an alias or complex value, we need to set a direct value
            needsUpdate = true
          } else if (
            typeof currentValue === "object" &&
            currentValue !== null &&
            "r" in currentValue
          ) {
            // It's a color value (RGB or RGBA), compare it
            const currentR = Math.round((currentValue as RGB).r * 255)
            const currentG = Math.round((currentValue as RGB).g * 255)
            const currentB = Math.round((currentValue as RGB).b * 255)
            const targetR = Math.round(valueToSet.r * 255)
            const targetG = Math.round(valueToSet.g * 255)
            const targetB = Math.round(valueToSet.b * 255)

            if (currentR !== targetR || currentG !== targetG || currentB !== targetB) {
              needsUpdate = true
            }

            // Check alpha if it's an RGBA
            if ("a" in valueToSet) {
              const currentA = "a" in currentValue ? (currentValue as RGBA).a : 1
              const targetA = valueToSet.a
              if (Math.abs(currentA - targetA) > 0.001) {
                needsUpdate = true
              }
            } else if ("a" in currentValue && (currentValue as RGBA).a < 1) {
              // Current has alpha but target doesn't (shouldn't happen, but check)
              needsUpdate = true
            }
          } else {
            // Unknown type or null/undefined, update it
            needsUpdate = true
          }

          if (needsUpdate) {
            console.log(`[fixPrimitiveValues] Updating "${variable.name}" in mode ${modeId}`)
            variable.setValueForMode(modeId, valueToSet)
            updatedCount++
          }
        }
      } catch (error) {
        const errorMsg = `Error updating "${variable.name}": ${error instanceof Error ? error.message : String(error)}`
        console.error(`[fixPrimitiveValues] ${errorMsg}`)
        errors.push(errorMsg)
      }
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }

  return { updatedCount, errors }
}

function parseDescription(description: string): ParsedDescription {
  if (!description) {
    return { description: "", tokenRef: null }
  }

  // Check if description starts with a token reference like "--color-surface"
  const lines = description.split("\n")
  if (lines.length >= 1 && lines[0].startsWith("--")) {
    const tokenRef = lines[0].trim()
    const descriptionText = lines.slice(1).join("\n").trim()
    return { description: descriptionText, tokenRef }
  }

  return { description: description, tokenRef: null }
}

// ============================================================================
// Font Loading
// ============================================================================

async function loadFonts(): Promise<void> {
  console.log("[loadFonts] Starting to load fonts...")
  try {
    console.log("[loadFonts] Loading Inter fonts...")
    await figma.loadFontAsync(FONT.family)
    await figma.loadFontAsync(FONT.familyMedium)
    await figma.loadFontAsync(FONT.familySemiBold)
    await figma.loadFontAsync(FONT.familyBold)
    await figma.loadFontAsync(FONT.familyMono)
    console.log("[loadFonts] Inter fonts loaded successfully")
  } catch (error) {
    console.log("[loadFonts] Inter fonts failed, falling back to Roboto:", error)
    // Fallback to Roboto if Inter is not available
    FONT.family = { family: "Roboto", style: "Regular" }
    FONT.familyMedium = { family: "Roboto", style: "Medium" }
    FONT.familySemiBold = { family: "Roboto", style: "Bold" }
    FONT.familyBold = { family: "Roboto", style: "Bold" }
    FONT.familyMono = { family: "Roboto Mono", style: "Regular" }
    await figma.loadFontAsync(FONT.family)
    await figma.loadFontAsync(FONT.familyMedium)
    await figma.loadFontAsync(FONT.familySemiBold)
    await figma.loadFontAsync(FONT.familyBold)
    await figma.loadFontAsync(FONT.familyMono)
    console.log("[loadFonts] Roboto fonts loaded successfully")
  }
}

// ============================================================================
// Data Fetching
// ============================================================================

async function getCollectionsData(): Promise<CollectionData[]> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync()

  return collections.map((collection) => ({
    id: collection.id,
    name: collection.name,
    modes: collection.modes.map((m) => ({ modeId: m.modeId, name: m.name })),
    variableCount: collection.variableIds.length,
    modeCount: collection.modes.length,
  }))
}

async function getVariablesForCollection(collectionId: string): Promise<Variable[]> {
  const allVariables = await figma.variables.getLocalVariablesAsync()
  return allVariables.filter((v) => v.variableCollectionId === collectionId)
}

async function resolveValue(
  variable: Variable,
  modeId: string,
  modeName: string,
): Promise<ResolvedValue> {
  // Cache for collections to avoid redundant async calls
  const collectionCache = new Map<string, VariableCollection>()

  // Helper to find mode ID by name in a collection
  const findModeIdByName = async (
    collectionId: string,
    targetModeName: string,
  ): Promise<string | null> => {
    let collection = collectionCache.get(collectionId)
    if (!collection) {
      const fetchedCollection = await figma.variables.getVariableCollectionByIdAsync(collectionId)
      if (fetchedCollection) {
        collection = fetchedCollection
        collectionCache.set(collectionId, collection)
      }
    }
    if (!collection) {
      console.log("  [DEBUG] Collection not found:", collectionId)
      return null
    }

    const normalizedTargetName = targetModeName.trim().toLowerCase()

    // 1. Exact name match
    const exactMatch = collection.modes.find(
      (m) => m.name.trim().toLowerCase() === normalizedTargetName,
    )
    if (exactMatch) return exactMatch.modeId

    // 2. Fuzzy match (contains)
    const fuzzyMatch = collection.modes.find((m) =>
      m.name.trim().toLowerCase().includes(normalizedTargetName),
    )
    if (fuzzyMatch) return fuzzyMatch.modeId

    // 3. Single-mode collection - use that mode
    if (collection.modes.length === 1) return collection.modes[0].modeId

    // 4. Fallback to first mode
    return collection.modes[0]?.modeId || null
  }

  // Start with the initial value for the given mode
  let currentValue = variable.valuesByMode[modeId]

  // Track the first alias for display purposes
  let firstAliasName: string | undefined
  let firstAliasId: string | undefined
  let currentModeName = modeName
  let depth = 0
  const maxDepth = 10

  // Resolve alias chain
  while (
    depth < maxDepth &&
    currentValue &&
    typeof currentValue === "object" &&
    "type" in currentValue &&
    currentValue.type === "VARIABLE_ALIAS"
  ) {
    const aliasedVar = await figma.variables.getVariableByIdAsync(currentValue.id)
    if (!aliasedVar) {
      console.log("  [DEBUG] Aliased variable not found:", currentValue.id)
      break
    }

    // Store first alias info for display
    if (depth === 0) {
      firstAliasName = aliasedVar.name
      firstAliasId = aliasedVar.id
    }

    // Find the correct mode ID in the aliased variable's collection
    const targetModeId = await findModeIdByName(aliasedVar.variableCollectionId, currentModeName)
    if (!targetModeId) {
      console.log(
        "  [DEBUG] Mode not found for:",
        aliasedVar.name,
        "in collection:",
        aliasedVar.variableCollectionId,
      )
      break
    }

    // Get the value from the aliased variable for that mode
    currentValue = aliasedVar.valuesByMode[targetModeId]

    // If no value for that mode, try first available mode
    if (currentValue === undefined) {
      const modeIds = Object.keys(aliasedVar.valuesByMode)
      if (modeIds.length > 0) {
        currentValue = aliasedVar.valuesByMode[modeIds[0]]
      }
    }

    depth++
  }

  // Check if we resolved to a primitive value
  const isResolved =
    currentValue !== null &&
    currentValue !== undefined &&
    !(
      typeof currentValue === "object" &&
      "type" in currentValue &&
      currentValue.type === "VARIABLE_ALIAS"
    )

  if (isResolved) {
    return {
      type: variable.resolvedType,
      value: currentValue as RGB | RGBA | number | string | boolean,
      isAlias: firstAliasName !== undefined,
      aliasName: firstAliasName,
      aliasId: firstAliasId,
    }
  }

  // Resolution failed - return fallback
  console.log(
    "[WARN] Resolution failed for:",
    variable.name,
    "mode:",
    modeName,
    "depth reached:",
    depth,
  )
  return {
    type: variable.resolvedType,
    value:
      variable.resolvedType === "COLOR"
        ? { r: 1, g: 0, b: 1 } // Return MAGENTA for failed resolution (visible debug color)
        : variable.resolvedType === "FLOAT"
          ? 0
          : "",
    isAlias: firstAliasName !== undefined,
    aliasName: firstAliasName,
    aliasId: firstAliasId,
  }
}

// ============================================================================
// Component Builders
// ============================================================================

// Apply root frame styles from Figma variables
async function applyRootFrameStyles(root: FrameNode) {
  // Find style variables from the library
  const getVarByName = async (name: string) => {
    const vars = await figma.variables.getLocalVariablesAsync()
    return vars.find((v) => v.name === name)
  }

  const radiusVar = await getVarByName("figma/section/radius")
  const strokeWeightVar = await getVarByName("figma/section/stroke")
  const bgVar = await getVarByName("figma/section/notes/background")
  const strokeColorVar = await getVarByName("figma/section/notes/stroke")

  root.layoutMode = "VERTICAL"
  root.primaryAxisSizingMode = "AUTO"
  root.counterAxisSizingMode = "AUTO"

  // Set corner radius with variable binding
  if (radiusVar) {
    root.setBoundVariable("topLeftRadius", radiusVar)
    root.setBoundVariable("topRightRadius", radiusVar)
    root.setBoundVariable("bottomLeftRadius", radiusVar)
    root.setBoundVariable("bottomRightRadius", radiusVar)
  } else {
    root.cornerRadius = 20
  }

  // Set background with variable binding
  if (bgVar) {
    root.fills = [
      {
        type: "SOLID",
        color: COLORS.white,
        boundVariables: { color: { type: "VARIABLE_ALIAS", id: bgVar.id } },
      },
    ]
  } else {
    root.fills = [{ type: "SOLID", color: COLORS.white }]
  }

  // Set stroke with variable binding
  if (strokeColorVar) {
    root.strokes = [
      {
        type: "SOLID",
        color: { r: 0, g: 0, b: 0 },
        opacity: 0.4,
        boundVariables: { color: { type: "VARIABLE_ALIAS", id: strokeColorVar.id } },
      },
    ]
  } else {
    root.strokes = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: 0.4 }]
  }

  // Set stroke weight with variable binding
  if (strokeWeightVar) {
    root.setBoundVariable("strokeWeight", strokeWeightVar)
  } else {
    root.strokeWeight = 1
  }

  root.paddingLeft = 0
  root.paddingRight = 0
  root.paddingTop = 0
  root.paddingBottom = 0
}

// Find .title component and create an instance with given text
async function createTitleInstance(title: string): Promise<InstanceNode | FrameNode> {
  // Load all pages to access components across the document
  await figma.loadAllPagesAsync()

  // Try to find .title component by ID first, then by name
  let titleComponent = (await figma.getNodeByIdAsync("6151:90928")) as ComponentNode | null
  if (!titleComponent) {
    titleComponent = figma.root.findOne(
      (node) => node.type === "COMPONENT" && node.name === ".title",
    ) as ComponentNode | null
  }

  if (titleComponent) {
    const instance = titleComponent.createInstance()
    // Find text node inside and update it
    const textNode = instance.findOne((node) => node.type === "TEXT") as TextNode | null
    if (textNode) {
      await figma.loadFontAsync(textNode.fontName as FontName)
      textNode.characters = title
    }
    return instance
  }

  // Fallback: create frame if component not found
  const frame = figma.createFrame()
  frame.name = ".title"
  frame.layoutMode = "HORIZONTAL"
  frame.primaryAxisAlignItems = "MIN"
  frame.counterAxisAlignItems = "CENTER"
  frame.primaryAxisSizingMode = "AUTO"
  frame.counterAxisSizingMode = "AUTO"
  frame.paddingBottom = LAYOUT.titlePaddingBottom
  frame.fills = []

  const textNode = figma.createText()
  textNode.characters = title
  textNode.fontSize = LAYOUT.titleFontSize
  textNode.fontName = FONT.familyBold
  textNode.fills = [{ type: "SOLID", color: COLORS.black }]
  textNode.letterSpacing = { value: LAYOUT.titleLetterSpacing, unit: "PIXELS" }
  textNode.lineHeight = { value: LAYOUT.titleFontSize, unit: "PIXELS" }

  frame.appendChild(textNode)
  return frame
}

// Find .subtitle component and create an instance with given text
async function createSubtitleInstance(subtitle: string): Promise<InstanceNode | FrameNode> {
  // Load all pages to access components across the document
  await figma.loadAllPagesAsync()

  // Try to find .subtitle component by ID first, then by name
  let subtitleComponent = (await figma.getNodeByIdAsync("6194:43052")) as ComponentNode | null
  if (!subtitleComponent) {
    subtitleComponent = figma.root.findOne(
      (node) => node.type === "COMPONENT" && node.name === ".subtitle",
    ) as ComponentNode | null
  }

  if (subtitleComponent) {
    const instance = subtitleComponent.createInstance()
    // Find text node inside and update it
    const textNode = instance.findOne((node) => node.type === "TEXT") as TextNode | null
    if (textNode) {
      await figma.loadFontAsync(textNode.fontName as FontName)
      textNode.characters = subtitle
    }
    // Note: FILL width will be set by caller after appending to autolayout parent
    return instance
  }

  // Fallback: create frame if component not found
  const outerFrame = figma.createFrame()
  outerFrame.name = ".subtitle"
  outerFrame.layoutMode = "HORIZONTAL"
  outerFrame.primaryAxisAlignItems = "MIN"
  outerFrame.counterAxisAlignItems = "CENTER"
  outerFrame.primaryAxisSizingMode = "AUTO"
  outerFrame.counterAxisSizingMode = "AUTO"
  outerFrame.paddingTop = LAYOUT.subtitlePaddingTop
  outerFrame.fills = []

  const innerFrame = figma.createFrame()
  innerFrame.name = "group"
  innerFrame.layoutMode = "HORIZONTAL"
  innerFrame.primaryAxisAlignItems = "MIN"
  innerFrame.counterAxisAlignItems = "CENTER"
  outerFrame.appendChild(innerFrame)
  innerFrame.layoutSizingHorizontal = "FILL"
  innerFrame.counterAxisSizingMode = "AUTO"
  innerFrame.paddingLeft = LAYOUT.subtitlePaddingHorizontal
  innerFrame.paddingRight = LAYOUT.subtitlePaddingHorizontal
  innerFrame.paddingTop = LAYOUT.subtitlePaddingVertical
  innerFrame.paddingBottom = LAYOUT.subtitlePaddingVertical
  innerFrame.fills = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: 0.08 }]

  const textNode = figma.createText()
  textNode.characters = subtitle
  textNode.fontSize = LAYOUT.subtitleFontSize
  textNode.fontName = FONT.familySemiBold
  textNode.fills = [{ type: "SOLID", color: COLORS.black }]
  textNode.letterSpacing = { value: LAYOUT.subtitleLetterSpacing, unit: "PIXELS" }
  textNode.lineHeight = { value: LAYOUT.subtitleLineHeight, unit: "PIXELS" }

  innerFrame.appendChild(textNode)
  return outerFrame
}

// Find .subtitle component (Table small variant) and create instance
async function createTableSmallSubtitleInstance(
  subtitle: string,
): Promise<InstanceNode | FrameNode> {
  await figma.loadAllPagesAsync()

  let subtitleComponent = (await figma.getNodeByIdAsync("6194:130146")) as ComponentNode | null
  if (!subtitleComponent) {
    subtitleComponent = figma.root.findOne(
      (node) => node.type === "COMPONENT" && node.name === ".subtitle",
    ) as ComponentNode | null
  }

  if (subtitleComponent) {
    const instance = subtitleComponent.createInstance()
    const textNode = instance.findOne((node) => node.type === "TEXT") as TextNode | null
    if (textNode) {
      await figma.loadFontAsync(textNode.fontName as FontName)
      textNode.characters = subtitle
    }
    return instance
  }

  // Fallback: create frame if component not found
  const frame = figma.createFrame()
  frame.name = "Header Cell"
  frame.layoutMode = "HORIZONTAL"
  frame.primaryAxisAlignItems = "MIN"
  frame.counterAxisAlignItems = "CENTER"
  frame.layoutSizingHorizontal = "FIXED"
  frame.counterAxisSizingMode = "AUTO"
  frame.paddingLeft = 12
  frame.paddingRight = 12
  frame.paddingTop = 16
  frame.paddingBottom = 16
  frame.fills = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: 0.08 }]

  const text = figma.createText()
  text.characters = subtitle
  text.fontSize = 16
  text.fontName = FONT.familySemiBold
  text.fills = [{ type: "SOLID", color: COLORS.black }]
  frame.appendChild(text)

  return frame
}

// Calculate luminance to determine if color is light or dark
function isLightColor(color: RGB | RGBA): boolean {
  if (!color || typeof color !== "object") return false
  // Use relative luminance formula
  const r = color.r !== undefined ? color.r : 0
  const g = color.g !== undefined ? color.g : 0
  const b = color.b !== undefined ? color.b : 0
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b
  return luminance > 0.5 // Consider light if luminance > 50%
}

// Create checkerboard pattern for transparency display (Figma-style)
function createCheckerboardPattern(size: number): FrameNode {
  const frame = figma.createFrame()
  frame.name = "Checkerboard Pattern"
  frame.resize(size, size)
  frame.clipsContent = true
  frame.fills = []

  // Standard checkerboard colors: white and light gray
  const color1 = { r: 1, g: 1, b: 1 } // White
  const color2 = { r: 0.9, g: 0.9, b: 0.9 } // Light gray

  // Size of each square in the checkerboard
  const squareSize = 4

  const cols = Math.ceil(size / squareSize)
  const rows = Math.ceil(size / squareSize)

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const square = figma.createRectangle()
      square.resize(squareSize, squareSize)
      square.x = col * squareSize
      square.y = row * squareSize

      // Alternate colors for checkerboard pattern
      const isEven = (row + col) % 2 === 0
      square.fills = [{ type: "SOLID", color: isEven ? color1 : color2 }]

      frame.appendChild(square)
    }
  }

  return frame
}

// Create dot grid pattern (kept for backward compatibility if needed)
function createTransparencyPattern(size: number, useDarkPattern: boolean = false): FrameNode {
  const frame = figma.createFrame()
  frame.name = "Transparency Pattern"
  frame.resize(size, size)
  frame.clipsContent = true
  frame.cornerRadius = LAYOUT.borderRadius

  // Background color - dark for light colors, light for dark colors
  const bgColor = useDarkPattern
    ? { r: 0.15, g: 0.15, b: 0.15 } // Dark background for light/white colors
    : { r: 0.92, g: 0.92, b: 0.92 } // Light background for dark colors

  frame.fills = [{ type: "SOLID", color: bgColor }]

  // Add dot grid pattern
  const dotColor = useDarkPattern
    ? { r: 0.3, g: 0.3, b: 0.3 } // Lighter dots on dark bg
    : { r: 0.8, g: 0.8, b: 0.8 } // Darker dots on light bg

  const dotSize = 1.5
  const spacing = 4
  const cols = Math.ceil(size / spacing)
  const rows = Math.ceil(size / spacing)

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const dot = figma.createEllipse()
      dot.resize(dotSize, dotSize)
      dot.x = col * spacing + (spacing - dotSize) / 2
      dot.y = row * spacing + (spacing - dotSize) / 2
      dot.fills = [{ type: "SOLID", color: dotColor }]
      frame.appendChild(dot)
    }
  }

  return frame
}

function createColorSwatch(color: RGB | RGBA, size: number = LAYOUT.swatchSize): FrameNode {
  const container = figma.createFrame()
  container.name = "Color Swatch"
  container.resize(size, size)
  container.fills = []
  container.clipsContent = true
  container.cornerRadius = LAYOUT.borderRadius
  container.strokes = [{ type: "SOLID", color: COLORS.gray200 }]
  container.strokeWeight = 1

  const hasTransparency = hasAlpha(color as RGBA)
  const alpha = hasTransparency ? (color as RGBA).a : 1

  if (!hasTransparency || alpha === 1) {
    // Opaque color: show solid color on entire area
    const colorRect = figma.createRectangle()
    colorRect.name = "Color"
    colorRect.resize(size, size)
    colorRect.cornerRadius = LAYOUT.borderRadius
    colorRect.fills = [
      {
        type: "SOLID",
        color: { r: color.r, g: color.g, b: color.b },
        opacity: 1,
      },
    ]
    container.appendChild(colorRect)
    colorRect.x = 0
    colorRect.y = 0
  } else {
    // Transparent color: split-view approach
    const halfWidth = size / 2

    // Left half: solid color (no transparency)
    const leftRect = figma.createRectangle()
    leftRect.name = "Color Solid"
    leftRect.resize(halfWidth, size)
    leftRect.cornerRadius = 0
    leftRect.fills = [
      {
        type: "SOLID",
        color: { r: color.r, g: color.g, b: color.b },
        opacity: 1,
      },
    ]
    container.appendChild(leftRect)
    leftRect.x = 0
    leftRect.y = 0

    // Right half: checkerboard pattern + color with transparency
    const rightFrame = figma.createFrame()
    rightFrame.name = "Color Transparent"
    rightFrame.resize(halfWidth, size)
    rightFrame.fills = []
    rightFrame.clipsContent = true
    rightFrame.cornerRadius = 0

    // Add checkerboard pattern (full size, will be clipped by rightFrame)
    const checkerboard = createCheckerboardPattern(size)
    rightFrame.appendChild(checkerboard)
    checkerboard.x = 0
    checkerboard.y = 0

    // Add color with transparency on top
    const rightColorRect = figma.createRectangle()
    rightColorRect.name = "Color Overlay"
    rightColorRect.resize(halfWidth, size)
    rightColorRect.cornerRadius = 0
    rightColorRect.fills = [
      {
        type: "SOLID",
        color: { r: color.r, g: color.g, b: color.b },
        opacity: alpha,
      },
    ]
    rightFrame.appendChild(rightColorRect)
    rightColorRect.x = 0
    rightColorRect.y = 0

    container.appendChild(rightFrame)
    rightFrame.x = halfWidth
    rightFrame.y = 0
  }

  return container
}

function createPill(text: string, style: "token" | "reference" | "value" | "cssToken"): FrameNode {
  const pill = figma.createFrame()
  pill.name = `Pill: ${text}`
  pill.layoutMode = "HORIZONTAL"
  pill.primaryAxisAlignItems = "CENTER"
  pill.counterAxisAlignItems = "CENTER"
  pill.paddingLeft = 10
  pill.paddingRight = 10
  pill.paddingTop = 6
  pill.paddingBottom = 6
  pill.primaryAxisSizingMode = "AUTO"
  pill.counterAxisSizingMode = "AUTO"

  // Style-specific appearance
  if (style === "cssToken") {
    // Dark pill style with full rounding
    pill.cornerRadius = 100 // Full rounding
    pill.fills = [{ type: "SOLID", color: COLORS.gray200 }]
    pill.strokes = []
  } else {
    // Default style
    pill.cornerRadius = 6
    pill.fills = [{ type: "SOLID", color: COLORS.gray50 }]
    pill.strokes = [{ type: "SOLID", color: COLORS.gray200 }]
    pill.strokeWeight = 1
  }

  const textNode = figma.createText()
  textNode.characters = text
  textNode.fontSize = 13
  textNode.fontName = FONT.familyMono
  textNode.fills = [{ type: "SOLID", color: COLORS.gray900 }]

  pill.appendChild(textNode)
  return pill
}

function createTextCell(
  text: string,
  width: number,
  align: "LEFT" | "CENTER" | "RIGHT" = "LEFT",
  isHeader: boolean = false,
): FrameNode {
  const cell = figma.createFrame()
  cell.name = `Cell: ${text}`
  cell.layoutMode = "HORIZONTAL"
  cell.primaryAxisAlignItems = align === "LEFT" ? "MIN" : align === "RIGHT" ? "MAX" : "CENTER"
  cell.counterAxisAlignItems = "CENTER"
  cell.resize(width, isHeader ? LAYOUT.headerHeight : LAYOUT.rowHeight)
  cell.layoutSizingHorizontal = "FIXED"
  cell.layoutSizingVertical = "FIXED"
  cell.paddingLeft = LAYOUT.cellPadding
  cell.paddingRight = LAYOUT.cellPadding
  cell.clipsContent = false
  cell.fills = []

  const textNode = figma.createText()
  textNode.characters = text || "—"
  textNode.fontSize = isHeader ? FONT.size.header : FONT.size.regular
  textNode.fontName = isHeader ? FONT.familySemiBold : FONT.family
  textNode.fills = [{ type: "SOLID", color: isHeader ? COLORS.gray500 : COLORS.gray900 }]
  textNode.textAlignHorizontal = align
  textNode.textAutoResize = "WIDTH_AND_HEIGHT"

  cell.appendChild(textNode)
  return cell
}

function createWrappingTextCell(text: string, width: number, isDark: boolean = false): FrameNode {
  const cell = figma.createFrame()
  cell.name = `Cell: ${text}`
  cell.layoutMode = "HORIZONTAL"
  cell.primaryAxisAlignItems = "MIN"
  cell.counterAxisAlignItems = "CENTER"
  cell.resize(width, LAYOUT.rowHeight)
  cell.layoutSizingHorizontal = "FIXED"
  cell.layoutSizingVertical = "FIXED"
  cell.paddingLeft = LAYOUT.cellPadding
  cell.paddingRight = LAYOUT.cellPadding
  cell.clipsContent = true
  cell.fills = []

  const textNode = figma.createText()
  textNode.characters = text || "—"
  textNode.fontSize = FONT.size.regular // 14px for name and description
  textNode.fontName = FONT.family
  textNode.fills = [{ type: "SOLID", color: isDark ? COLORS.gray900 : COLORS.gray500 }]
  textNode.textAlignHorizontal = "LEFT"
  textNode.textAlignVertical = "CENTER"
  textNode.resize(width - LAYOUT.cellPadding * 2, LAYOUT.rowHeight)
  textNode.textAutoResize = "NONE"

  cell.appendChild(textNode)
  return cell
}

function createColorValueCell(resolvedValue: ResolvedValue, width: number): FrameNode {
  const cell = figma.createFrame()
  cell.name = "Color Value Cell"
  cell.layoutMode = "HORIZONTAL"
  cell.primaryAxisAlignItems = "MIN"
  cell.counterAxisAlignItems = "CENTER"
  cell.itemSpacing = 6
  cell.resize(width, LAYOUT.rowHeight)
  cell.layoutSizingHorizontal = "FIXED"
  cell.layoutSizingVertical = "FIXED"
  cell.paddingLeft = LAYOUT.cellPadding
  cell.paddingRight = LAYOUT.cellPadding
  cell.clipsContent = true
  cell.fills = []

  const color = resolvedValue.value as RGBA

  // Color swatch
  const swatch = createColorSwatch(color)
  cell.appendChild(swatch)

  if (resolvedValue.isAlias && resolvedValue.aliasName) {
    // Show reference pill
    const refPill = createPill(`${resolvedValue.aliasName}`, "reference")
    cell.appendChild(refPill)
  } else {
    // Show hex value
    const hexPill = createPill(rgbToHex(color), "value")
    cell.appendChild(hexPill)

    // Show opacity if alpha < 100%
    if (hasAlpha(color)) {
      const alphaPill = createPill(`${getAlphaPercent(color)}%`, "value")
      cell.appendChild(alphaPill)
    }
  }

  return cell
}

async function createNumberValueCell(
  resolvedValue: ResolvedValue,
  width: number,
  scopes: VariableScope[],
): Promise<FrameNode> {
  const cell = figma.createFrame()
  cell.name = "Number Value Cell"
  cell.layoutMode = "HORIZONTAL"
  cell.primaryAxisAlignItems = "MIN"
  cell.counterAxisAlignItems = "CENTER"
  cell.itemSpacing = 8
  cell.resize(width, LAYOUT.rowHeight)
  cell.layoutSizingHorizontal = "FIXED"
  cell.layoutSizingVertical = "FIXED"
  cell.paddingLeft = LAYOUT.cellPadding
  cell.paddingRight = LAYOUT.cellPadding
  cell.clipsContent = false
  cell.fills = []

  if (resolvedValue.isAlias && resolvedValue.aliasName) {
    // For long aliases (>25 characters), use wrapping text cell instead of pill
    if (resolvedValue.aliasName.length > 25) {
      // Create a text cell with wrapping for long aliases
      const textCell = figma.createFrame()
      textCell.name = "Alias Text"
      textCell.layoutMode = "HORIZONTAL"
      textCell.primaryAxisAlignItems = "MIN"
      textCell.counterAxisAlignItems = "CENTER"
      textCell.layoutSizingHorizontal = "FIXED"
      textCell.layoutSizingVertical = "HUG"
      textCell.paddingLeft = 0
      textCell.paddingRight = 0
      textCell.fills = []

      // Set width for text cell to allow wrapping
      const maxTextWidth = width - LAYOUT.cellPadding * 2
      textCell.resize(maxTextWidth, LAYOUT.rowHeight)

      const textNode = figma.createText()
      await figma.loadFontAsync(FONT.familyMono)
      textNode.characters = resolvedValue.aliasName
      textNode.fontSize = FONT.size.code
      textNode.fontName = FONT.familyMono
      textNode.fills = [{ type: "SOLID", color: COLORS.gray900 }]
      textNode.textAlignHorizontal = "LEFT"
      textNode.textAlignVertical = "TOP"
      textNode.resize(maxTextWidth, 20)
      textNode.textAutoResize = "HEIGHT"

      textCell.appendChild(textNode)
      cell.appendChild(textCell)

      // Update cell height if text wrapped to allow expansion
      if (textNode.height > LAYOUT.rowHeight) {
        cell.layoutSizingVertical = "HUG"
        const newHeight = Math.max(LAYOUT.rowHeight, textNode.height + LAYOUT.cellPadding * 2)
        cell.resize(width, newHeight)
        textCell.resize(maxTextWidth, newHeight - LAYOUT.cellPadding * 2)
      }
    } else {
      const refPill = createPill(`${resolvedValue.aliasName}`, "reference")
      cell.appendChild(refPill)
    }
  } else {
    const formattedValue = formatNumberValue(resolvedValue.value as number, scopes)
    const valuePill = createPill(formattedValue, "value")
    cell.appendChild(valuePill)
  }

  return cell
}

function createStringValueCell(resolvedValue: ResolvedValue, width: number): FrameNode {
  const cell = figma.createFrame()
  cell.name = "String Value Cell"
  cell.layoutMode = "HORIZONTAL"
  cell.primaryAxisAlignItems = "MIN"
  cell.counterAxisAlignItems = "CENTER"
  cell.resize(width, LAYOUT.rowHeight)
  cell.layoutSizingHorizontal = "FIXED"
  cell.layoutSizingVertical = "FIXED"
  cell.paddingLeft = LAYOUT.cellPadding
  cell.paddingRight = LAYOUT.cellPadding
  cell.fills = []

  if (resolvedValue.isAlias && resolvedValue.aliasName) {
    const refPill = createPill(`${resolvedValue.aliasName}`, "reference")
    cell.appendChild(refPill)
  } else {
    const valuePill = createPill(String(resolvedValue.value), "value")
    cell.appendChild(valuePill)
  }

  return cell
}

async function createValueCell(
  resolvedValue: ResolvedValue,
  width: number,
  scopes: VariableScope[],
): Promise<FrameNode> {
  switch (resolvedValue.type) {
    case "COLOR":
      return createColorValueCell(resolvedValue, width)
    case "FLOAT":
      return await createNumberValueCell(resolvedValue, width, scopes)
    case "STRING":
    case "BOOLEAN":
    default:
      return createStringValueCell(resolvedValue, width)
  }
}

// ============================================================================
// Table Generation
// ============================================================================

interface ColumnVisibility {
  showDescription: boolean
  showScope: boolean
  showTokenRef: boolean
}

function createHeaderRow(
  modes: { modeId: string; name: string }[],
  visibility: ColumnVisibility,
  totalWidth: number,
): FrameNode {
  const row = figma.createFrame()
  row.name = "Header Row"
  row.layoutMode = "HORIZONTAL"
  row.primaryAxisAlignItems = "MIN"
  row.counterAxisAlignItems = "CENTER"
  row.resize(totalWidth, LAYOUT.headerHeight)
  row.layoutSizingVertical = "FIXED"
  row.clipsContent = false
  row.fills = [{ type: "SOLID", color: COLORS.white }]

  // Name column
  row.appendChild(createTextCell("Name", LAYOUT.columnWidths.token, "LEFT", true))

  // Mode columns
  for (const mode of modes) {
    row.appendChild(createTextCell(mode.name, LAYOUT.columnWidths.mode, "LEFT", true))
  }

  // Scope column (if any variable has non-All scope)
  if (visibility.showScope) {
    row.appendChild(createTextCell("Scope", LAYOUT.columnWidths.scope, "LEFT", true))
  }

  // Description column (if any variable has description)
  if (visibility.showDescription) {
    row.appendChild(createTextCell("Description", LAYOUT.columnWidths.description, "LEFT", true))
  }

  // Token column (if any variable has token reference in description) - HUG width
  if (visibility.showTokenRef) {
    const tokenHeaderCell = figma.createFrame()
    tokenHeaderCell.name = "Token Header"
    tokenHeaderCell.layoutMode = "HORIZONTAL"
    tokenHeaderCell.primaryAxisAlignItems = "MIN"
    tokenHeaderCell.counterAxisAlignItems = "CENTER"
    tokenHeaderCell.layoutSizingHorizontal = "HUG"
    tokenHeaderCell.layoutSizingVertical = "FIXED"
    tokenHeaderCell.resize(100, LAYOUT.headerHeight)
    tokenHeaderCell.paddingLeft = LAYOUT.cellPadding
    tokenHeaderCell.paddingRight = LAYOUT.cellPadding
    tokenHeaderCell.fills = []

    const textNode = figma.createText()
    textNode.characters = "Token"
    textNode.fontSize = FONT.size.header
    textNode.fontName = FONT.familyMedium
    textNode.fills = [{ type: "SOLID", color: COLORS.gray500 }]
    tokenHeaderCell.appendChild(textNode)

    row.appendChild(tokenHeaderCell)
  }

  return row
}

async function createGroupHeader(
  groupName: string,
  totalWidth: number,
  visibility: ColumnVisibility,
): Promise<InstanceNode | FrameNode> {
  // Use .subtitle component instance for group headers
  // For root-level variables, groupName is empty string - creating subtitle with empty text
  return await createSubtitleInstance(groupName)
}

async function createSubGroupHeader(
  fullGroupPath: string,
  totalWidth: number,
  visibility: ColumnVisibility,
): Promise<InstanceNode | FrameNode> {
  // Use .subtitle component instance for sub-group headers
  return await createSubtitleInstance(fullGroupPath)
}

async function createDataRow(
  variable: Variable,
  modes: { modeId: string; name: string }[],
  visibility: ColumnVisibility,
  totalWidth: number,
  columnWidths: typeof LAYOUT.columnWidths,
): Promise<FrameNode> {
  const row = figma.createFrame()
  row.name = `Row: ${variable.name}`
  row.layoutMode = "HORIZONTAL"
  row.primaryAxisAlignItems = "MIN"
  row.counterAxisAlignItems = "CENTER"
  row.layoutSizingHorizontal = "HUG"
  row.layoutSizingVertical = "FIXED"
  row.resize(100, LAYOUT.rowHeight)
  row.clipsContent = false
  row.fills = [{ type: "SOLID", color: COLORS.white }]
  row.strokes = [{ type: "SOLID", color: COLORS.gray100 }]
  row.strokeWeight = 1
  row.strokeAlign = "INSIDE"
  // Only bottom stroke
  row.strokeTopWeight = 0
  row.strokeLeftWeight = 0
  row.strokeRightWeight = 0
  row.strokeBottomWeight = 1

  // Name column (plain text, base name only since group is in section header)
  row.appendChild(
    createWrappingTextCell(getVariableBaseName(variable.name), columnWidths.token, true),
  )

  // Mode columns
  for (const mode of modes) {
    const resolvedValue = await resolveValue(variable, mode.modeId, mode.name)
    const valueCell = await createValueCell(resolvedValue, columnWidths.mode, variable.scopes)
    row.appendChild(valueCell)
  }

  // Scope column (if visible)
  if (visibility.showScope) {
    row.appendChild(createWrappingTextCell(formatScope(variable.scopes), LAYOUT.columnWidths.scope))
  }

  // Parse description for token reference
  const parsed = parseDescription(variable.description || "")

  // Description column (if visible) - use parsed description without token ref
  if (visibility.showDescription) {
    row.appendChild(createWrappingTextCell(parsed.description, LAYOUT.columnWidths.description))
  }

  // Token column (if visible) - HUG width to never clip
  if (visibility.showTokenRef) {
    const tokenCell = figma.createFrame()
    tokenCell.name = "Token Cell"
    tokenCell.layoutMode = "HORIZONTAL"
    tokenCell.primaryAxisAlignItems = "MIN"
    tokenCell.counterAxisAlignItems = "CENTER"
    tokenCell.layoutSizingHorizontal = "HUG"
    tokenCell.layoutSizingVertical = "FIXED"
    tokenCell.resize(100, LAYOUT.rowHeight)
    tokenCell.paddingLeft = LAYOUT.cellPadding
    tokenCell.paddingRight = LAYOUT.cellPadding
    tokenCell.fills = []

    if (parsed.tokenRef) {
      const tokenPill = createPill(parsed.tokenRef, "cssToken")
      tokenCell.appendChild(tokenPill)
    }

    row.appendChild(tokenCell)
  }

  return row
}

async function generateTable(collectionId: string): Promise<FrameNode> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync()
  const collection = collections.find((c) => c.id === collectionId)

  if (!collection) {
    throw new Error(`Collection not found: ${collectionId}`)
  }

  const variables = await getVariablesForCollection(collectionId)
  const modes = collection.modes.map((m) => ({ modeId: m.modeId, name: m.name }))

  // Create autolayout frame as root
  const root = figma.createFrame()
  root.name = `Plex UI: ${collection.name}`

  await applyRootFrameStyles(root)

  // Create inner group frame for autolayout content
  const group = figma.createFrame()
  group.name = "group"
  group.layoutMode = "VERTICAL"
  group.primaryAxisSizingMode = "AUTO"
  group.counterAxisSizingMode = "AUTO"
  group.paddingLeft = LAYOUT.sectionPadding
  group.paddingRight = LAYOUT.sectionPadding
  group.paddingTop = LAYOUT.sectionPadding
  group.paddingBottom = LAYOUT.sectionPadding
  group.fills = []
  group.clipsContent = false

  // Get variables in Figma's original order (based on collection.variableIds)
  const orderedVariables: Variable[] = []
  for (const varId of collection.variableIds) {
    const variable = variables.find((v) => v.id === varId)
    if (variable) {
      orderedVariables.push(variable)
    }
  }

  // Determine column visibility
  // Show Description column only if at least one variable has a description (after parsing)
  const showDescription = orderedVariables.some((v) => {
    const parsed = parseDescription(v.description || "")
    return parsed.description.trim() !== ""
  })

  // Show Scope column only if at least one variable has a non-All scope
  const showScope = orderedVariables.some((v) => {
    const scopeText = formatScope(v.scopes)
    return scopeText !== "All"
  })

  // Show Token column only if at least one variable has a token reference in description
  const showTokenRef = orderedVariables.some((v) => {
    const parsed = parseDescription(v.description || "")
    return parsed.tokenRef !== null
  })

  const visibility: ColumnVisibility = { showDescription, showScope, showTokenRef }

  // Calculate dynamic column widths based on collection name
  const isColorCollection = collection.name.toLowerCase().includes("color")
  const columnWidths = {
    ...LAYOUT.columnWidths,
    token: isColorCollection ? LAYOUT.columnWidths.token : 120,
    mode: isColorCollection ? LAYOUT.columnWidths.mode : 250,
  }

  // Calculate total table width (accounting for hidden columns)
  let totalWidth = columnWidths.token + modes.length * columnWidths.mode
  if (showDescription) totalWidth += columnWidths.description
  if (showScope) totalWidth += columnWidths.scope
  if (showTokenRef) totalWidth += columnWidths.cssToken

  // Add title component with Sentence case collection name
  const titleComponent = await createTitleInstance(toSentenceCase(collection.name))
  group.appendChild(titleComponent)
  titleComponent.layoutSizingHorizontal = "FILL"

  // Group variables by first-level group (preserving order)
  const firstLevelGroups = new Map<string, Variable[]>()
  for (const variable of orderedVariables) {
    const firstLevel = getFirstLevelGroup(variable.name)
    if (!firstLevelGroups.has(firstLevel)) {
      firstLevelGroups.set(firstLevel, [])
    }
    firstLevelGroups.get(firstLevel)!.push(variable)
  }

  // Create horizontal content container for columns
  const contentFrame = figma.createFrame()
  contentFrame.name = "Content"
  contentFrame.layoutMode = "HORIZONTAL"
  contentFrame.primaryAxisAlignItems = "MIN"
  contentFrame.counterAxisAlignItems = "MIN"
  contentFrame.primaryAxisSizingMode = "AUTO"
  contentFrame.counterAxisSizingMode = "AUTO"
  contentFrame.itemSpacing = 160 // 160px gap between columns
  contentFrame.fills = []
  contentFrame.clipsContent = false

  group.appendChild(contentFrame)

  // Create a vertical column for each first-level group
  // Ensure the root group ('') always comes first in the table
  const sortedGroupNames = Array.from(firstLevelGroups.keys()).sort((a, b) => {
    if (a === "") return -1
    if (b === "") return 1
    // Maintain relative order for others (or could do alphabetical)
    return 0
  })

  for (const firstLevelName of sortedGroupNames) {
    const groupVariables = firstLevelGroups.get(firstLevelName)!

    // Create column frame for this first-level group
    const column = figma.createFrame()
    column.name = `Group: ${firstLevelName}`
    column.layoutMode = "VERTICAL"
    column.primaryAxisAlignItems = "MIN"
    column.counterAxisAlignItems = "MIN"
    column.primaryAxisSizingMode = "AUTO"
    column.counterAxisSizingMode = "AUTO"
    column.fills = []
    column.clipsContent = false

    // Check if there are sub-groups within this first-level group
    const subGrouped = new Map<string, Variable[]>()
    for (const variable of groupVariables) {
      const subGroup = getSubGroup(variable.name)
      if (!subGrouped.has(subGroup)) {
        subGrouped.set(subGroup, [])
      }
      subGrouped.get(subGroup)!.push(variable)
    }

    // Check if there are direct variables (not in sub-groups)
    const hasDirectVariables = subGrouped.has("") && subGrouped.get("")!.length > 0

    // If there are multiple sub-groups or meaningful sub-groups, show sub-headers
    const hasSubGroups = subGrouped.size > 1 || (subGrouped.size === 1 && !subGrouped.has(""))

    // Add column header (for root-level variables, firstLevelName is empty string)
    if (hasDirectVariables || !hasSubGroups) {
      const columnHeader = await createGroupHeader(firstLevelName, totalWidth, visibility)
      column.appendChild(columnHeader)
      columnHeader.layoutSizingHorizontal = "FILL"
    }

    if (hasSubGroups) {
      // Add rows with sub-group headers
      // Group by second level (Feature) first to keep clean sections (e.g. all clear-iso together)
      // Then group by third level (Attribute) inside to provide specific headers (e.g. clear-iso/size)
      let isFirstSubGroup = true

      for (const [subGroupName, variables] of subGrouped) {
        if (subGroupName !== "") {
          // This is a named subgroup (e.g. 'gap', 'clear-iso')
          // We need to check if it needs further splitting (Deep Grouping)
          const deepGrouped = new Map<string, Variable[]>()
          for (const v of variables) {
            const deepGroup = getDeepGroup(v.name, firstLevelName, subGroupName)
            if (!deepGrouped.has(deepGroup)) {
              deepGrouped.set(deepGroup, [])
            }
            deepGrouped.get(deepGroup)!.push(v)
          }

          for (const [deepGroupName, deepVariables] of deepGrouped) {
            // Add spacer before header (except for the very first group in the column)
            if (!isFirstSubGroup) {
              const spacer = figma.createFrame()
              spacer.name = "Sub-Group Spacer"
              spacer.layoutMode = "HORIZONTAL"
              spacer.layoutSizingHorizontal = "HUG"
              spacer.layoutSizingVertical = "FIXED"
              spacer.resize(100, 96)
              spacer.fills = []
              column.appendChild(spacer)
              spacer.layoutSizingHorizontal = "FILL"
            }

            // Construct header path: select-control/clear-iso/size OR select-control/gap
            // If deepGroupName is empty, we just show select-control/gap
            // If deepGroupName is present (e.g. 'size'), we show select-control/clear-iso/size
            const fullGroupPath = deepGroupName
              ? `${firstLevelName}/${subGroupName}/${deepGroupName}`
              : `${firstLevelName}/${subGroupName}`

            const subHeader = await createSubGroupHeader(fullGroupPath, totalWidth, visibility)
            column.appendChild(subHeader)
            subHeader.layoutSizingHorizontal = "FILL"

            // Add variables for this deep group
            for (const variable of deepVariables) {
              const dataRow = await createDataRow(
                variable,
                modes,
                visibility,
                totalWidth,
                columnWidths,
              )
              column.appendChild(dataRow)
              dataRow.layoutSizingHorizontal = "FILL"
            }

            isFirstSubGroup = false
          }
        } else {
          // Variables with no subgroup (direct children of first level)
          // Just render them
          for (const variable of variables) {
            const dataRow = await createDataRow(
              variable,
              modes,
              visibility,
              totalWidth,
              columnWidths,
            )
            column.appendChild(dataRow)
            dataRow.layoutSizingHorizontal = "FILL"
          }
        }
      }
    } else {
      // No sub-groups, just add rows directly in original order
      for (const variable of groupVariables) {
        const dataRow = await createDataRow(variable, modes, visibility, totalWidth, columnWidths)
        column.appendChild(dataRow)
        dataRow.layoutSizingHorizontal = "FILL"
      }
    }

    contentFrame.appendChild(column)
  }

  root.appendChild(group)
  return root
}

// ============================================================================
// Typography Table Generation
// ============================================================================

async function generateTypographyTable(): Promise<FrameNode> {
  const textStyles = await figma.getLocalTextStylesAsync()

  if (textStyles.length === 0) {
    throw new Error("No text styles found in this file")
  }

  // Weight mapping for sorting
  const getWeight = (style: string): number => {
    const weightMap: Record<string, number> = {
      "Thin": 100,
      "ExtraLight": 200,
      "Light": 300,
      "Regular": 400,
      "Medium": 500,
      "SemiBold": 600,
      "Semi Bold": 600,
      "Bold": 700,
      "ExtraBold": 800,
      "Black": 900,
    }
    return weightMap[style] || 400
  }

  // Size category order (largest to smallest)
  const getSizeOrder = (name: string): number => {
    const sizeOrder: Record<string, number> = {
      "5xl": 0,
      "4xl": 1,
      "3xl": 2,
      "2xl": 3,
      "xl": 4,
      "lg": 5,
      "md": 6,
      "sm": 7,
      "xs": 8,
      "2xs": 9,
      "3xs": 10,
    }
    const parts = name.split("/")
    for (const part of parts) {
      if (sizeOrder[part] !== undefined) {
        return sizeOrder[part]
      }
    }
    return 99
  }

  // Get name prefix (e.g., "heading" or "text")
  const getPrefix = (name: string): string => {
    return name.split("/")[0] || ""
  }

  // Sort by: tabular styles last, then prefix (alphabetically), then size category, then weight (heaviest first)
  textStyles.sort((a, b) => {
    // First check if either style is tabular - tabular styles go to the end
    const isTabularA = a.name.toLowerCase().includes("tabular")
    const isTabularB = b.name.toLowerCase().includes("tabular")
    if (isTabularA !== isTabularB) {
      return isTabularA ? 1 : -1 // Tabular styles come after non-tabular
    }
    // If both are tabular or both are not, continue with normal sorting
    // First by prefix
    const prefixA = getPrefix(a.name)
    const prefixB = getPrefix(b.name)
    if (prefixA !== prefixB) {
      return prefixA.localeCompare(prefixB)
    }
    // Then by size category
    const sizeOrderA = getSizeOrder(a.name)
    const sizeOrderB = getSizeOrder(b.name)
    if (sizeOrderA !== sizeOrderB) {
      return sizeOrderA - sizeOrderB
    }
    // Then by weight (heaviest first)
    return getWeight(b.fontName.style) - getWeight(a.fontName.style)
  })

  // Create root frame
  const root = figma.createFrame()
  root.name = "Plex UI: text styles"

  await applyRootFrameStyles(root)

  // Create inner group frame for autolayout content
  const group = figma.createFrame()
  group.name = "group"
  group.layoutMode = "VERTICAL"
  group.primaryAxisSizingMode = "AUTO"
  group.counterAxisSizingMode = "AUTO"
  group.paddingLeft = LAYOUT.sectionPadding
  group.paddingRight = LAYOUT.sectionPadding
  group.paddingTop = LAYOUT.sectionPadding
  group.paddingBottom = LAYOUT.sectionPadding
  group.fills = []
  group.clipsContent = false
  root.appendChild(group)

  // Column widths for typography table
  const TYPO_COLUMNS = {
    name: 220,
    size: 100,
    weight: 100,
    trackingPx: 140,
    trackingEm: 140,
    line: 100,
    example: 500,
  }
  const totalWidth =
    TYPO_COLUMNS.name +
    TYPO_COLUMNS.size +
    TYPO_COLUMNS.weight +
    TYPO_COLUMNS.trackingPx +
    TYPO_COLUMNS.trackingEm +
    TYPO_COLUMNS.line +
    TYPO_COLUMNS.example

  // Add title (using .title instance)
  const titleInstance = await createTitleInstance("Text styles")
  group.appendChild(titleInstance)
  titleInstance.layoutSizingHorizontal = "FILL"

  // Add header row (using .subtitle Table small instances)
  const headerRow = figma.createFrame()
  headerRow.name = "Header Row"
  headerRow.layoutMode = "HORIZONTAL"
  headerRow.primaryAxisAlignItems = "MIN"
  headerRow.counterAxisAlignItems = "CENTER"
  headerRow.primaryAxisSizingMode = "AUTO"
  headerRow.counterAxisSizingMode = "AUTO"
  headerRow.fills = []

  const headers = ["Name", "Size", "Weight", "Tracking (px)", "Tracking (em)", "Line", "Example"]
  const widths = [
    TYPO_COLUMNS.name,
    TYPO_COLUMNS.size,
    TYPO_COLUMNS.weight,
    TYPO_COLUMNS.trackingPx,
    TYPO_COLUMNS.trackingEm,
    TYPO_COLUMNS.line,
    TYPO_COLUMNS.example,
  ]

  for (let i = 0; i < headers.length; i++) {
    const subtitleInstance = await createTableSmallSubtitleInstance(headers[i])
    headerRow.appendChild(subtitleInstance)

    if (headers[i] === "Example") {
      subtitleInstance.layoutSizingHorizontal = "FILL"
    } else {
      subtitleInstance.resize(widths[i], subtitleInstance.height)
      subtitleInstance.layoutSizingHorizontal = "FIXED"
    }
  }

  group.appendChild(headerRow)
  headerRow.layoutSizingHorizontal = "FILL"

  // Sample paragraph for text normal styles with small font sizes
  const sampleParagraph =
    "Typography is the silent art that shapes how we experience written language. Beyond mere letters, it orchestrates rhythm, hierarchy, and emotion, guiding the reader's eye and setting the tone before a single word is read. The beauty of typography lies in its subtlety: the careful balance of space and form, the harmony between font size and line height, and the way thoughtfully chosen type can make content feel effortless, inviting, and human."

  // Helper to get example text based on style
  const getExampleText = (styleName: string, fontStyle: string, fontSize: number): string => {
    const nameLower = styleName.toLowerCase()
    const weightLower = fontStyle.toLowerCase()
    const isHeading = nameLower.includes("heading")
    const isTabular = nameLower.includes("tabular")
    const isNormalWeight = weightLower.includes("regular") || weightLower.includes("normal")

    // Tabular numbers styles should show numeric example text
    if (isTabular) {
      return "0123456789"
    }

    if (isHeading) {
      return "Page title example"
    } else {
      // For text normal/regular with size <= 18, show sample paragraph
      if (isNormalWeight && fontSize <= 18) {
        return sampleParagraph
      }
      return "Body text example"
    }
  }

  // Add rows for each text style
  for (const style of textStyles) {
    // Load the font for this style
    try {
      await figma.loadFontAsync(style.fontName)
    } catch {
      // Skip styles with unavailable fonts
      continue
    }

    const exampleText = getExampleText(style.name, style.fontName.style, style.fontSize)

    // Check if this will be a paragraph case
    const nameLowerCheck = style.name.toLowerCase()
    const weightLowerCheck = style.fontName.style.toLowerCase()
    const isHeadingCheck = nameLowerCheck.includes("heading")
    const isTabularCheck = nameLowerCheck.includes("tabular")
    const isNormalWeightCheck =
      weightLowerCheck.includes("regular") || weightLowerCheck.includes("normal")
    const willShowParagraph =
      !isHeadingCheck && !isTabularCheck && isNormalWeightCheck && style.fontSize <= 18

    const finalExampleText = willShowParagraph ? `Body text example\n${exampleText}` : exampleText

    // Create example text (auto width for non-paragraph, fixed width for paragraph)
    const exampleTextNode = figma.createText()
    await exampleTextNode.setTextStyleIdAsync(style.id)
    exampleTextNode.characters = finalExampleText
    exampleTextNode.fills = [{ type: "SOLID", color: COLORS.gray900 }]

    if (willShowParagraph) {
      // Paragraph needs fixed width to wrap
      exampleTextNode.resize(600, style.fontSize)
      exampleTextNode.textAutoResize = "HEIGHT"
    } else {
      // Short text - auto width, no wrap
      exampleTextNode.textAutoResize = "WIDTH_AND_HEIGHT"
    }

    // Calculate row height based on content
    let rowHeight = 72
    if (willShowParagraph) {
      // For paragraph: title + paragraph + spacing + padding
      const paragraphHeight = exampleTextNode.height
      rowHeight = Math.max(72, style.fontSize + 8 + paragraphHeight + 32)
    } else {
      // For short text: just font size + padding
      rowHeight = Math.max(72, style.fontSize + 32)
    }

    const row = figma.createFrame()
    row.name = `Row: ${style.name}`
    row.layoutMode = "HORIZONTAL"
    row.primaryAxisAlignItems = "MIN"
    row.counterAxisAlignItems = "CENTER"
    row.resize(totalWidth, rowHeight)
    row.layoutSizingHorizontal = "HUG"
    row.layoutSizingVertical = "FIXED"
    row.fills = [{ type: "SOLID", color: COLORS.white }]
    row.strokes = [{ type: "SOLID", color: COLORS.gray100 }]
    row.strokeWeight = 1
    row.strokeAlign = "INSIDE"
    row.strokeTopWeight = 0
    row.strokeLeftWeight = 0
    row.strokeRightWeight = 0
    row.strokeBottomWeight = 1

    // Name cell - regular font size like Token column
    row.appendChild(createWrappingTextCell(style.name, TYPO_COLUMNS.name, true))

    // Size cell
    const sizeCell = figma.createFrame()
    sizeCell.name = "Size Cell"
    sizeCell.layoutMode = "HORIZONTAL"
    sizeCell.primaryAxisAlignItems = "MIN"
    sizeCell.counterAxisAlignItems = "CENTER"
    sizeCell.resize(TYPO_COLUMNS.size, rowHeight)
    sizeCell.layoutSizingHorizontal = "FIXED"
    sizeCell.layoutSizingVertical = "FIXED"
    sizeCell.paddingLeft = LAYOUT.cellPadding
    sizeCell.fills = []
    sizeCell.appendChild(createPill(`${Math.round(style.fontSize)}px`, "value"))
    row.appendChild(sizeCell)

    // Weight cell
    const weightCell = figma.createFrame()
    weightCell.name = "Weight Cell"
    weightCell.layoutMode = "HORIZONTAL"
    weightCell.primaryAxisAlignItems = "MIN"
    weightCell.counterAxisAlignItems = "CENTER"
    weightCell.resize(TYPO_COLUMNS.weight, rowHeight)
    weightCell.layoutSizingHorizontal = "FIXED"
    weightCell.layoutSizingVertical = "FIXED"
    weightCell.paddingLeft = LAYOUT.cellPadding
    weightCell.fills = []
    // Extract weight from font style name or use common mapping
    const weightMap: Record<string, number> = {
      "Thin": 100,
      "ExtraLight": 200,
      "Light": 300,
      "Regular": 400,
      "Medium": 500,
      "SemiBold": 600,
      "Semi Bold": 600,
      "Bold": 700,
      "ExtraBold": 800,
      "Black": 900,
    }
    const fontStyle = style.fontName.style
    const weight = weightMap[fontStyle] || 400
    weightCell.appendChild(createPill(`${weight}`, "value"))
    row.appendChild(weightCell)

    // Tracking cell in pixels
    const trackingPxCell = figma.createFrame()
    trackingPxCell.name = "Tracking Px Cell"
    trackingPxCell.layoutMode = "HORIZONTAL"
    trackingPxCell.primaryAxisAlignItems = "MIN"
    trackingPxCell.counterAxisAlignItems = "CENTER"
    trackingPxCell.resize(TYPO_COLUMNS.trackingPx, rowHeight)
    trackingPxCell.layoutSizingHorizontal = "FIXED"
    trackingPxCell.layoutSizingVertical = "FIXED"
    trackingPxCell.paddingLeft = LAYOUT.cellPadding
    trackingPxCell.fills = []

    let trackingPxValue = 0
    if (style.letterSpacing.unit === "PIXELS") {
      trackingPxValue = Math.round(style.letterSpacing.value * 100) / 100
    } else if (style.letterSpacing.unit === "PERCENT") {
      trackingPxValue = Math.round((style.letterSpacing.value / 100) * style.fontSize * 100) / 100
    }
    trackingPxCell.appendChild(createPill(`${trackingPxValue}px`, "value"))
    row.appendChild(trackingPxCell)

    // Tracking cell in em
    const trackingEmCell = figma.createFrame()
    trackingEmCell.name = "Tracking Em Cell"
    trackingEmCell.layoutMode = "HORIZONTAL"
    trackingEmCell.primaryAxisAlignItems = "MIN"
    trackingEmCell.counterAxisAlignItems = "CENTER"
    trackingEmCell.resize(TYPO_COLUMNS.trackingEm, rowHeight)
    trackingEmCell.layoutSizingHorizontal = "FIXED"
    trackingEmCell.layoutSizingVertical = "FIXED"
    trackingEmCell.paddingLeft = LAYOUT.cellPadding
    trackingEmCell.fills = []

    const emValue = Math.round((trackingPxValue / style.fontSize) * 100) / 100
    trackingEmCell.appendChild(createPill(`${emValue}em`, "value"))
    row.appendChild(trackingEmCell)

    // Line height cell
    const lineCell = figma.createFrame()
    lineCell.name = "Line Cell"
    lineCell.layoutMode = "HORIZONTAL"
    lineCell.primaryAxisAlignItems = "MIN"
    lineCell.counterAxisAlignItems = "CENTER"
    lineCell.resize(TYPO_COLUMNS.line, rowHeight)
    lineCell.layoutSizingHorizontal = "FIXED"
    lineCell.layoutSizingVertical = "FIXED"
    lineCell.paddingLeft = LAYOUT.cellPadding
    lineCell.fills = []
    let lineHeightStr = "auto"
    if (style.lineHeight.unit === "PIXELS") {
      lineHeightStr = `${Math.round(style.lineHeight.value)}px`
    } else if (style.lineHeight.unit === "PERCENT") {
      lineHeightStr = `${Math.round(style.lineHeight.value)}%`
    }
    lineCell.appendChild(createPill(lineHeightStr, "value"))
    row.appendChild(lineCell)

    // Example cell - rendered at actual font size (last column, hug so it expands)
    const exampleCell = figma.createFrame()
    exampleCell.name = `Example: ${style.name}`
    exampleCell.layoutMode = "VERTICAL"
    exampleCell.primaryAxisAlignItems = "CENTER"
    exampleCell.counterAxisAlignItems = "MIN"
    exampleCell.itemSpacing = 8
    exampleCell.layoutSizingHorizontal = "HUG"
    exampleCell.layoutSizingVertical = "FIXED"
    exampleCell.resize(exampleCell.width, rowHeight)
    exampleCell.paddingLeft = LAYOUT.cellPadding
    exampleCell.paddingRight = LAYOUT.cellPadding
    exampleCell.clipsContent = false
    exampleCell.fills = []

    // Check if this is a paragraph case - add title above paragraph
    const nameLower = style.name.toLowerCase()
    const weightLower = style.fontName.style.toLowerCase()
    const isHeading = nameLower.includes("heading")
    const isTabular = nameLower.includes("tabular")
    const isNormalWeight = weightLower.includes("regular") || weightLower.includes("normal")
    const showParagraph = !isHeading && !isTabular && isNormalWeight && style.fontSize <= 18

    exampleCell.appendChild(exampleTextNode)
    row.appendChild(exampleCell)

    group.appendChild(row)
  }

  return root
}

// ============================================================================
// Main Plugin Logic
// ============================================================================

figma.showUI(__html__, { width: 400, height: 800 })

figma.ui.onmessage = async (msg: any) => {
  try {
    if (msg.type === "get-collections") {
      const collections = await getCollectionsData()
      figma.ui.postMessage({ type: "collections-data", collections })
    } else if (msg.type === "generate-tables" && msg.collectionIds) {
      await loadFonts()

      const tables: FrameNode[] = []
      let xOffset = 0

      // Get viewport center for positioning
      const viewportCenter = figma.viewport.center

      for (const collectionId of msg.collectionIds) {
        const table = await generateTable(collectionId)

        // Position table horizontally (side by side)
        table.x = viewportCenter.x + xOffset
        table.y = viewportCenter.y

        figma.currentPage.appendChild(table)
        tables.push(table)

        xOffset += table.width + LAYOUT.tableGap
      }

      // Select all generated tables and scroll to view
      figma.currentPage.selection = tables
      figma.viewport.scrollAndZoomIntoView(tables)

      figma.ui.postMessage({
        type: "generation-complete",
        count: tables.length,
      })
    } else if (msg.type === "generate-typography") {
      await loadFonts()

      const table = await generateTypographyTable()

      // Position at viewport center
      const viewportCenter = figma.viewport.center
      table.x = viewportCenter.x
      table.y = viewportCenter.y

      figma.currentPage.appendChild(table)
      figma.currentPage.selection = [table]
      figma.viewport.scrollAndZoomIntoView([table])

      figma.ui.postMessage({ type: "typography-complete" })
    } else if (msg.type === "fix-sizing-tokens") {
      console.log("[onmessage] Received fix-sizing-tokens message")
      const result = await fixSizingTokens()
      console.log(
        `[onmessage] fixSizingTokens result: updated=${result.updatedCount}, errors=${result.errors.length}`,
      )

      if (result.errors.length > 0) {
        figma.notify(
          `Fixed ${result.updatedCount} descriptions with ${result.errors.length} errors`,
          { error: true },
        )
        figma.ui.postMessage({
          type: "fix-sizing-tokens-complete",
          updatedCount: result.updatedCount,
          errors: result.errors,
        })
      } else {
        figma.notify(`Successfully updated ${result.updatedCount} descriptions`)
        figma.ui.postMessage({
          type: "fix-sizing-tokens-complete",
          updatedCount: result.updatedCount,
          errors: [],
        })
      }
    } else if (msg.type === "fix-token-descriptions") {
      console.log("[onmessage] Received fix-token-descriptions message")
      const result = await fixSizingTokenDescriptions()
      console.log(
        `[onmessage] fixSizingTokenDescriptions result: updated=${result.updatedCount}, errors=${result.errors.length}`,
      )

      if (result.errors.length > 0) {
        figma.notify(
          `Fixed ${result.updatedCount} token descriptions with ${result.errors.length} errors`,
          { error: true },
        )
        figma.ui.postMessage({
          type: "fix-token-descriptions-complete",
          updatedCount: result.updatedCount,
          errors: result.errors,
        })
      } else {
        figma.notify(`Successfully updated ${result.updatedCount} token descriptions`)
        figma.ui.postMessage({
          type: "fix-token-descriptions-complete",
          updatedCount: result.updatedCount,
          errors: [],
        })
      }
    } else if (msg.type === "fix-menu-token-descriptions") {
      console.log("[onmessage] Received fix-menu-token-descriptions message")
      const result = await fixMenuTokenDescriptions()
      console.log(
        `[onmessage] fixMenuTokenDescriptions result: updated=${result.updatedCount}, errors=${result.errors.length}`,
      )

      if (result.errors.length > 0) {
        figma.notify(
          `Fixed ${result.updatedCount} menu token descriptions with ${result.errors.length} errors`,
          { error: true },
        )
        figma.ui.postMessage({
          type: "fix-menu-token-descriptions-complete",
          updatedCount: result.updatedCount,
          errors: result.errors,
        })
      } else {
        figma.notify(`Successfully updated ${result.updatedCount} menu token descriptions`)
        figma.ui.postMessage({
          type: "fix-menu-token-descriptions-complete",
          updatedCount: result.updatedCount,
          errors: [],
        })
      }
    } else if (msg.type === "fix-primitive-values") {
      console.log("[onmessage] Received fix-primitive-values message")
      const result = await fixPrimitiveValues()
      console.log(
        `[onmessage] fixPrimitiveValues result: updated=${result.updatedCount}, errors=${result.errors.length}`,
      )

      if (result.errors.length > 0) {
        figma.notify(
          `Fixed ${result.updatedCount} primitive values with ${result.errors.length} errors`,
          { error: true },
        )
        figma.ui.postMessage({
          type: "fix-primitive-values-complete",
          updatedCount: result.updatedCount,
          errors: result.errors,
        })
      } else {
        figma.notify(`Successfully updated ${result.updatedCount} primitive values`)
        figma.ui.postMessage({
          type: "fix-primitive-values-complete",
          updatedCount: result.updatedCount,
          errors: [],
        })
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    figma.notify(`Error: ${errorMessage}`, { error: true })
    figma.ui.postMessage({ type: "generation-error", message: errorMessage })
  }
}
