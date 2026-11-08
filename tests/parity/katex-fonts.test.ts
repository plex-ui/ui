import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, test } from "vitest"

// Row 166: Markdown math needs KaTeX's own fonts. Without them the large operators (integral, sum),
// matrix brackets and the cases brace fall back to small system glyphs.

const root = path.resolve(__dirname, "../..")
const stylesDir = path.join(root, "packages/styles/src/styles")
const ours = readFileSync(path.join(stylesDir, "katex.min.css"), "utf8")
const katexCss = readFileSync(path.join(root, "node_modules/katex/dist/katex.css"), "utf8")
const katexVersion = JSON.parse(readFileSync(path.join(root, "node_modules/katex/package.json"), "utf8")).version as string

const fontFaces = (css: string) => [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((match) => match[1])
const descriptor = (face: string, name: string) => face.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1].trim()

describe("KaTeX styles in @plexui/styles", () => {
  test("every KaTeX font face has a woff2 source that ships beside the CSS", () => {
    const faces = fontFaces(ours)
    expect(faces).toHaveLength(fontFaces(katexCss).length)
    for (const face of faces) {
      const file = descriptor(face, "src")?.match(/^url\("\.\/(katex-fonts\/[\w-]+\.woff2)"\) format\("woff2"\)$/)?.[1]
      expect(file, face).toBeDefined()
      expect(existsSync(path.join(stylesDir, file ?? "")), file).toBe(true)
    }
  })

  test("is KaTeX's own CSS for the version that renders the math, with only the font sources changed", () => {
    expect(ours).toContain(`content: "${katexVersion}"`)
    const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s*src:[^;]+;/g, "").trim()
    expect(strip(ours)).toBe(strip(katexCss))
  })
})
