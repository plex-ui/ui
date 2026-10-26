// Type-checks a package's built declarations the way a strict consumer would
// (`skipLibCheck: false`): a throwaway project imports every component entry
// and every exported subpath of the package, and `tsc` must report nothing.
// An inferred, expanded component type or a dropped global can pass the
// package's own build and still break consumers.
// Usage: node scripts/check-published-types.mjs [ui|vue] (ui by default); run after the build.
import { execFileSync } from "node:child_process"
import { mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const pkg = process.argv[2] ?? "ui"
const { exports } = JSON.parse(readFileSync(path.join(ROOT, `packages/${pkg}/package.json`), "utf8"))

const specifiers = [
  ...readdirSync(path.join(ROOT, `packages/${pkg}/src/components`)).map((dir) => `@plexui/${pkg}/components/${dir}`),
  ...Object.keys(exports)
    .filter((key) => !key.includes("*") && !/css|vite|postcss/.test(key) && key !== ".")
    .map((key) => `@plexui/${pkg}${key.slice(1)}`),
]

const dir = mkdtempSync(path.join(os.tmpdir(), `plexui-${pkg}-types-`))
try {
  symlinkSync(path.join(ROOT, "node_modules"), path.join(dir, "node_modules"))
  writeFileSync(
    path.join(dir, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "Bundler",
        jsx: "react-jsx",
        strict: true,
        skipLibCheck: false,
        noEmit: true,
        types: [],
      },
      include: ["index.ts"],
    }),
  )
  writeFileSync(path.join(dir, "index.ts"), specifiers.map((s, i) => `export * as m${i} from "${s}"\n`).join(""))
  execFileSync(path.join(ROOT, "node_modules/.bin/tsc"), ["-p", dir], { stdio: "inherit" })
  console.log(`@plexui/${pkg}: ${specifiers.length} entries type-check for consumers.`)
} catch {
  console.error(`@plexui/${pkg}: the published declarations fail a consumer type check (see above).`)
  process.exitCode = 1
} finally {
  rmSync(dir, { recursive: true, force: true })
}
