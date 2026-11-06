#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postcss from "postcss";

const args = process.argv.slice(2);
const figmaPath = getArg(args, "--figma");
const cssPath = getArg(args, "--css");

if (!figmaPath || !cssPath) {
  console.error("Usage: verify-figma-css.mjs --figma <json> --css <css-file>");
  console.error("");
  console.error("JSON format:");
  console.error('  { "node-name": {');
  console.error('    "cssSelector": ".ClassName",');
  console.error('    "gap": "10px",');
  console.error('    "padding": "12px 21px",');
  console.error('    "variable:color": "var(--color-text)",');
  console.error('    "variable:background-color": "var(--color-background-secondary-soft-alpha)",');
  console.error('    "variable:border-color": "var(--color-border-primary-outline)",');
  console.error('    "noHardcode": ["font-family", "font-weight"]');
  console.error("  }}");
  process.exit(1);
}

const figmaData = JSON.parse(readFileSync(resolve(figmaPath), "utf-8"));
const cssContent = readFileSync(resolve(cssPath), "utf-8");
const cssRules = parseCSSRules(cssContent);

let total = 0;
let matched = 0;
let mismatched = 0;
const rows = [];

for (const [nodeName, nodeData] of Object.entries(figmaData)) {
  const selector = nodeData.cssSelector;
  if (!selector) continue;

  const cssRule = findRule(cssRules, selector);

  for (const [prop, figmaVal] of Object.entries(nodeData)) {
    if (prop === "cssSelector") continue;

    if (prop === "noHardcode") {
      checkNoHardcode(nodeName, cssRule, figmaVal);
      continue;
    }

    if (prop.startsWith("variable:")) {
      const cssProp = prop.slice("variable:".length);
      checkVariable(nodeName, cssRule, cssProp, figmaVal);
      continue;
    }

    if (prop.startsWith("variable-hover:")) {
      const cssProp = prop.slice("variable-hover:".length);
      const hoverSelector = `${selector}:hover`;
      const hoverRule = findRule(cssRules, hoverSelector);
      checkVariable(nodeName + ":hover", hoverRule, cssProp, figmaVal);
      continue;
    }

    if (prop.startsWith("variable-active:")) {
      const cssProp = prop.slice("variable-active:".length);
      const activeSelector = `${selector}:active`;
      const activeRule = findRule(cssRules, activeSelector);
      checkVariable(nodeName + ":active", activeRule, cssProp, figmaVal);
      continue;
    }

    if (prop === "dimensions") {
      if (figmaVal.width) checkProp(nodeName, cssRule, "width", `${figmaVal.width}px`);
      if (figmaVal.height) checkProp(nodeName, cssRule, "height", `${figmaVal.height}px`);
      continue;
    }

    if (prop === "strokeWeight") {
      checkProp(nodeName, cssRule, "border-top", figmaVal, true);
      continue;
    }

    if (prop === "borderRadius") {
      checkProp(nodeName, cssRule, "border-radius", figmaVal);
      continue;
    }

    const cssName = figmaToCSSProp(prop);
    if (cssName) {
      const val = typeof figmaVal === "number" ? `${figmaVal}px` : String(figmaVal);
      checkProp(nodeName, cssRule, cssName, val);
    }
  }
}

printTable(rows);

const summary = `  Total: ${total}  Matched: ${matched}`;
if (mismatched > 0) {
  console.log(`\n${summary}  \x1b[31mMismatched: ${mismatched}\x1b[0m\n`);
  process.exit(1);
} else {
  console.log(`\n${summary}  \x1b[32mAll matched ✓\x1b[0m\n`);
}

function checkProp(node, rule, cssProp, figmaVal, partial) {
  total++;
  const cssVal = findCSSValue(rule, cssProp);
  const match = cssVal ? valuesMatch(cssProp, String(figmaVal), cssVal, partial) : false;
  if (match) matched++;
  else mismatched++;
  rows.push({ node, cssProp, figmaVal: String(figmaVal), cssVal: cssVal || "—", match });
}

function checkVariable(node, rule, cssProp, expectedVar) {
  total++;
  const cssVal = findCSSValue(rule, cssProp);
  if (!cssVal) {
    mismatched++;
    rows.push({ node, cssProp: `${cssProp} (var)`, figmaVal: expectedVar, cssVal: "—", match: false });
    return;
  }

  const hasVar = cssVal.includes("var(");
  const varMatch = cssVal.includes(expectedVar.replace(/^var\(/, "").replace(/\)$/, ""));
  const match = hasVar && varMatch;

  if (match) matched++;
  else mismatched++;

  const status = !hasVar ? "HARDCODED!" : !varMatch ? "WRONG VAR" : "";
  rows.push({
    node,
    cssProp: `${cssProp} (var)`,
    figmaVal: expectedVar,
    cssVal: status ? `${cssVal} ${status}` : cssVal,
    match,
  });
}

function checkNoHardcode(node, rule, props) {
  if (!rule) return;
  for (const prop of props) {
    total++;
    const cssVal = findCSSValue(rule, prop);
    if (cssVal) {
      mismatched++;
      rows.push({ node, cssProp: `${prop} (inherit)`, figmaVal: "(should inherit)", cssVal: `${cssVal} HARDCODED!`, match: false });
    } else {
      matched++;
      rows.push({ node, cssProp: `${prop} (inherit)`, figmaVal: "(inherited)", cssVal: "(not set)", match: true });
    }
  }
}

function findCSSValue(rule, cssProp) {
  if (!rule) return null;
  if (rule[cssProp]) return rule[cssProp];
  if (cssProp === "border-color") {
    const border = rule["border"];
    if (border) return border;
    return rule["border-color"] || null;
  }
  if (cssProp === "margin-left" || cssProp === "margin-right") {
    const margin = rule["margin"];
    if (margin) {
      const sides = margin.replace(/px/g, "").split(/\s+/);
      if (cssProp === "margin-left" && sides.length >= 4) return `${sides[3]}px`;
      if (cssProp === "margin-right" && sides.length >= 2) return `${sides[1]}px`;
    }
    return rule[cssProp] || null;
  }
  return null;
}

function figmaToCSSProp(prop) {
  const map = {
    padding: "padding",
    gap: "gap",
    fontSize: "font-size",
    fontWeight: "font-weight",
    fontFamily: "font-family",
    lineHeight: "line-height",
    letterSpacing: "letter-spacing",
    "margin-left": "margin-left",
    "margin-right": "margin-right",
    mode: null,
    justifyContent: null,
    alignItems: null,
  };
  return map[prop] !== undefined ? map[prop] : prop;
}

function parseCSSRules(css) {
  const rules = {};
  const nested = {};
  postcss.parse(css).walkRules((rule) => {
    const declarations = {};
    // Only direct declarations belong to this rule. Nested selectors are
    // independent rules; comments and values containing semicolons are not CSS
    // declaration names and must not be split with a regular expression.
    rule.each((node) => {
      if (node.type === "decl") declarations[node.prop] = node.value;
    });
    let parent = rule.parent;
    while (parent && parent.type !== "rule") parent = parent.parent;
    if (parent) nested[rule.selector] = { ...nested[rule.selector], ...declarations };
    else rules[rule.selector] = { ...rules[rule.selector], ...declarations };
  });
  // A simple selector names its component rule, not a compact variant nested
  // below it. Explicit nested selectors (including &) remain addressable.
  return { ...nested, ...rules };
}

function findRule(rules, selector) {
  if (rules[selector]) return rules[selector];
  for (const [sel, props] of Object.entries(rules)) {
    if (sel === selector) return props;
  }
  for (const [sel, props] of Object.entries(rules)) {
    if (sel.includes(selector)) return props;
  }
  return null;
}

function valuesMatch(prop, figma, css, partial) {
  const f = norm(figma);
  const c = norm(css);
  if (f === c) return true;
  if (partial && c.includes(f)) return true;

  const fNum = parseFloat(f);
  const cNum = parseFloat(c);
  if (!isNaN(fNum) && !isNaN(cNum) && Math.abs(fNum - cNum) < 0.5) return true;

  if (prop === "padding" || prop === "margin") {
    const fp = parseSides(f);
    const cp = parseSides(c);
    if (fp && cp) return sidesEqual(fp, cp);
  }

  if (prop === "font-family") return c.toLowerCase().startsWith(f.toLowerCase());
  if (prop === "font-weight") return String(parseInt(f)) === String(parseInt(c));

  if (prop === "line-height") {
    const fv = parseFloat(f);
    const cv = parseFloat(c);
    if (!isNaN(fv) && !isNaN(cv) && Math.abs(fv - cv) < 0.01) return true;
  }

  if (prop === "letter-spacing") {
    if (f.includes("%") && c.includes("em")) {
      return Math.abs(parseFloat(f) / 100 - parseFloat(c)) < 0.005;
    }
    return Math.abs(parseFloat(f) - parseFloat(c)) < 0.005;
  }

  if (prop === "border-radius") {
    const fv = parseFloat(f);
    const cv = parseFloat(c);
    if (!isNaN(fv) && !isNaN(cv) && Math.abs(fv - cv) < 1) return true;
    if (c.includes("var(--radius-full)") && fv >= 999) return true;
  }

  return false;
}

function parseSides(v) {
  const parts = v.replace(/px/g, "").split(/\s+/).map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 1) return [parts[0], parts[0], parts[0], parts[0]];
  if (parts.length === 2) return [parts[0], parts[1], parts[0], parts[1]];
  if (parts.length === 4) return parts;
  return null;
}

function sidesEqual(a, b) {
  return a.every((v, i) => Math.abs(v - b[i]) < 0.5);
}

function norm(v) {
  return String(v).replace(/\s+/g, " ").replace(/;$/, "").trim();
}

function getArg(args, flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}

function printTable(rows) {
  const W = { node: 22, prop: 24, figma: 40, css: 42 };
  const sep = `├${"─".repeat(W.node + 2)}┼${"─".repeat(W.prop + 2)}┼${"─".repeat(W.figma + 2)}┼${"─".repeat(W.css + 2)}┼────┤`;

  console.log(`\n┌${"─".repeat(W.node + 2)}┬${"─".repeat(W.prop + 2)}┬${"─".repeat(W.figma + 2)}┬${"─".repeat(W.css + 2)}┬────┐`);
  console.log(`│ ${"Node".padEnd(W.node)} │ ${"Property".padEnd(W.prop)} │ ${"Figma".padEnd(W.figma)} │ ${"CSS".padEnd(W.css)} │ OK │`);
  console.log(sep);

  for (const r of rows) {
    const color = r.match ? "\x1b[32m" : "\x1b[31m";
    const reset = "\x1b[0m";
    const ok = r.match ? "✓" : "✗";
    console.log(
      `│ ${color}${r.node.slice(0, W.node).padEnd(W.node)}${reset}` +
      ` │ ${r.cssProp.slice(0, W.prop).padEnd(W.prop)}` +
      ` │ ${r.figmaVal.slice(0, W.figma).padEnd(W.figma)}` +
      ` │ ${(r.cssVal || "—").slice(0, W.css).padEnd(W.css)}` +
      ` │ ${color}${ok.padEnd(2)}${reset} │`
    );
  }

  console.log(`└${"─".repeat(W.node + 2)}┴${"─".repeat(W.prop + 2)}┴${"─".repeat(W.figma + 2)}┴${"─".repeat(W.css + 2)}┴────┘`);
}
