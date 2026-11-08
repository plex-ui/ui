// Plain module (no 'use client'), so MDX pages can call these while rendering on the server.

/**
 * On a phone a menu opens from a button of the top bar, as the More button opens the menu of an album in Photos
 * (iOS-menu IMG_5657) and of a collection (IMG_5664), over the large title of the screen. The phone form of a menu
 * example is made from its desktop code, so both stay one menu: the trigger becomes that More button, and the panel
 * drops its desktop width, minimum width and size (a phone menu is the kit's 238px panel, iOS 27 Menus) and aligns to
 * the end of the button, which it covers (Menu: a menu without `sideOffset` grows out of its trigger on a phone); a
 * horizontal panel stays horizontal. The React demo renders the same form (MenuDemos.tsx `MenuExample`).
 */

/**
 * The large title of an example's phone screen, and its subtitle: a name with a parenthesis, such as "Horizontal (icons
 * only)", would not fit the title on one line, so the parenthesis becomes the Toolbar subtitle ("Horizontal" over
 * "Icons only").
 */
export function menuPhoneTitle(name: string): { title: string; subtitle?: string } {
  const match = /^(.+?) \((.+)\)$/.exec(name);
  return match ? { title: match[1], subtitle: match[2][0].toUpperCase() + match[2].slice(1) } : { title: name };
}

const MORE_BUTTON = '<Button color="secondary" variant="soft" uniform pill aria-label="More"><DotsHorizontal /></Button>';

/** The `<Menu>` block of an example's code, without the indentation of its first line. */
function menuBlock(code: string) {
  const start = code.search(/<Menu[\s>]/);
  const end = code.lastIndexOf('</Menu>') + '</Menu>'.length;
  const lineStart = code.lastIndexOf('\n', start) + 1;
  const indent = code.slice(lineStart, start);
  return code
    .slice(start, end)
    .split('\n')
    .map((line, index) => (index > 0 && line.startsWith(indent) ? line.slice(indent.length) : line))
    .join('\n');
}

const indent = (code: string, spaces: number) => code.split('\n').map((line) => `${' '.repeat(spaces)}${line}`).join('\n');

/** The phone form of a React menu example: the menu in the trailing side of the top bar. */
export function menuPhoneReact(desktop: string, title: string) {
  const menu = menuBlock(desktop)
    .replace(/<Menu\.Trigger>[\s\S]*?<\/Menu\.Trigger>/, `<Menu.Trigger>\n    ${MORE_BUTTON}\n  </Menu.Trigger>`)
    .replace(/<Menu\.Content\b[^>]*>/, (tag) => `<Menu.Content align="end"${tag.includes('layout="horizontal"') ? ' layout="horizontal"' : ''}>`);
  const heading = menuPhoneTitle(title);
  return `<Toolbar titleStyle="large">
  <Toolbar.Title${heading.subtitle ? ` subtitle="${heading.subtitle}"` : ''}>${heading.title}</Toolbar.Title>
  <Toolbar.Trailing>
${indent(menu, 4)}
  </Toolbar.Trailing>
</Toolbar>`;
}

/** The phone form of a Vue menu example, as `menuPhoneReact`. */
export function menuPhoneVue(desktop: string, title: string) {
  const menu = menuBlock(desktop)
    .replace(/<MenuTrigger>[\s\S]*?<\/MenuTrigger>/, `<MenuTrigger>\n    ${MORE_BUTTON}\n  </MenuTrigger>`)
    .replace(/<MenuContent\b[^>]*>/, (tag) => `<MenuContent align="end"${tag.includes('layout="horizontal"') ? ' layout="horizontal"' : ''}>`);
  const heading = menuPhoneTitle(title);
  return `<Toolbar title-style="large">
  <ToolbarTitle${heading.subtitle ? ` subtitle="${heading.subtitle}"` : ''}>${heading.title}</ToolbarTitle>
  <ToolbarTrailing>
${indent(menu, 4)}
  </ToolbarTrailing>
</Toolbar>`;
}

/**
 * The code of a phone-only React menu example, an iOS pattern that desktop menus do not have (a mode switch, a header):
 * its state, then its phone form.
 */
export function menuPhoneOnlyReact(desktop: string, title: string) {
  return `${desktop.slice(0, desktop.search(/<Menu[\s>]/))}${menuPhoneReact(desktop, title)}`;
}

/** The code of a React menu example: its desktop form, then its phone form. */
export function withMenuPhoneReact(desktop: string, title: string) {
  return `// Desktop
${desktop}

// Phone: the More button of the top bar opens the menu
${menuPhoneReact(desktop, title)}`;
}

/** The code of a Vue menu example: its desktop form, then its phone form. */
export function withMenuPhoneVue(desktop: string, title: string) {
  return `<!-- Desktop -->
${desktop}

<!-- Phone: the More button of the top bar opens the menu -->
${menuPhoneVue(desktop, title)}`;
}

/**
 * The template of a Vue menu example in the Phone preview: its phone form as the top bar of a plain screen, with the
 * menu open when the screen appears (`phoneState={{ open: true }}`) until it closes. `frame` is the class of the docs
 * screen frame (PageDemos.module.css `Frame`, with `Stage` as the VueDemo `phoneStageClassName`), as the Toolbar
 * examples use.
 */
export function menuPhoneTemplateVue(desktop: string, title: string, frame: string) {
  // The menu leaves focus where it is while it stands open: every phone frame of the page opens its menu, and one that
  // took focus would blur the frame before it, which closes its menu
  const bar = menuPhoneVue(desktop, title)
    .replace(/<Menu(?=[\s>])/, '<Menu :force-open="open || undefined" @close="open = false"')
    .replace(/<MenuContent(?=[\s>])/, '<MenuContent @open-auto-focus="open && $event.preventDefault()"');
  return `<div class="${frame}"><Page>
${bar}
</Page></div>`;
}
