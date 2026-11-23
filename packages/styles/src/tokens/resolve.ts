/**
 * A small evaluator of Plex UI token values, for platforms that do not read CSS (React Native).
 *
 * It resolves a custom property the way a browser does on `:root`: `var()` is substituted as text, then the value is
 * evaluated for one color scheme. It knows the functions the token files use: `light-dark()`, `alpha()` and `spacing()`
 * (the PostCSS functions of @plexui/styles), `color-mix()` in srgb and oklab, `rgb()`/`rgba()`, hex colors, `calc()`,
 * `min()`, `max()`, `clamp()` and `env()`. Lengths come out in px (1rem = 16px; em only with a font size), times in ms.
 * Anything else (a gradient, a curve, a font stack, a shadow list) comes back as text with its parts resolved.
 *
 * This file has no imports and only erasable TypeScript, so Node runs it as is (scripts/build-tokens.mjs).
 */

export type ColorScheme = "light" | "dark"

/** A resolved token: a color as `#rrggbb` or `rgba(r, g, b, a)`, a length in px, a time in ms, a number or text. */
export type TokenValue = string | number

export type Color = { r: number; g: number; b: number; a: number }

export type Value =
  | { kind: "color"; color: Color }
  | { kind: "length"; px: number }
  | { kind: "em"; em: number }
  | { kind: "time"; ms: number }
  | { kind: "number"; value: number }
  | { kind: "percent"; value: number }
  | { kind: "text"; text: string }

export type ResolveOptions = {
  scheme: ColorScheme
  /** The font size an `em` is measured against. Without it a value in em stays text. */
  fontSize?: number
  /** @default 16 */
  rootFontSize?: number
}

/* ------------------------------------------------------------------ */
/*  Tokenizer and parser                                              */
/* ------------------------------------------------------------------ */

export type Node =
  | { type: "fn"; name: string; args: Node[][] }
  | { type: "dim"; value: number; unit: string }
  | { type: "hash"; value: string }
  | { type: "ident"; value: string }
  | { type: "string"; value: string }
  | { type: "op"; value: string }
  | { type: "comma" }
  | { type: "paren"; nodes: Node[] }

const isDigit = (c: string) => c >= "0" && c <= "9"
const isIdentStart = (c: string) => /[A-Za-z_\u0080-￿]/.test(c)
const isIdent = (c: string) => /[A-Za-z0-9_\-\u0080-￿]/.test(c)

/** Parses a CSS value into nodes. Whitespace separates nodes; commas and operators are nodes of their own. */
export function parse(text: string): Node[] {
  let i = 0
  const src = text.replace(/\/\*[\s\S]*?\*\//g, " ")

  const readNumber = (): Node => {
    const match = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(src.slice(i))!
    i += match[0].length
    const value = parseFloat(match[0])
    if (src[i] === "%") {
      i++
      return { type: "dim", value, unit: "%" }
    }
    let unit = ""
    while (i < src.length && /[A-Za-z]/.test(src[i])) unit += src[i++]
    return { type: "dim", value, unit: unit.toLowerCase() }
  }

  const readList = (close: string | null): Node[] => {
    const nodes: Node[] = []
    while (i < src.length) {
      const c = src[i]
      if (close && c === close) {
        i++
        return nodes
      }
      if (/\s/.test(c)) {
        i++
        continue
      }
      if (c === ",") {
        nodes.push({ type: "comma" })
        i++
        continue
      }
      if (c === "(") {
        i++
        nodes.push({ type: "paren", nodes: readList(")") })
        continue
      }
      if (c === '"' || c === "'") {
        let j = i + 1
        while (j < src.length && src[j] !== c) j += src[j] === "\\" ? 2 : 1
        nodes.push({ type: "string", value: src.slice(i + 1, j) })
        i = j + 1
        continue
      }
      if (c === "#") {
        let j = i + 1
        while (j < src.length && isIdent(src[j])) j++
        nodes.push({ type: "hash", value: src.slice(i + 1, j).toLowerCase() })
        i = j
        continue
      }
      const next = src[i + 1] ?? ""
      // A sign right before a digit starts a number, as in the CSS tokenizer (calc() needs spaces around + and -)
      if (isDigit(c) || (c === "." && isDigit(next)) || ((c === "+" || c === "-") && (isDigit(next) || (next === "." && isDigit(src[i + 2] ?? ""))))) {
        nodes.push(readNumber())
        continue
      }
      if (isIdentStart(c) || (c === "-" && (isIdentStart(next) || next === "-"))) {
        let j = i
        while (j < src.length && isIdent(src[j])) j++
        const name = src.slice(i, j)
        i = j
        if (src[i] === "(") {
          i++
          nodes.push({ type: "fn", name: name.toLowerCase(), args: splitArgs(readList(")")) })
        } else {
          nodes.push({ type: "ident", value: name })
        }
        continue
      }
      nodes.push({ type: "op", value: c })
      i++
    }
    return nodes
  }

  return readList(null)
}

function splitArgs(nodes: Node[]): Node[][] {
  const args: Node[][] = [[]]
  for (const node of nodes) {
    if (node.type === "comma") args.push([])
    else args[args.length - 1].push(node)
  }
  return args.length === 1 && args[0].length === 0 ? [] : args
}

export function stringify(nodes: Node[]): string {
  let out = ""
  for (const node of nodes) {
    const part = stringifyNode(node)
    if (node.type === "comma") out += ","
    else out += (out && !out.endsWith(",") ? " " : out ? " " : "") + part
  }
  return out
}

function stringifyNode(node: Node): string {
  switch (node.type) {
    case "fn":
      return `${node.name}(${node.args.map(stringify).join(", ")})`
    case "dim":
      return `${formatNumber(node.value)}${node.unit}`
    case "hash":
      return `#${node.value}`
    case "ident":
      return node.value
    case "string":
      return `"${node.value}"`
    case "op":
      return node.value
    case "comma":
      return ","
    case "paren":
      return `(${stringify(node.nodes)})`
  }
}

/* ------------------------------------------------------------------ */
/*  var() substitution                                                */
/* ------------------------------------------------------------------ */

export type Lookup = (name: string) => string | undefined

/** A `var()` cycle: every property in it is invalid at computed-value time, whatever fallbacks it has. */
class Cycle {
  readonly members: ReadonlySet<string>
  constructor(members: ReadonlySet<string>) {
    this.members = members
  }
}

/**
 * Substitutes every `var()` in a value with the value of its property, recursively, as the browser does at computed
 * value time. A missing or invalid property takes the fallback; a property in a cycle is invalid and so is every
 * value of the cycle, fallbacks or not (CSS Variables 1, Resolving Dependency Cycles), while a value outside it that
 * refers to it takes its fallback. `alpha()` and `spacing()` are expanded as the PostCSS functions of @plexui/styles
 * expand them. `seen` is the chain of properties being resolved, the last one the property this value belongs to.
 */
export function substitute(text: string, lookup: Lookup, seen: ReadonlySet<string> = new Set()): Node[] | undefined {
  try {
    return substituteChain(text, lookup, [...seen])
  } catch (error) {
    if (error instanceof Cycle) return undefined
    throw error
  }
}

function substituteChain(text: string, lookup: Lookup, chain: readonly string[]): Node[] | undefined {
  const self = chain[chain.length - 1]
  const walk = (nodes: Node[]): Node[] | undefined => {
    const out: Node[] = []
    for (const node of nodes) {
      if (node.type === "fn" && node.name === "var") {
        const nameNode = node.args[0]?.[0]
        const name = nameNode?.type === "ident" ? nameNode.value : undefined
        const fallback = node.args.length > 1 ? node.args.slice(1) : undefined
        let replacement: Node[] | undefined
        if (name && chain.includes(name)) throw new Cycle(new Set(chain.slice(chain.indexOf(name))))
        const raw = name ? lookup(name) : undefined
        if (name && raw !== undefined) {
          try {
            replacement = substituteChain(raw, lookup, [...chain, name])
          } catch (error) {
            // This value is in the cycle too: invalid, fallback or not. Outside it, the property is merely invalid.
            if (!(error instanceof Cycle) || (self !== undefined && error.members.has(self))) throw error
            replacement = undefined
          }
        }
        if (replacement === undefined && fallback) {
          // The fallback is everything after the first comma, commas included
          const joined: Node[] = []
          fallback.forEach((arg, index) => {
            if (index) joined.push({ type: "comma" })
            joined.push(...arg)
          })
          replacement = walk(joined)
        }
        if (replacement === undefined) return undefined
        out.push(...replacement)
        continue
      }
      if (node.type === "fn" && node.name === "spacing" && node.args.length === 1) {
        // postcss/functions.mjs: spacing(n) is calc(var(--spacing) * n), expanded before var() is
        const expanded = walk(parse(`calc(var(--spacing) * ${stringify(node.args[0])})`))
        if (!expanded) return undefined
        out.push(...expanded)
        continue
      }
      if (node.type === "fn") {
        const args: Node[][] = []
        for (const arg of node.args) {
          const next = walk(arg)
          if (!next) return undefined
          args.push(next)
        }
        out.push(expandFunction({ type: "fn", name: node.name, args }))
        continue
      }
      if (node.type === "paren") {
        const inner = walk(node.nodes)
        if (!inner) return undefined
        out.push({ type: "paren", nodes: inner })
        continue
      }
      out.push(node)
    }
    return out
  }
  // The comma-separated fallback of a var() may hold commas: re-split function arguments after substitution
  const result = walk(parse(text))
  return result && resplit(result)
}

function resplit(nodes: Node[]): Node[] {
  return nodes.map((node) => {
    if (node.type === "fn") {
      const flat: Node[] = []
      node.args.forEach((arg, index) => {
        if (index) flat.push({ type: "comma" })
        flat.push(...resplit(arg))
      })
      return { type: "fn", name: node.name, args: splitArgs(flat) }
    }
    if (node.type === "paren") return { type: "paren", nodes: resplit(node.nodes) }
    return node
  })
}

// The PostCSS functions of @plexui/styles (postcss/functions.mjs), applied after substitution
function expandFunction(node: Extract<Node, { type: "fn" }>): Node {
  if (node.name === "alpha" && node.args.length === 2) {
    const amount = node.args[1]
    let percent: Node[] = amount
    if (amount.length === 1 && amount[0].type === "dim" && amount[0].unit === "") {
      const raw = amount[0].value
      // ".5" and "0.5" are fractions, "8" is 8%
      percent = [{ type: "dim", value: raw < 1 ? raw * 100 : raw, unit: "%" }]
    }
    return {
      type: "fn",
      name: "color-mix",
      args: [[{ type: "ident", value: "in" }, { type: "ident", value: "oklab" }], [...node.args[0], ...percent], [{ type: "ident", value: "transparent" }]],
    }
  }
  return node
}

/* ------------------------------------------------------------------ */
/*  Colors                                                            */
/* ------------------------------------------------------------------ */

const NAMED: Record<string, Color> = {
  transparent: { r: 0, g: 0, b: 0, a: 0 },
  white: { r: 255, g: 255, b: 255, a: 1 },
  black: { r: 0, g: 0, b: 0, a: 1 },
  red: { r: 255, g: 0, b: 0, a: 1 },
}

function parseHex(hex: string): Color | undefined {
  if (!/^[0-9a-f]+$/.test(hex)) return undefined
  const expand = hex.length === 3 || hex.length === 4 ? hex.split("").map((c) => c + c).join("") : hex
  if (expand.length !== 6 && expand.length !== 8) return undefined
  const n = (k: number) => parseInt(expand.slice(k, k + 2), 16)
  return { r: n(0), g: n(2), b: n(4), a: expand.length === 8 ? n(6) / 255 : 1 }
}

const toLinear = (c: number) => {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}
const fromLinear = (v: number) => {
  const sign = v < 0 ? -1 : 1
  const abs = Math.abs(v)
  return 255 * sign * (abs <= 0.0031308 ? 12.92 * abs : 1.055 * abs ** (1 / 2.4) - 0.055)
}

/** sRGB (0-255) to OKLab. */
export function toOklab({ r, g, b }: Color): [number, number, number] {
  const lr = toLinear(r)
  const lg = toLinear(g)
  const lb = toLinear(b)
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

/** OKLab to sRGB (0-255, unclamped). */
export function fromOklab([L, A, B]: [number, number, number]): [number, number, number] {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3
  return [
    fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ]
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** `color-mix()` after CSS Color 5: normalized percentages, premultiplied alpha, an alpha multiplier below 100%. */
export function mixColors(space: "srgb" | "oklab", c1: Color, p1: number | undefined, c2: Color, p2: number | undefined): Color | undefined {
  let w1 = p1
  let w2 = p2
  if (w1 === undefined && w2 === undefined) w1 = w2 = 50
  else if (w1 === undefined) w1 = 100 - w2!
  else if (w2 === undefined) w2 = 100 - w1
  const sum = w1! + w2!
  if (sum <= 0) return undefined
  const multiplier = sum < 100 ? sum / 100 : 1
  const t = w2! / sum
  const alpha = c1.a * (1 - t) + c2.a * t
  const channels = (c: Color): [number, number, number] =>
    space === "srgb" ? [c.r / 255, c.g / 255, c.b / 255] : toOklab(c)
  const a1 = channels(c1)
  const a2 = channels(c2)
  const mixed = [0, 1, 2].map((k) => (alpha === 0 ? 0 : (a1[k] * c1.a * (1 - t) + a2[k] * c2.a * t) / alpha)) as [number, number, number]
  const rgb = space === "srgb" ? mixed.map((v) => v * 255) : fromOklab(mixed)
  return {
    r: clamp(rgb[0], 0, 255),
    g: clamp(rgb[1], 0, 255),
    b: clamp(rgb[2], 0, 255),
    a: clamp(alpha * multiplier, 0, 1),
  }
}

export function formatColor({ r, g, b, a }: Color): string {
  const hex = (v: number) => Math.round(v).toString(16).padStart(2, "0")
  if (a >= 0.9995) return `#${hex(r)}${hex(g)}${hex(b)}`
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${formatNumber(Math.round(a * 1000) / 1000)})`
}

function formatNumber(n: number): string {
  const rounded = Math.round(n * 10000) / 10000
  return Object.is(rounded, -0) ? "0" : String(rounded)
}

/* ------------------------------------------------------------------ */
/*  Evaluation                                                        */
/* ------------------------------------------------------------------ */

const text = (t: string): Value => ({ kind: "text", text: t })

function dimension(node: Extract<Node, { type: "dim" }>, options: ResolveOptions): Value {
  const root = options.rootFontSize ?? 16
  switch (node.unit) {
    case "":
      return { kind: "number", value: node.value }
    case "%":
      return { kind: "percent", value: node.value }
    case "px":
      return { kind: "length", px: node.value }
    case "rem":
      return { kind: "length", px: node.value * root }
    case "em":
      return options.fontSize === undefined ? { kind: "em", em: node.value } : { kind: "length", px: node.value * options.fontSize }
    case "ms":
      return { kind: "time", ms: node.value }
    case "s":
      return { kind: "time", ms: node.value * 1000 }
    case "pt":
      return { kind: "length", px: (node.value * 4) / 3 }
    default:
      return text(stringifyNode(node))
  }
}

function asColor(value: Value | undefined): Color | undefined {
  return value?.kind === "color" ? value.color : undefined
}

function channel(value: Value | undefined, scale: number): number | undefined {
  if (value?.kind === "number") return value.value
  if (value?.kind === "percent") return (value.value / 100) * scale
  return undefined
}

function evalRgb(args: Node[][], options: ResolveOptions): Value | undefined {
  // Legacy comma syntax (rgb(0, 0, 0, 0.1)) or modern space syntax (rgb(0 0 0 / 10%))
  let parts: Node[]
  let alphaNodes: Node[] | undefined
  if (args.length >= 3) {
    parts = [args[0], args[1], args[2]].map((arg) => arg[0])
    alphaNodes = args[3]
  } else {
    const all = args[0] ?? []
    const slash = all.findIndex((node) => node.type === "op" && node.value === "/")
    parts = slash === -1 ? all : all.slice(0, slash)
    alphaNodes = slash === -1 ? undefined : all.slice(slash + 1)
  }
  if (parts.length !== 3) return undefined
  const rgb = parts.map((node) => channel(evaluateNodes([node], options), 255))
  if (rgb.some((v) => v === undefined)) return undefined
  let a = 1
  if (alphaNodes && alphaNodes.length) {
    const alpha = channel(evaluateNodes(alphaNodes, options), 1)
    if (alpha === undefined) return undefined
    a = alpha
  }
  return { kind: "color", color: { r: clamp(rgb[0]!, 0, 255), g: clamp(rgb[1]!, 0, 255), b: clamp(rgb[2]!, 0, 255), a: clamp(a, 0, 1) } }
}

function evalColorMix(args: Node[][], options: ResolveOptions): Value | undefined {
  const [method, first, second] = args
  if (!method || !first || !second || method[0]?.type !== "ident" || method[0].value !== "in") return undefined
  const space = method[1]?.type === "ident" ? method[1].value.toLowerCase() : ""
  if (space !== "srgb" && space !== "oklab") return undefined
  const part = (nodes: Node[]): [Color | undefined, number | undefined] => {
    const percentIndex = nodes.findIndex((node) => node.type === "dim" && node.unit === "%")
    const colorNodes = percentIndex === -1 ? nodes : nodes.filter((_, index) => index !== percentIndex)
    const percent = percentIndex === -1 ? undefined : (nodes[percentIndex] as Extract<Node, { type: "dim" }>).value
    return [asColor(evaluateNodes(colorNodes, options)), percent]
  }
  const [c1, p1] = part(first)
  const [c2, p2] = part(second)
  if (!c1 || !c2) return undefined
  const color = mixColors(space, c1, p1, c2, p2)
  return color && { kind: "color", color }
}

/* calc(): a recursive descent over + - * / with lengths, numbers, percents and times */
function evalMath(nodes: Node[], options: ResolveOptions): Value | undefined {
  let index = 0
  const peekOp = () => {
    const node = nodes[index]
    return node?.type === "op" ? node.value : undefined
  }
  const primary = (): Value | undefined => {
    const node = nodes[index++]
    if (!node) return undefined
    if (node.type === "paren") return evalMath(node.nodes, options)
    if (node.type === "op" && node.value === "-") {
      const inner = primary()
      return inner && scale(inner, -1)
    }
    return evaluateNodes([node], options)
  }
  const term = (): Value | undefined => {
    let left = primary()
    while (left && (peekOp() === "*" || peekOp() === "/")) {
      const op = nodes[index++] as Extract<Node, { type: "op" }>
      const right = primary()
      if (!right) return undefined
      if (op.value === "*") {
        if (right.kind === "number") left = scale(left, right.value)
        else if (left.kind === "number") left = scale(right, left.value)
        else return undefined
      } else {
        if (right.kind !== "number" || right.value === 0) return undefined
        left = scale(left, 1 / right.value)
      }
    }
    return left
  }
  let left = term()
  while (left && (peekOp() === "+" || peekOp() === "-")) {
    const op = (nodes[index++] as Extract<Node, { type: "op" }>).value
    const right = term()
    if (!right) return undefined
    left = add(left, op === "-" ? scale(right, -1)! : right)
  }
  if (index < nodes.length) return undefined
  return left
}

function scale(value: Value, factor: number): Value | undefined {
  switch (value.kind) {
    case "length":
      return { kind: "length", px: value.px * factor }
    case "em":
      return { kind: "em", em: value.em * factor }
    case "time":
      return { kind: "time", ms: value.ms * factor }
    case "number":
      return { kind: "number", value: value.value * factor }
    case "percent":
      return { kind: "percent", value: value.value * factor }
    default:
      return undefined
  }
}

function add(a: Value | undefined, b: Value | undefined): Value | undefined {
  if (!a || !b) return undefined
  if (a.kind === "length" && b.kind === "length") return { kind: "length", px: a.px + b.px }
  if (a.kind === "em" && b.kind === "em") return { kind: "em", em: a.em + b.em }
  if (a.kind === "time" && b.kind === "time") return { kind: "time", ms: a.ms + b.ms }
  if (a.kind === "number" && b.kind === "number") return { kind: "number", value: a.value + b.value }
  if (a.kind === "percent" && b.kind === "percent") return { kind: "percent", value: a.value + b.value }
  // 0 written without a unit beside a length
  if (a.kind === "length" && b.kind === "number" && b.value === 0) return a
  if (b.kind === "length" && a.kind === "number" && a.value === 0) return b
  return undefined
}

const magnitude = (value: Value): [string, number] | undefined => {
  if (value.kind === "length") return ["length", value.px]
  if (value.kind === "time") return ["time", value.ms]
  if (value.kind === "number") return ["number", value.value]
  if (value.kind === "percent") return ["percent", value.value]
  if (value.kind === "em") return ["em", value.em]
  return undefined
}

function evalMinMax(name: string, args: Node[][], options: ResolveOptions): Value | undefined {
  const values = args.map((arg) => evalMath(arg, options))
  if (values.some((v) => !v)) return undefined
  if (name === "clamp") {
    if (values.length !== 3) return undefined
    const [lo, preferred, hi] = values as Value[]
    const upper = pickExtreme("min", [preferred, hi])
    return upper && pickExtreme("max", [lo, upper])
  }
  return pickExtreme(name === "min" ? "min" : "max", values as Value[])
}

function pickExtreme(which: "min" | "max", values: Value[]): Value | undefined {
  // A zero number may stand beside lengths
  const kinds = new Set(values.map((v) => (v.kind === "number" && v.value === 0 && values.some((o) => o.kind === "length") ? "length" : v.kind)))
  if (kinds.size !== 1) return undefined
  // Only values with a magnitude compare: a unit the evaluator does not know (vw, cqi) leaves the expression invalid
  if (values.some((value) => !magnitude(value))) return undefined
  let best: Value | undefined
  for (const value of values) {
    const m = magnitude(value)![1]
    if (!best || (which === "min" ? m < magnitude(best)![1] : m > magnitude(best)![1])) best = value
  }
  return best && best.kind === "number" && kinds.has("length") ? { kind: "length", px: best.value } : best
}

/** Evaluates a list of nodes (one space-separated component, or a whole value). */
export function evaluateNodes(nodes: Node[], options: ResolveOptions): Value | undefined {
  if (nodes.length === 0) return undefined
  if (nodes.length > 1 || nodes[0].type === "comma") {
    // A list (a shadow, a font stack, a transition): resolve its parts and write it out
    const parts = nodes.map((node) => (node.type === "comma" ? "," : cssText(evaluateNodes([node], options)) ?? stringifyNode(node)))
    let out = ""
    for (const part of parts) out += part === "," ? "," : (out ? " " : "") + part
    return text(out)
  }
  const node = nodes[0]
  switch (node.type) {
    case "dim":
      return dimension(node, options)
    case "hash": {
      const color = parseHex(node.value)
      return color ? { kind: "color", color } : undefined
    }
    case "ident": {
      const named = NAMED[node.value.toLowerCase()]
      return named ? { kind: "color", color: named } : text(node.value)
    }
    case "string":
      return text(stringifyNode(node))
    case "paren":
      return evalMath(node.nodes, options)
    case "op":
      return text(stringifyNode(node))
    case "fn":
      return evalFunction(node, options)
  }
}

function evalFunction(node: Extract<Node, { type: "fn" }>, options: ResolveOptions): Value | undefined {
  switch (node.name) {
    case "light-dark":
      return node.args.length === 2 ? evaluateNodes(node.args[options.scheme === "light" ? 0 : 1], options) : undefined
    case "rgb":
    case "rgba":
      return evalRgb(node.args, options)
    case "color-mix":
      return evalColorMix(node.args, options)
    case "calc":
      return node.args.length === 1 ? evalMath(node.args[0], options) : undefined
    case "min":
    case "max":
    case "clamp":
      return evalMinMax(node.name, node.args, options)
    case "env":
      return node.args.length > 1 ? evaluateNodes(node.args.slice(1).flat(), options) : { kind: "length", px: 0 }
    default: {
      // Another function (a gradient, a curve, a filter): its arguments resolved, the function kept
      const args = node.args.map((arg) => cssText(evaluateNodes(arg, options)) ?? stringify(arg))
      return text(`${node.name}(${args.join(", ")})`)
    }
  }
}

/** A value written back as CSS text, units included: a part of a list or of a function. */
function cssText(value: Value | undefined): string | undefined {
  if (!value) return undefined
  if (value.kind === "length") return `${formatNumber(value.px)}px`
  if (value.kind === "time") return `${formatNumber(value.ms)}ms`
  const out = serializeValue(value)
  return out === undefined ? undefined : String(out)
}

export function serializeValue(value: Value | undefined): TokenValue | undefined {
  if (!value) return undefined
  switch (value.kind) {
    case "color":
      return formatColor(value.color)
    case "length":
      return Math.round(value.px * 10000) / 10000
    case "time":
      return Math.round(value.ms * 10000) / 10000
    case "number":
      return Math.round(value.value * 10000) / 10000
    case "percent":
      return `${formatNumber(value.value)}%`
    case "em":
      return `${formatNumber(value.em)}em`
    case "text":
      return value.text
  }
}

/** Resolves one custom property for one scheme; `undefined` when it is invalid at computed value time. */
export function resolveValue(raw: string, lookup: Lookup, options: ResolveOptions, self?: string): TokenValue | undefined {
  const nodes = substitute(raw, lookup, self ? new Set([self]) : new Set())
  if (!nodes) return undefined
  const value = evaluateNodes(nodes, options)
  return serializeValue(value) ?? stringify(nodes)
}

/* ------------------------------------------------------------------ */
/*  Layers and the resolver                                           */
/* ------------------------------------------------------------------ */

/** Where a layer applies: one color scheme, a range of window widths, a high pixel density or reduced motion. */
export type LayerCondition = {
  scheme?: ColorScheme
  minWidth?: number
  maxWidth?: number
  highDensity?: boolean
  reducedMotion?: boolean
  /** Under `@supports (transition-timing-function: linear(0, 1))`: the CSS springs. Never applies off the web. */
  linearEasing?: boolean
}

/** Custom properties declared on the root under one condition, raw as written in the CSS. */
export type TokenLayer = {
  id: string
  /** The CSS file. */
  source: string
  /** 0 inside `@layer theme`, 1 unlayered (wins). */
  rank: number
  specificity: readonly number[]
  /** Source order of the layer's first declaration. */
  order: number
  when?: LayerCondition
  tokens: Readonly<Record<string, string>>
}

export type TokenContext = {
  /** Window width in px: the phone layers of the CSS apply up to 767. */
  width: number
  highDensity: boolean
  reducedMotion: boolean
}

export function layerApplies(layer: TokenLayer, context: TokenContext, scheme: ColorScheme): boolean {
  const when = layer.when
  if (!when) return true
  if (when.scheme && when.scheme !== scheme) return false
  if (when.minWidth !== undefined && context.width < when.minWidth) return false
  if (when.maxWidth !== undefined && context.width > when.maxWidth) return false
  if (when.highDensity && !context.highDensity) return false
  if (when.reducedMotion && !context.reducedMotion) return false
  if (when.linearEasing) return false
  return true
}

const compareCascade = (a: TokenLayer, b: TokenLayer) => {
  if (a.rank !== b.rank) return a.rank - b.rank
  for (let k = 0; k < 3; k++) if ((a.specificity[k] ?? 0) !== (b.specificity[k] ?? 0)) return (a.specificity[k] ?? 0) - (b.specificity[k] ?? 0)
  return a.order - b.order
}

/** The declarations that win for a context and a scheme, then the overrides (a brand theme: as if set on `:root`). */
export function declarationsFor(
  layers: readonly TokenLayer[],
  context: TokenContext,
  scheme: ColorScheme,
  overrides?: Readonly<Record<string, string>>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const layer of [...layers].filter((l) => layerApplies(l, context, scheme)).sort(compareCascade)) Object.assign(out, layer.tokens)
  if (overrides) Object.assign(out, overrides)
  return out
}

export type TokenResolver = {
  /** The resolved value of a token (`"--color-text"`, or `"color-text"`), `undefined` when unknown or invalid. */
  get(name: string, scheme: ColorScheme): TokenValue | undefined
  /** A value resolved at a font size, for tokens in em (the tracking of --font-sans). */
  at(name: string, scheme: ColorScheme, fontSize: number): TokenValue | undefined
  /** Resolves any CSS value against the tokens (`"alpha(var(--gray-1000), 8%)"`). */
  value(css: string, scheme: ColorScheme, fontSize?: number): TokenValue | undefined
  /** The raw declaration that wins. */
  raw(name: string, scheme: ColorScheme): string | undefined
  /** Every token resolved; `null` marks a value invalid at computed value time. */
  all(scheme: ColorScheme): Record<string, TokenValue | null>
}

/** A resolver over the layers for one context. Values are resolved on first use and kept. */
export function createTokenResolver(
  layers: readonly TokenLayer[],
  context: TokenContext,
  overrides?: Readonly<Record<string, string>>,
): TokenResolver {
  const declarations = { light: declarationsFor(layers, context, "light", overrides), dark: declarationsFor(layers, context, "dark", overrides) }
  const cache = { light: new Map<string, TokenValue | undefined>(), dark: new Map<string, TokenValue | undefined>() }
  const key = (name: string) => (name.startsWith("--") ? name : `--${name}`)
  const lookupFor = (scheme: ColorScheme): Lookup => (name) => declarations[scheme][name]
  const get = (name: string, scheme: ColorScheme) => {
    const prop = key(name)
    const memo = cache[scheme]
    if (memo.has(prop)) return memo.get(prop)
    const raw = declarations[scheme][prop]
    const value = raw === undefined ? undefined : resolveValue(raw, lookupFor(scheme), { scheme }, prop)
    memo.set(prop, value)
    return value
  }
  return {
    get,
    at(name, scheme, fontSize) {
      const raw = declarations[scheme][key(name)]
      return raw === undefined ? undefined : resolveValue(raw, lookupFor(scheme), { scheme, fontSize }, key(name))
    },
    value(css, scheme, fontSize) {
      return resolveValue(css, lookupFor(scheme), { scheme, fontSize })
    },
    raw(name, scheme) {
      return declarations[scheme][key(name)]
    },
    all(scheme) {
      const out: Record<string, TokenValue | null> = {}
      for (const name of Object.keys(declarations[scheme]).sort()) out[name] = get(name, scheme) ?? null
      return out
    },
  }
}
