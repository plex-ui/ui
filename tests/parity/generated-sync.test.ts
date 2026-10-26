import { execFileSync } from "node:child_process"
import path from "node:path"
import { describe, expect, test } from "vitest"

// The MCP manifests, llms*.txt and the Vue registry are generated from the
// docs pages and committed. Each generator's `--check` mode rebuilds its
// output in memory and fails when the committed files differ.

const run = (script: string) => {
  try {
    execFileSync(process.execPath, [path.resolve(process.cwd(), script), "--check"], { stdio: "pipe" })
    return ""
  } catch (error) {
    return String((error as { stderr?: Buffer }).stderr ?? error)
      .split("\n")
      .filter((line) => line.startsWith("Out of date"))
      .join("\n")
  }
}

describe("generated files match the docs", () => {
  test.each([
    ["MCP manifests", "scripts/generate-mcp-manifest.mjs"],
    ["llms*.txt", "scripts/generate-llms-txt.mjs"],
    ["Vue registry", "scripts/generate-vue-registry.mjs"],
  ])("%s are up to date", (_name, script) => {
    expect(run(script)).toBe("")
  }, 60_000)
})
