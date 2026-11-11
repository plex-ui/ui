// @ts-check

/**
 * The code of an example whose controls change it (owner 11.11: variants of one example are settings of one preview,
 * and its code follows them). The code is a Mustache template (https://mustache.github.io/mustache.5.html) with
 * `[[ ]]` delimiters, since JSX and Vue templates use `{{ }}` themselves:
 *
 * - `[[name]]` is the control's value;
 * - `[[#name]]…[[/name]]` is shown while the control is on, `[[^name]]…[[/name]]` while it is off;
 * - `[[#name=value]]…[[/name=value]]` is shown while the control has that value (`[[^name=value]]` while it has
 *   another one);
 * - a section tag alone on its line takes the whole line with it, as Mustache's standalone tags do.
 *
 * Names hold no spaces, so `[[ a ]]` and other code that happens to hold brackets stays code. A name the values do
 * not have is an error: the page's `codeValues` give every control its default.
 *
 * ComponentPreview renders it with the preview's current values; the MCP manifest with the defaults and with each
 * of the preview's `codeExamples`. Plain JavaScript, so the manifest script imports it as it is.
 */

const TAG = /\[\[([#^/]?)([A-Za-z][\w-]*)(?:=([^\]\s]*))?\]\]/g;

/**
 * @typedef {{ kind: 'text', text: string }} TextToken
 * @typedef {{ kind: 'value', name: string }} ValueToken
 * @typedef {{ kind: '#' | '^' | '/', name: string, expected: string | undefined, key: string }} SectionToken
 * @typedef {TextToken | ValueToken | SectionToken} Token
 * @typedef {{ kind: '#' | '^', name: string, expected: string | undefined, key: string, children: Node[] }} SectionNode
 * @typedef {TextToken | ValueToken | SectionNode} Node
 */

/** @param {string} template @returns {Token[]} */
function tokenize(template) {
  /** @type {Token[]} */
  const tokens = [];
  const lines = template.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  for (const line of lines) {
    const tags = [...line.matchAll(TAG)];
    // A section tag alone on its line stands for nothing on the page: not its indent, not its line break
    const standalone = tags.length === 1 && tags[0][1] !== '' && line.replace(tags[0][0], '').trim() === '';
    let at = 0;
    for (const match of tags) {
      const [whole, sigil, name, expected] = match;
      const start = match.index ?? 0;
      if (!standalone && start > at) tokens.push({ kind: 'text', text: line.slice(at, start) });
      tokens.push(sigil === ''
        ? { kind: 'value', name }
        : { kind: /** @type {'#' | '^' | '/'} */ (sigil), name, expected, key: expected === undefined ? name : `${name}=${expected}` });
      at = start + whole.length;
    }
    if (!standalone && at < line.length) tokens.push({ kind: 'text', text: line.slice(at) });
  }
  return tokens;
}

/** @param {string} template @returns {Node[]} */
function parse(template) {
  /** @type {Node[]} */
  const root = [];
  /** @type {{ children: Node[], key?: string }[]} */
  const stack = [{ children: root }];
  for (const token of tokenize(template)) {
    const parent = stack[stack.length - 1];
    if (token.kind === 'text' || token.kind === 'value') {
      parent.children.push(token);
    } else if (token.kind === '/') {
      if (parent.key !== token.key) throw new Error(`[[/${token.key}]] closes ${parent.key ? `[[#${parent.key}]]` : 'nothing'}`);
      stack.pop();
    } else {
      /** @type {SectionNode} */
      const section = { kind: token.kind, name: token.name, expected: token.expected, key: token.key, children: [] };
      parent.children.push(section);
      stack.push(section);
    }
  }
  if (stack.length > 1) throw new Error(`[[#${stack[stack.length - 1].key}]] is never closed`);
  return root;
}

/** @param {Record<string, unknown>} values @param {string} name */
function valueOf(values, name) {
  if (!Object.prototype.hasOwnProperty.call(values, name)) throw new Error(`The code uses [[${name}]], which its values do not give`);
  return values[name];
}

/** @param {Node[]} nodes @param {Record<string, unknown>} values @returns {string} */
function render(nodes, values) {
  let out = '';
  for (const node of nodes) {
    if (node.kind === 'text') out += node.text;
    else if (node.kind === 'value') out += String(valueOf(values, node.name));
    else {
      const value = valueOf(values, node.name);
      const on = node.expected === undefined ? Boolean(value) : String(value) === node.expected;
      if (on === (node.kind === '#')) out += render(node.children, values);
    }
  }
  return out;
}

/**
 * The code shown for these values.
 * @param {string} template
 * @param {Record<string, unknown>} values
 * @returns {string}
 */
export function renderDemoCode(template, values) {
  return render(parse(template), values);
}

/**
 * Each line indented by `spaces`, blank lines left empty: code from a constant placed inside a wrapper.
 * @param {string} code
 * @param {number} spaces
 * @returns {string}
 */
export function indentCode(code, spaces) {
  const pad = ' '.repeat(spaces);
  return code.split('\n').map((line) => (line.trim() === '' ? '' : pad + line)).join('\n');
}
