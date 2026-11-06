import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { extractExamples, parsePage } from "./generate-mcp-manifest.mjs";

const cases = [
  ["checkbox", ["Grouped sections"]],
  ["field", ["Form example", "Profile settings", "Create project", "Field configuration"]],
  ["radio-group", ["Grouped sections"]],
  ["select-control", ["Phone form"]],
  ["switch", ["Settings panel", "Grouped sections"]],
];

for (const [slug, names] of cases) {
  test(`${slug}: imported mobile template helper remains available to the manifest`, (context) => {
    const warnings = context.mock.method(console, "warn", () => {});
    const content = readFileSync(new URL(`../content/vue/components/${slug}.mdx`, import.meta.url), "utf8");
    const examples = extractExamples(content, parsePage(content));
    for (const name of names) {
      const example = examples.find((entry) => entry.name === name);
      assert.ok(example, `${name} must not be silently skipped`);
      assert.match(example.code, /<Page class="h-dvh"/);
      assert.match(example.code, /<PageLeading><DemoBackButton/);
      assert.match(example.code, /<FieldGroup/);
      assert.doesNotMatch(example.code, /formScreenTemplate\(/);
    }
    assert.equal(warnings.mock.callCount(), 0);
  });
}

test("an aliased template helper preserves optional submit and validation arguments", () => {
  const content = `import { formScreenTemplate as screen } from "@/components/docs/formScreenTemplate"

export const code = screen("Payment", "<input required />", "Pay", "save", true)

### Payment

<ComponentPreview code={code} />`;
  const examples = extractExamples(content, parsePage(content));
  assert.equal(examples.length, 1);
  assert.match(examples[0].code, /@submit.prevent="save" novalidate/);
  assert.match(examples[0].code, /<PageFooter/);
  assert.match(examples[0].code, />Pay<\/Button>/);
});
