// tests/parseLightDark.test.js
import { readFile } from "node:fs/promises"
import { JSDOM } from "jsdom"
import { describe, expect, test } from "vitest"
import postcss from "postcss"
import postcssNested from "postcss-nested"
import platformUILightDark from "./parseLightDark.mjs"

const plugin = platformUILightDark()

function normalize(css) {
  return css
    .replace(/[ \t]+/g, " ") // collapse whitespace
    .replace(/;(?=\s*\})/g, "") // remove trailing semicolon before }
    .replace(/\s*\n\s*/g, "\n") // trim lines
    .replace(/,\s*\n\s*/g, ", ") // remove newline after commas in selectors
    .replace(/\n{2,}/g, "\n") // collapse blank lines
    .trim()
}

describe("parseLightDark plugin", () => {
  test("transforms root light-dark into grouped theme rules", async () => {
    const input = `
@layer theme {
  :root {
    --gray-0: light-dark(#fff, #000);
    --gray-1: light-dark(#aaa, #111);
  }
}`
    const output = `@layer theme {
  :where(:root),
  :where([data-theme="light"]) {
    --gray-0: #fff;
    --gray-1: #aaa
  }
  :where([data-theme="dark"]) {
    --gray-0: #000;
    --gray-1: #111
  }
}`
    const result = await postcss([plugin]).process(input, { from: undefined })
    expect(normalize(result.css)).toBe(normalize(output))
  })

  // preserves other declarations in :root
  test("preserves non-light-dark decls in :root", async () => {
    const input = `
@layer theme {
  :root {
    --gray-0: light-dark(#fff, #000);
    --foo: 42;
  }
}`
    const output = `@layer theme {
  :root {
    --foo: 42
  }
  :where(:root),
  :where([data-theme="light"]) {
    --gray-0: #fff
  }
  :where([data-theme="dark"]) {
    --gray-0: #000
  }
}`
    const result = await postcss([plugin]).process(input, { from: undefined })
    expect(normalize(result.css)).toBe(normalize(output))
  })

  // merges [data-theme] scope
  test("merges [data-theme] scope selector", async () => {
    const input = `
@layer theme {
  :root,
  [data-theme] {
    --gray-0: light-dark(#fff, #000);
    --foo: 42;
  }
}`
    const output = `@layer theme {
  :root,
  [data-theme] {
    --foo: 42
  }
  :where(:root),
  :where([data-theme="light"]) {
    --gray-0: #fff
  }
  :where([data-theme="dark"]) {
    --gray-0: #000
  }
}`
    const result = await postcss([plugin]).process(input, { from: undefined })
    expect(normalize(result.css)).toBe(normalize(output))
  })

  // [data-theme] only at top-level triggers replacement (root-like)
  test("replaces top-level [data-theme] selector (no other decls)", async () => {
    const input = `
@layer theme {
  [data-theme] {
    --gray-0: light-dark(#fff, #000);
  }
}`
    const output = `@layer theme {
  :where(:root),
  :where([data-theme="light"]) {
    --gray-0: #fff
  }
  :where([data-theme="dark"]) {
    --gray-0: #000
  }
}`
    const result = await postcss([plugin]).process(input, { from: undefined })
    expect(normalize(result.css)).toBe(normalize(output))
  })

  // preserves non-light-dark decls when [data-theme] is top-level
  test("preserves non-light-dark decls in top-level [data-theme]", async () => {
    const input = `
@layer theme {
  [data-theme] {
    --gray-0: light-dark(#fff, #000);
    --foo: 42;
  }
}`
    const output = `@layer theme {
  [data-theme] {
    --foo: 42
  }
  :where(:root),
  :where([data-theme="light"]) {
    --gray-0: #fff
  }
  :where([data-theme="dark"]) {
    --gray-0: #000
  }
}`
    const result = await postcss([plugin]).process(input, { from: undefined })
    expect(normalize(result.css)).toBe(normalize(output))
  })

  // guard: mixed selectors including [data-theme] should NOT trigger replacement
  test("does not replace when [data-theme] is mixed with other selectors", async () => {
    const input = `
[data-theme],
.foo {
  --gray-0: light-dark(#fff, #000);
}`
    const output = `
:where([data-theme="light"]),
:where([data-theme="light"]) .foo {
  --gray-0: #fff
}
:where([data-theme="dark"]),
:where([data-theme="dark"]) .foo {
  --gray-0: #000
}`
    const result = await postcss([plugin]).process(input, { from: undefined })
    expect(normalize(result.css)).toBe(normalize(output))
  })

  // guard: attribute-qualified [data-theme="light"] should NOT trigger replacement
  test('does not replace for [data-theme="light"] selector', async () => {
    const input = `
[data-theme="light"] {
  --gray-0: light-dark(#fff, #000);
}`
    const output = `
[data-theme="light"],
:where([data-theme="light"]) [data-theme="light"] {
  --gray-0: #fff
}
:where([data-theme="dark"]) [data-theme="light"] {
  --gray-0: #000
}`
    const result = await postcss([plugin]).process(input, { from: undefined })
    expect(normalize(result.css)).toBe(normalize(output))
  })

  // handles mixed values around light-dark()
  test("handles non-light-dark parts in shorthand values", async () => {
    const input = `
.foo {
  background: url(foo.png) light-dark(#fff, #000) no-repeat;
}`
    const output = `
.foo,
:where([data-theme="light"]) .foo {
  background: url(foo.png) #fff no-repeat
}
:where([data-theme="dark"]) .foo {
  background: url(foo.png) #000 no-repeat
}`
    const result = await postcss([plugin]).process(input, { from: undefined })
    expect(normalize(result.css)).toBe(normalize(output))
  })

  // flattens nested wrappers instead of nested &
  test("flattens nested wrappers to top-level rules", async () => {
    const input = `
.Container {
  --foo: light-dark(red, blue);
  color: green !important;
}`
    const output = `
.Container {
  color: green !important;
}
.Container,
:where([data-theme="light"]) .Container {
  --foo: red
}
:where([data-theme="dark"]) .Container {
  --foo: blue
}`
    const result = await postcss([plugin]).process(input, { from: undefined })
    expect(normalize(result.css)).toBe(normalize(output))
  })

  // supports nested functions in light-dark arguments
  test("supports nested functions in arguments", async () => {
    const input = `
.baz .bar {
  --baz: light-dark(rgba(0,0,0,0.5), rgba(255,255,255,0.8));
}`
    const output = `
.baz .bar,
:where([data-theme="light"]) .baz .bar {
  --baz: rgba(0,0,0,0.5)
}
:where([data-theme="dark"]) .baz .bar {
  --baz: rgba(255,255,255,0.8)
}`
    const result = await postcss([plugin]).process(input, { from: undefined })
    expect(normalize(result.css)).toBe(normalize(output))
  })

  test("preserves !important in nested", async () => {
    const input = `
.foo {
  background: pink;
  color: light-dark(red, blue);
}`
    const output = `
.foo {
  background: pink;
}
.foo,
:where([data-theme="light"]) .foo {
  color: red
}
:where([data-theme="dark"]) .foo {
  color: blue
}`
    const result = await postcss([plugin]).process(input, { from: undefined })
    expect(normalize(result.css)).toBe(normalize(output))
  })

  test("preserves !important in static example", async () => {
    const input = `
.foo {
  color: orange !important;
}`
    const output = `
.foo {
  color: orange !important
}`
    const result = await postcss([plugin]).process(input, { from: undefined })
    expect(normalize(result.css)).toBe(normalize(output))
  })

  test("preserves !important in mixed shorthand", async () => {
    const input = `
.foo {
  box-shadow: 0 0 0 1px light-dark(red, blue) inset !important;
}`
    const output = `
.foo,
:where([data-theme="light"]) .foo {
  box-shadow: 0 0 0 1px red inset !important
}
:where([data-theme="dark"]) .foo {
  box-shadow: 0 0 0 1px blue inset !important
}`

    const result = await postcss([plugin]).process(input, { from: undefined })
    expect(normalize(result.css)).toBe(normalize(output))
  })

  // supports nested comma separated lists
  test("supports nested functions in arguments", async () => {
    const input = `
.parent .nested .token.comment,
.another-parent > div:nth-child(2) .nested .token.comment {
  color: light-dark(var(--gray-400), var(--gray-600)) !important;
  background: light-dark(var(--gray-100), var(--gray-200));
  font-style: italic !important;
}`

    const output = `
.parent .nested .token.comment,
.another-parent > div:nth-child(2) .nested .token.comment {
  font-style: italic !important;
}
.parent .nested .token.comment,
.another-parent > div:nth-child(2) .nested .token.comment,
:where([data-theme="light"]) .parent .nested .token.comment,
:where([data-theme="light"]) .another-parent > div:nth-child(2) .nested .token.comment {
  color: var(--gray-400) !important;
  background: var(--gray-100);
}

:where([data-theme="dark"]) .parent .nested .token.comment,
:where([data-theme="dark"]) .another-parent > div:nth-child(2) .nested .token.comment {
  color: var(--gray-600) !important;
  background: var(--gray-200);
}`
    const result = await postcss([plugin]).process(input, { from: undefined })
    expect(normalize(result.css)).toBe(normalize(output))
  })

  // does not split on commas inside functional selectors (e.g., :not())
  test("handles commas inside :not() without corrupting selectors", async () => {
    const input = `
.root :where(p:not(.a, .b, .c p)) code,
.root :where(li:not(.a, .b li)) code {
  color: light-dark(red, blue);
}`
    const output = `
.root :where(p:not(.a, .b, .c p)) code,
.root :where(li:not(.a, .b li)) code,
:where([data-theme="light"]) .root :where(p:not(.a, .b, .c p)) code,
:where([data-theme="light"]) .root :where(li:not(.a, .b li)) code {
  color: red
}
:where([data-theme="dark"]) .root :where(p:not(.a, .b, .c p)) code,
:where([data-theme="dark"]) .root :where(li:not(.a, .b li)) code {
  color: blue
}`
    const result = await postcss([plugin]).process(input, { from: undefined })
    expect(normalize(result.css)).toBe(normalize(output))
  })
})


describe("mobile theme token stylesheets", () => {
  test.each([
    {
      file: "mobile-surfaces.css",
      values: {
        "--mobile-surface-plain-primary": ["#ffffff", "#000000"],
        "--mobile-surface-grouped-primary": ["#f2f2f7", "#000000"],
        "--mobile-surface-grouped-secondary": ["#ffffff", "#1c1c1e"],
        "--mobile-surface-elevated-grouped-tertiary": ["#f2f2f7", "#3a3a3c"],
      },
    },
    {
      file: "mobile-materials.css",
      values: {
        "--mobile-glass-background": ["rgb(255 255 255 / 65%)", "color-mix(in srgb, var(--mobile-surface-elevated-plain-primary, var(--color-surface-elevated)) 70%, transparent)"],
        "--mobile-glass-background-hover": ["rgb(255 255 255 / 75%)", "color-mix(in srgb, var(--mobile-surface-elevated-plain-primary, var(--color-surface-elevated)) 80%, transparent)"],
        "--mobile-glass-background-active": ["rgb(255 255 255 / 85%)", "color-mix(in srgb, var(--mobile-surface-elevated-plain-primary, var(--color-surface-elevated)) 90%, transparent)"],
        "--mobile-glass-shadow": [
          "0 8px 40px rgb(0 0 0 / 12%), var(--shadow-hairline), inset 0 2px 4px rgb(255 255 255 / 70%), inset 0 -2px 4px rgb(255 255 255 / 70%), inset 0 1px 0 transparent",
          "0 8px 40px rgb(0 0 0 / 12%), var(--shadow-hairline), inset 0 2px 4px transparent, inset 0 -2px 4px transparent, inset 0 1px 0 rgb(255 255 255 / 12%)",
        ],
      },
    },
  ])("$file applies dark tokens to root and scoped themes", async ({ file, values }) => {
    const source = new URL(`../src/styles/${file}`, import.meta.url)
    const result = await postcss([platformUILightDark()]).process(await readFile(source, "utf8"), {
      from: source.pathname,
    })
    const mobileRules = postcss.root()
    // JSDOM does not evaluate viewport media queries. Apply the real compiled
    // mobile rules, while checking that every declaration retains its guard.
    result.root.walkDecls((decl) => {
      expect(decl.parent.parent.type).toBe("atrule")
      expect(decl.parent.parent.name).toBe("media")
      expect(decl.parent.parent.params).toBe("(max-width: 767px)")
    })
    result.root.walkAtRules("media", (media) => {
      for (const node of media.nodes) mobileRules.append(node.clone())
    })

    const dom = new JSDOM(`<!doctype html><html data-theme="light"><head></head><body>
      <section id="dark" data-theme="dark"><div id="light" data-theme="light"></div></section>
    </body></html>`)
    try {
      const { document } = dom.window
      const style = document.createElement("style")
      style.textContent = mobileRules.toString()
      document.head.append(style)
      // JSDOM's custom-property serializer removes the space before a negative
      // length after a number; compare the same canonical spelling on each side.
      const normalizeValue = (value) => value.trim().replace(/\s*([,/])\s*/g, "$1").replace(/(\d)\s+(-\d)/g, "$1$2")
      const assertValues = (element, themeIndex) => {
        const computed = dom.window.getComputedStyle(element)
        for (const [prop, themes] of Object.entries(values)) {
          expect(normalizeValue(computed.getPropertyValue(prop)), `${file}: ${element.id || "root"} ${prop}`)
            .toBe(normalizeValue(themes[themeIndex]))
        }
      }
      assertValues(document.documentElement, 0)
      assertValues(document.getElementById("dark"), 1)
      assertValues(document.getElementById("light"), 0)
      document.documentElement.dataset.theme = "dark"
      assertValues(document.documentElement, 1)
      assertValues(document.getElementById("light"), 0)
    } finally {
      dom.window.close()
    }
  })
})


describe("mobile bar veil theme", () => {
  test.each(["Page", "Dialog"])("%s follows its nearest theme scope", async (component) => {
    const input = postcss.root()
    const sources = [
      ["../src/styles/variables-components.css", "--page-bar-veil-opacity"],
      [`../src/components/${component}/${component}.module.css`, "--page-bar-veil"],
    ]
    for (const [file, prop] of sources) {
      const source = postcss.parse(await readFile(new URL(file, import.meta.url), "utf8"))
      let found = false
      source.walkDecls(prop, (decl) => {
        found = true
        // Keep the real selector and value, isolating these declarations from
        // unrelated component styles and viewport queries unsupported by JSDOM.
        const rule = decl.parent.clone({ nodes: [] })
        rule.append(decl.clone())
        input.append(rule)
      })
      expect(found, `${file}: ${prop}`).toBe(true)
    }
    const result = await postcss([platformUILightDark()]).process(input, { from: undefined })
    const className = component === "Page" ? "Page" : "Content"
    const dom = new JSDOM(`<!doctype html><html data-theme="dark"><head></head><body>
      <div id="light" class="${className}" data-theme="light">
        <div id="dark" class="${className}" data-theme="dark"></div>
      </div>
    </body></html>`)
    try {
      const { document } = dom.window
      const style = document.createElement("style")
      style.textContent = result.css
      document.head.append(style)
      const assertVeil = (id, opacity) => {
        const computed = dom.window.getComputedStyle(document.getElementById(id))
        // JSDOM preserves custom-property references without resolving var().
        // Check both the compiled component's dependency and the scoped value.
        expect(computed.getPropertyValue("--page-bar-veil")).toContain("var(--page-bar-veil-opacity)")
        expect(computed.getPropertyValue("--page-bar-veil-opacity")).toBe(opacity)
      }
      assertVeil("light", "72%")
      assertVeil("dark", "60%")
      document.getElementById("dark").dataset.theme = "light"
      assertVeil("dark", "72%")
    } finally {
      dom.window.close()
    }
  })
})


describe("mobile toolbar material boundaries", () => {
  test("toolbar contexts and explicit glass share blur, while flat, disabled and colored buttons opt out", async () => {
    const rules = postcss.root()
    for (const component of ["Button", "Page", "Dialog"]) {
      const source = new URL(`../src/components/${component}/${component}.module.css`, import.meta.url)
      const compiled = await postcss([postcssNested()]).process(await readFile(source, "utf8"), { from: source.pathname })
      compiled.root.walkDecls("--button-mobile-material-backdrop-filter", (decl) => {
        expect(decl.parent.parent.name).toBe("media")
        expect(decl.parent.parent.params).toMatch(/(?:max-width: |width <= )767(?:\.98)?px/)
        rules.append(decl.parent.clone({ nodes: [decl.clone()] }))
      })
    }
    const dom = new JSDOM(`<!doctype html><html><head></head><body>
      <button id="explicit" class="Button" data-mobile-material="glass" data-color="secondary" data-variant="soft"></button>
      <div class="Leading">
        <button id="toolbar" class="Button" data-uniform data-color="primary" data-variant="ghost"></button>
        <button id="flat" class="Button" data-uniform data-mobile-material="flat" data-color="secondary" data-variant="soft"></button>
        <button id="disabled" class="Button" data-uniform data-mobile-material="glass" data-disabled data-color="secondary" data-variant="soft"></button>
        <button id="danger" class="Button" data-uniform data-mobile-material="glass" data-color="danger" data-variant="soft"></button>
      </div>
      <div class="Content" data-mobile-variant="sheet"><div class="HeaderAction">
        <button id="sheet" class="Button" data-color="secondary" data-variant="soft"></button>
      </div></div>
      <button id="ordinary" class="Button" data-color="secondary" data-variant="soft"></button>
    </body></html>`)
    try {
      const style = dom.window.document.createElement("style")
      style.textContent = rules.toString()
      dom.window.document.head.append(style)
      const filter = (id) => dom.window.getComputedStyle(dom.window.document.getElementById(id))
        .getPropertyValue("--button-mobile-material-backdrop-filter").trim()
      for (const id of ["explicit", "toolbar", "sheet"]) expect(filter(id), id).toBe("var(--mobile-glass-backdrop-filter)")
      for (const id of ["flat", "disabled", "danger", "ordinary"]) expect(filter(id), id).not.toBe("var(--mobile-glass-backdrop-filter)")
    } finally {
      dom.window.close()
    }
  })

  test("material blur paints the background layer, leaving the keyboard focus ring separate", async () => {
    const source = new URL("../src/components/Button/Button.module.css", import.meta.url)
    const compiled = await postcss([postcssNested()]).process(await readFile(source, "utf8"), { from: source.pathname })
    const blur = []
    const focus = []
    compiled.root.walkDecls("backdrop-filter", (decl) => blur.push(decl.parent.selector))
    compiled.root.walkDecls("outline", (decl) => {
      if (decl.value !== "none") focus.push(decl.parent.selector)
    })
    expect(blur).toEqual([".Button::before"])
    expect(focus).toHaveLength(1)
    expect(focus[0]).toContain(":focus-visible:not([data-menu-pointer-focus])")
    expect(focus[0]).toContain("::after")
  })
})
