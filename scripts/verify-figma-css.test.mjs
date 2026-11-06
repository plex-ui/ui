import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function verify(css, mapping) {
  const directory = mkdtempSync(join(tmpdir(), 'plexui-figma-css-'));
  try {
    const cssPath = join(directory, 'source.css');
    const mappingPath = join(directory, 'reference.json');
    writeFileSync(cssPath, css);
    writeFileSync(mappingPath, JSON.stringify(mapping));
    return spawnSync(process.execPath, [
      fileURLToPath(new URL('./verify-figma-css.mjs', import.meta.url)),
      '--figma', mappingPath, '--css', cssPath,
    ], { encoding: 'utf8' });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('comments and semicolons in CSS strings preserve real declarations', () => {
  const result = verify('.Card { /* Design role */ --title-size: 22px; content: "a;b"; }', {
    Card: { cssSelector: '.Card', '--title-size': '22px', content: '"a;b"' },
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('nested rules do not consume parent declarations or override the base component', () => {
  const result = verify('.Card { width: 100px; &[data-small] { width: 40px; .Title { font-size: 12px; } } } .Card { height: 20px; } .Title { font-size: 22px; }', {
    Card: { cssSelector: '.Card', width: '100px', height: '20px' },
    Small: { cssSelector: '&[data-small]', width: '40px' },
    Title: { cssSelector: '.Title', fontSize: '22px' },
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('a missing or different nested declaration still fails verification', () => {
  const result = verify('.Card { &[data-small] { width: 40px; } }', {
    Small: { cssSelector: '&[data-small]', width: '44px', height: '20px' },
  });
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /Mismatched: 2/);
});
