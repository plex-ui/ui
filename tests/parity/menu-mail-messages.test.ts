import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

// Plan 175.2 (examples from plan 169m). Checkbox items is the View Options menu of a mailbox in Mail (iOS-menu IMG_5707),
// Grouped items the filter of the message list in Messages (IMG_5706). Both are 250pt panels, as every native iOS menu
// is (IMG_5648 to 5720: 750px at @3x), and Mail wraps Show Contact Photos onto a second line; the phone menu takes that
// width with touch.css instead of the kit's 238 and growing with its longest label.

const touch = readFileSync('packages/styles/src/styles/touch.css', 'utf8');
const menuCss = readFileSync('packages/styles/src/components/Menu/Menu.module.css', 'utf8');
const demo = readFileSync('components/docs/MenuDemos.tsx', 'utf8');
const reactMenu = readFileSync('packages/ui/src/components/Menu/Menu.tsx', 'utf8');
const vueMenu = readFileSync('packages/vue/src/components/Menu/Menu.ts', 'utf8');
const reactDocs = readFileSync('content/components/menu.mdx', 'utf8');
const vueDocs = readFileSync('content/vue/components/menu.mdx', 'utf8');

const between = (source: string, from: string, to: string) => {
    const start = source.indexOf(from);
    expect(start).toBeGreaterThan(-1);
    return source.slice(start, source.indexOf(to, start));
};
const vueExport = (name: string) => between(vueDocs, `export const ${name} =`, '</Menu>`');

const checkboxSources = () => [
    between(demo, 'export function MenuWithCheckboxesDemoWithControls', 'export function MenuWithRadioItemsDemoWithControls'),
    between(reactDocs, '### Checkbox items', '### Radio items'),
    vueExport('checkboxItems'),
];
const groupedSources = () => [
    between(demo, 'export function MenuGroupedDemo', 'export function MenuDangerDemo'),
    between(reactDocs, '### Grouped items', '### Submenus'),
    vueExport('grouped'),
];

describe('Menu on a phone is the 250pt panel of iOS', () => {
    test('touch.css gives a menu 250px, a horizontal menu at least 250px', () => {
        expect(touch).toMatch(/--menu-default-width: 250px;\s*--menu-default-min-width: 250px;/);
        expect(touch).toMatch(/--menu-horizontal-min-width: 250px;/);
        expect(touch).not.toMatch(/--menu-default-min-width: 238px;/);
    });

    test('a list and a submenu take the default width, a horizontal list its actions', () => {
        expect(menuCss).toMatch(/\.MenuList \{[^}]*?width: var\(--menu-width, var\(--menu-default-width, auto\)\);/);
        expect(menuCss).toMatch(/\.MenuList\[data-layout="horizontal"\] \{\s*width: var\(--menu-width, auto\);\s*\}/);
        expect(menuCss).toMatch(/\.MenuList\[data-submenu-phone\] \{[^}]*?width: var\(--menu-phone-width, var\(--menu-default-width, max-content\)\);/);        // A submenu of "auto" width fits its content on a phone, a number is its width, none takes the default
        expect(reactMenu).toContain('"menu-phone-width": phone.mobile ? (width === "auto" ? "max-content" : width) : undefined,');
        expect(vueMenu).toContain('"menu-phone-width": phone.value.mobile ? (props.width === "auto" ? "max-content" : props.width) : undefined,');
    });

    test('the docs name the width and its token', () => {
        for (const docs of [reactDocs, vueDocs]) {
            expect(docs).toContain('is the 250px panel of iOS menus');
            expect(docs).toContain('A menu is 250px wide, as native iOS menus are');
            expect(docs).toContain('It is 250px wide too, and one of `auto` width fits its content.');
            expect(docs).toContain('- `--menu-default-width`: default width before a content-level override (none on desktop, 250px with touch styles)');
            expect(docs).not.toMatch(/238px/);
        }
    });
});

describe('Menu examples after Mail and Messages', () => {
    test('Checkbox items is the View Options of Mail in the React demo, React code and Vue template', () => {
        for (const source of checkboxSources()) {
            expect(source).toMatch(/Label>View Options</);
            expect(source).toMatch(/<Storyboard \/> Show Categories/);
            expect(source).toMatch(/<Atom \/> Show Priority/);
            expect(source).toMatch(/<AvatarProfile \/> Show Contact Photos/);
            expect(source).toMatch(/<InfoCircle \/> About Categories/);
            // About Categories is a plain item under a separator, after the three options
            const separator = source.search(/<Menu\.?Separator \/>/);
            expect(separator).toBeGreaterThan(source.indexOf('<AvatarProfile />'));
            expect(source.indexOf('<InfoCircle /> About Categories')).toBeGreaterThan(separator);
            expect(source).not.toMatch(/grid lines|Display labels|Enable shadows/);
        }
        // Categories and Priority on, Contact Photos off, as in Mail
        expect(checkboxSources()[0]).toMatch(/categories: true,\s*priority: true,\s*contactPhotos: false,/);
        expect(checkboxSources()[1]).toMatch(/categories: true,\s*priority: true,\s*contactPhotos: false,/);
        expect(between(vueDocs, '### Checkbox items', '### Radio items')).toContain('state={{ view: { categories: true, priority: true, contactPhotos: false } }}');
    });

    test('Grouped items is the filter of Messages: two radio groups of one value, Filter By, Manage Filtering', () => {
        for (const source of groupedSources()) {
            expect(source).toMatch(/<Chats \/> Messages/);
            expect(source).toMatch(/<XSquare \/> Spam/);
            expect(source).toMatch(/<Trash \/> Recently Deleted/);
            expect(source).toMatch(/Label>Filter By</);
            expect(source).toMatch(/<Chat \/> Unread/);
            expect(source).toMatch(/<ChatTripleDots \/> Drafts/);
            expect(source).toMatch(/>Manage Filtering</);
            // Manage Filtering has no icon and comes last, under a separator
            const separators = [...source.matchAll(/<Menu\.?Separator \/>/g)].map((match) => match.index);
            expect(separators).toHaveLength(2);
            expect(separators[1]).toBeGreaterThan(source.indexOf('<ChatTripleDots /> Drafts'));
            expect(source.indexOf('>Manage Filtering<')).toBeGreaterThan(separators[1]!);
            // Both groups hold the one filter
            expect(source.match(/RadioGroup (value=\{filter\} onChange=\{setFilter\}|v-model:value="filter")/g)).toHaveLength(2);
            expect(source).not.toMatch(/Welcome email|promo campaign/);
        }
        expect(groupedSources()[0]).toContain("useState('messages')");
        expect(groupedSources()[1]).toContain('useState("messages")');
        expect(between(vueDocs, '### Grouped items', '### Submenus')).toContain('state={{ filter: "messages" }}');
    });
});
