import { expect, test } from "@playwright/test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import postcss from "postcss"
// The functions of the Plex UI PostCSS pipeline (`alpha()`, `spacing()`): the browser has no such functions
import functions from "../../../styles/postcss/functions.mjs"
// The compiled tokens module of @plexui/styles (npm run build:styles), as an app on a phone gets it
import { resolvedTokens, skippedDeclarations } from "../../../styles/dist/es/tokens/index.js"

const styles = join(__dirname, "../../../styles/src/styles")
const FILES = [
  "variables-tailwind-theme.css",
  "variables-primitive.css",
  "variables-semantic.css",
  "variables-components.css",
  "variables-tokens-root.css",
  "mobile-surfaces.css",
  "mobile-materials.css",
  "touch.css",
]

/**
 * The token files as a browser reads them: Tailwind's `@theme static` is a `:root` rule in the theme layer, and the
 * Plex UI functions expand as the build expands them. `light-dark()` stays: Chromium has it.
 */
async function tokenCss() {
  const css = FILES.map((file) => {
    let text = readFileSync(join(styles, file), "utf8").replace(/^@import .*$/gm, "")
    if (text.startsWith("@theme static {")) text = text.replace("@theme static {", "@layer theme { :root, :host {") + "\n}"
    return text
  }).join("\n")
  return (await postcss([functions()]).process(css, { from: undefined })).css
}

type Rgba = [number, number, number, number]

function parse(color: string): Rgba {
  if (color.startsWith("#")) {
    const n = (i: number) => parseInt(color.slice(i, i + 2), 16)
    return [n(1), n(3), n(5), color.length === 9 ? n(7) : 255]
  }
  const [r, g, b, a = "1"] = /rgba?\(([^)]+)\)/.exec(color)![1].split(/,\s*/)
  return [Number(r), Number(g), Number(b), Math.round(Number(a) * 255)]
}

/** Premultiplied: a color at 8% alpha is compared by what it adds to a pixel, not by channels it barely shows. */
const premultiplied = ([r, g, b, a]: Rgba) => [(r * a) / 255, (g * a) / 255, (b * a) / 255, a]

for (const scheme of ["light", "dark"] as const) {
  test(`every color token of @plexui/styles matches Chromium (${scheme})`, async ({ page }) => {
    const colors = Object.entries(resolvedTokens[scheme]).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string" && /^(#|rgba\()/.test(entry[1]),
    )
    expect(colors.length).toBeGreaterThan(500)
    await page.setContent(
      `<!doctype html><html data-theme="${scheme}" style="color-scheme: ${scheme}"><head><style>${await tokenCss()}</style></head>` +
        `<body><div id="probe"></div><canvas id="canvas" width="1" height="1"></canvas></body></html>`,
    )
    const browser = await page.evaluate((names) => {
      const probe = document.getElementById("probe")!
      const context = (document.getElementById("canvas") as HTMLCanvasElement).getContext("2d", { willReadFrequently: true })!
      return names.map((name) => {
        probe.style.backgroundColor = ""
        probe.style.backgroundColor = `var(${name})`
        context.clearRect(0, 0, 1, 1)
        context.fillStyle = getComputedStyle(probe).backgroundColor
        context.fillRect(0, 0, 1, 1)
        return Array.from(context.getImageData(0, 0, 1, 1).data) as [number, number, number, number]
      })
    }, colors.map(([name]) => name))
    const mismatches = colors.flatMap(([name, value], index) => {
      const expected = premultiplied(parse(value))
      const actual = premultiplied(browser[index])
      return expected.some((channel, i) => Math.abs(channel - actual[i]) > 2) ? [`${name}: React Native ${value}, Chromium rgba(${browser[index].join(", ")})`] : []
    })
    expect(mismatches, `${mismatches.length} of ${colors.length} colors differ (${skippedDeclarations} contextual declarations are not compared)`).toEqual([])
  })
}
