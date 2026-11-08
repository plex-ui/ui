import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

// The owner, 08.11: «при появлении всех рамок тайтл страницы сначала рисуется сверху мелкий потом сменяется на
// крупный». A phone preview is server-rendered; until the Toolbar measures the large title, its travel was 0, so the
// row's inline copy showed for the first frames. Unmeasured, the title has not gone.
const css = readFileSync('packages/styles/src/components/Toolbar/Toolbar.module.css', 'utf8');

test('an unmeasured large title has not travelled: the inline copy stays hidden until the Toolbar measures it', () => {
    const rule = css.slice(css.indexOf('.Toolbar[data-host="page"][data-title-style="large"] {'));
    expect(rule.slice(0, rule.indexOf('grid-template-areas'))).toMatch(/--toolbar-large-title-travel: 100000;/);
    expect(css).toContain('opacity: clamp(0, (var(--page-scroll-y, 0) - var(--toolbar-large-title-travel, 0) + 8) / 8, 1);');
});
