// @ts-check
/**
 * Builds the icon modules of @plexui/react-native from the shared icon sets of the repo, drawn with react-native-svg:
 *
 *   src/icons/plex       the Plex UI set (packages/ui/src/components/Icon/svg/*.tsx), `@plexui/react-native/icons`
 *   src/icons/lucide     packages/icons-lucide-outlined/icons/*.svg,     `@plexui/react-native/icons/lucide`
 *   src/icons/tabler     packages/icons-tabler-outlined/icons/*.svg,     `@plexui/react-native/icons/tabler`
 *   src/icons/hugeicons  packages/icons-hugeicons-outlined/icons/*.svg,  `@plexui/react-native/icons/hugeicons`
 *
 * One module per icon (a deep import keeps a bundle small) and an index of named exports, as the web Icon has. The
 * output is generated and gitignored: `npm run build:icons`. An icon is data, a tree of [tag, attributes, children];
 * `currentColor` becomes the icon's color and the accent variable the theme's accent.
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const pkg = join(here, "..")
const packages = join(pkg, "..")

const TAGS = new Set(["svg", "path", "g", "rect", "circle", "ellipse", "line", "polyline", "polygon"])
const ATTRS = new Map([
  ["viewBox", "viewBox"],
  // svg/JSX name -> react-native-svg prop
  ["d", "d"],
  ["fill", "fill"],
  ["fillRule", "fillRule"],
  ["fill-rule", "fillRule"],
  ["clipRule", "clipRule"],
  ["clip-rule", "clipRule"],
  ["opacity", "opacity"],
  ["fillOpacity", "fillOpacity"],
  ["fill-opacity", "fillOpacity"],
  ["stroke", "stroke"],
  ["strokeWidth", "strokeWidth"],
  ["stroke-width", "strokeWidth"],
  ["strokeLinecap", "strokeLinecap"],
  ["stroke-linecap", "strokeLinecap"],
  ["strokeLinejoin", "strokeLinejoin"],
  ["stroke-linejoin", "strokeLinejoin"],
  ["x", "x"],
  ["y", "y"],
  ["rx", "rx"],
  ["ry", "ry"],
  ["cx", "cx"],
  ["cy", "cy"],
  ["r", "r"],
  ["width", "width"],
  ["height", "height"],
  ["points", "points"],
  ["x1", "x1"],
  ["x2", "x2"],
  ["y1", "y1"],
  ["y2", "y2"],
  ["transform", "transform"],
])

/**
 * A tiny parser for the markup of an icon: elements with string or `{expression}` attributes and spreads of objects
 * the file declares (`spreads`), `{...props}` aside. Anything else in a tag throws: an icon must not lose a part.
 */
function parseMarkup(markup, file, spreads = {}) {
  const root = { tag: "#root", attrs: {}, children: [] }
  const stack = [root]
  const re = /<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g
  let match
  while ((match = re.exec(markup))) {
    const [, closing, tag, rawAttrs, selfClosing] = match
    if (closing) {
      stack.pop()
      continue
    }
    if (!TAGS.has(tag)) throw new Error(`${file}: <${tag}> is not supported`)
    const attrs = {}
    // In order, as JSX applies them: a later attribute or spread wins
    const rest = rawAttrs.replace(/([a-zA-Z:-]+)=(?:"([^"]*)"|'([^']*)'|\{([^}]*)\})|\{\.\.\.([a-zA-Z_$][\w$]*)\}/g, (_, name, dq, sq, expr, spread) => {
      if (spread) {
        if (spread === "props") return ""
        if (!spreads[spread]) throw new Error(`${file}: <${tag} {...${spread}}>: ${spread} is not an object literal of the file`)
        Object.assign(attrs, spreads[spread])
        return ""
      }
      attrs[name] = (dq ?? sq ?? expr ?? "").replace(/^["']|["']$/g, "")
      return ""
    })
    if (rest.trim()) throw new Error(`${file}: <${tag}> has markup the icon builder does not read: ${rest.trim().slice(0, 80)}`)
    const node = { tag, attrs, children: [] }
    stack[stack.length - 1].children.push(node)
    if (!selfClosing) stack.push(node)
  }
  const svg = root.children[0]
  if (!svg || svg.tag !== "svg") throw new Error(`${file}: no <svg>`)
  return svg
}

/** The object literals of an icon module (`const pathProps = { d: "...", fill: "currentColor" }`), for its spreads. */
function objectLiterals(source) {
  const out = {}
  for (const [, name, body] of source.matchAll(/^const ([a-zA-Z_$][\w$]*)(?::[^=\n]+)? = \{([\s\S]*?)^\}/gm)) {
    const attrs = {}
    const rest = body.replace(/([a-zA-Z]+):\s*(?:"([^"]*)"|'([^']*)'|(-?\d*\.?\d+))\s*,?/g, (_, key, dq, sq, num) => {
      attrs[key] = dq ?? sq ?? num
      return ""
    })
    if (rest.trim()) throw new Error(`const ${name}: only string and number properties are read, not: ${rest.trim().slice(0, 80)}`)
    out[name] = attrs
  }
  return out
}

const colorValue = (value) => {
  if (value === "currentColor") return 0 // the icon's color
  if (/^var\(--color-accent/.test(value)) return 1 // the theme's accent
  return value
}

// Presentation attributes a shape inherits from the <svg> and <g> around it, as in SVG
const INHERITED = ["fill", "fillRule", "stroke", "strokeWidth", "strokeLinecap", "strokeLinejoin", "clipRule"]

/** [tag, props, children?] with colors encoded: 0 the icon's color, 1 the accent. */
function toData(node, inherited = {}) {
  const props = {}
  for (const [name, value] of Object.entries(node.attrs)) {
    const prop = ATTRS.get(name)
    if (!prop) continue
    if (node.tag === "svg" && (prop === "width" || prop === "height")) continue
    props[prop] = prop === "fill" || prop === "stroke" ? colorValue(value) : /^-?\d*\.?\d+$/.test(value) && prop !== "d" ? Number(value) : value
  }
  const context = { ...inherited }
  for (const name of INHERITED) if (props[name] !== undefined) context[name] = props[name]
  if (node.tag === "svg") {
    const children = node.children.map((child) => toData(child, context))
    return [node.tag, { viewBox: props.viewBox }, children]
  }
  if (node.tag !== "g") {
    // A shape draws with what it inherits written on it; an SVG shape with no fill fills black: here, the icon's color
    for (const name of INHERITED) if (props[name] === undefined && context[name] !== undefined) props[name] = context[name]
    if (props.fill === undefined) props.fill = 0
  } else {
    for (const name of INHERITED) delete props[name]
  }
  const children = node.children.map((child) => toData(child, context))
  return children.length ? [node.tag, props, children] : [node.tag, props]
}

const pascal = (name) =>
  name
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("")
    .replace(/^(\d)/, "Icon$1")

function writeSet(set, entries) {
  const dir = join(pkg, "src/icons", set)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  const names = new Set()
  // A file per icon on disks that ignore case (macOS, Windows): two names that differ only in case get two files
  const files = new Set()
  const lines = [
    "// Generated by packages/react-native/scripts/build-icons.mjs. Do not edit.",
    `// The ${set} icon set, drawn with react-native-svg.`,
  ]
  for (const { name, svg } of entries) {
    let id = name
    while (names.has(id)) id += "Alt"
    names.add(id)
    let file = id
    for (let n = 2; files.has(file.toLowerCase()); n++) file = `${id}-${n}`
    files.add(file.toLowerCase())
    const viewBox = svg.attrs.viewBox ?? "0 0 24 24"
    const [, , children = []] = toData(svg)
    writeFileSync(
      join(dir, `${file}.ts`),
      `// Generated by scripts/build-icons.mjs. Do not edit.\nimport { createIcon } from "../../components/Icon/createIcon"\n\nexport default createIcon(${JSON.stringify(id)}, ${JSON.stringify(viewBox)}, ${JSON.stringify(children)})\n`,
    )
    lines.push(`export { default as ${id} } from "./${file}"`)
  }
  writeFileSync(join(dir, "index.ts"), lines.join("\n") + "\n")
  return names.size
}

function plexSet() {
  const dir = join(packages, "ui/src/components/Icon/svg")
  return readdirSync(dir)
    .filter((file) => file.endsWith(".tsx"))
    .sort()
    .map((file) => {
      const source = readFileSync(join(dir, file), "utf8")
      const start = source.indexOf("<svg")
      const end = source.lastIndexOf("</svg>") + "</svg>".length
      return { name: file.replace(/\.tsx$/, ""), svg: parseMarkup(source.slice(start, end), file, objectLiterals(source)) }
    })
}

function svgSet(folder) {
  const dir = join(packages, folder, "icons")
  return readdirSync(dir)
    .filter((file) => file.endsWith(".svg"))
    .sort()
    .map((file) => ({ name: pascal(file.replace(/\.svg$/, "")), svg: parseMarkup(readFileSync(join(dir, file), "utf8"), file) }))
}

const counts = {
  plex: writeSet("plex", plexSet()),
  lucide: writeSet("lucide", svgSet("icons-lucide-outlined")),
  tabler: writeSet("tabler", svgSet("icons-tabler-outlined")),
  hugeicons: writeSet("hugeicons", svgSet("icons-hugeicons-outlined")),
}
console.log(`Icons: ${Object.entries(counts).map(([set, n]) => `${set} ${n}`).join(", ")}`)
