import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

// The owner, 08.11: «при появлении всех рамок тайтл страницы сначала рисуется сверху мелкий потом сменяется на
// крупный». A phone preview is server-rendered: until the title has moved into the content and gone under the bar,
// the large title shows and the row's inline copy stays hidden.
const css = readFileSync('packages/styles/src/components/Toolbar/Toolbar.module.css', 'utf8');

test('the inline copy stays hidden until a large title has gone under the bar', () => {
    const rule = css.slice(css.indexOf('.Toolbar[data-host="page"][data-title-style="large"] {'));
    expect(rule).toMatch(/& > \.CollapsedTitle \{[^}]*opacity: 0;/);
    expect(rule).toMatch(/&\[data-title-collapsed\] > \.CollapsedTitle \{\s*opacity: 1;/);
    // Server-rendered, the title stands in the bar's second row, where it will stand in the content.
    expect(rule).toMatch(/&:has\(> \.Heading\) \{\s*grid-template-areas:\s*"leading collapsed trailing"\s*"heading heading heading";/);
});
