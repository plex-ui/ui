import { act, fireEvent, render, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { createCommentVNode, Fragment, h } from 'vue';
import { Menu as ReactMenu } from '../../packages/ui/src/components/Menu';
import { Menu, MenuContent, MenuItem, MenuRadioGroup, MenuRadioItem, MenuSub, MenuSubContent, MenuSubTrigger, MenuTrigger } from '../../packages/vue/src/components/Menu';
import { readMenuTriggerLabel } from '../../packages/ui/src/lib/menuSubmenuPlacement';
import { readMenuTriggerLabel as readVueMenuTriggerLabel } from '../../packages/vue/src/lib/menuSubmenuPlacement';
import { Sort as VueSort } from '../../packages/vue/src/components/Icon';
import { Sort } from '../../packages/ui/src/components/Icon';
import { flushVue, mountVue } from './harness';

// Plan 169l. The Menu Overview is a folder's menu as Files opens it on iOS (the owner's shots of 08.11): actions with
// their icons, the view and the sort order as radio items, the chosen sort with its order under it (a radio item's
// description), and Group By (IMG_5689) in a submenu. Submenus is a list's menu as Reminders opens it (the owner's shot
// of 08.11): Sort By shows its order under it (a submenu row's description), its icon beside both lines.

const menuCss = readFileSync('packages/styles/src/components/Menu/Menu.module.css', 'utf8');
const demo = readFileSync('components/docs/MenuDemos.tsx', 'utf8');
const reactDocs = readFileSync('content/components/menu.mdx', 'utf8');
const vueDocs = readFileSync('content/vue/components/menu.mdx', 'utf8');

// A section runs to the next heading, or to `to` when given
const section = (docs: string, from = '### Overview', to?: string) => {
  const start = docs.indexOf(from);
  return docs.slice(start, to ? docs.indexOf(to) : docs.indexOf('\n### ', start + from.length));
};
const reactDemo = demo.slice(demo.indexOf('export function MenuBaseDemo'), demo.indexOf('export function MenuNaturalSizingDemo'));
const vueExport = (name: string) => vueDocs.slice(vueDocs.indexOf(`export const ${name} =`), vueDocs.indexOf('</Menu>`', vueDocs.indexOf(`export const ${name} =`)));
const vueTemplate = vueExport('overview');
const submenuDemo = demo.slice(demo.indexOf('export function MenuSubmenuDemo'), demo.indexOf('export function MenuItemActionsDemo'));

const press = async (target: HTMLElement) => {
    await act(async () => {
        fireEvent.pointerDown(target, { button: 0, pointerType: 'mouse', pointerId: 1 });
        fireEvent.mouseDown(target, { button: 0 });
        await flushVue();
        await new Promise(resolve => setTimeout(resolve, 0));
    });
    await act(async () => {
        fireEvent.pointerUp(target, { button: 0, pointerType: 'mouse', pointerId: 1 });
        fireEvent.mouseUp(target, { button: 0 });
        fireEvent.click(target, { button: 0, detail: 1 });
        await flushVue();
    });
};

async function mountSort(framework: 'React' | 'Vue') {
    if (framework === 'React') {
        render(
            <ReactMenu>
                <ReactMenu.Trigger><button type="button">Downloads</button></ReactMenu.Trigger>
                <ReactMenu.Content>
                    <ReactMenu.RadioGroup value="date" onChange={() => {}}>
                        <ReactMenu.RadioItem value="name">Name</ReactMenu.RadioItem>
                        <ReactMenu.RadioItem value="date" description="Newest to Oldest">Date</ReactMenu.RadioItem>
                    </ReactMenu.RadioGroup>
                </ReactMenu.Content>
            </ReactMenu>,
        );
    } else {
        mountVue(() => h(Menu, null, () => [
            h(MenuTrigger, null, () => h('button', { type: 'button' }, 'Downloads')),
            h(MenuContent, null, () => [
                h(MenuRadioGroup, { value: 'date' }, () => [
                    h(MenuRadioItem, { value: 'name' }, () => 'Name'),
                    h(MenuRadioItem, { value: 'date', description: 'Newest to Oldest' }, () => 'Date'),
                ]),
            ]),
        ]));
        await flushVue();
    }
    return within(document.body);
}

async function mountSortBy(framework: 'React' | 'Vue') {
    if (framework === 'React') {
        render(
            <ReactMenu>
                <ReactMenu.Trigger><button type="button">List actions</button></ReactMenu.Trigger>
                <ReactMenu.Content>
                    <ReactMenu.Sub>
                        <ReactMenu.SubTrigger description="Manual"><Sort /> Sort By</ReactMenu.SubTrigger>
                        <ReactMenu.SubContent>
                            <ReactMenu.Item onSelect={() => {}}>Manual</ReactMenu.Item>
                        </ReactMenu.SubContent>
                    </ReactMenu.Sub>
                    <ReactMenu.Sub>
                        <ReactMenu.SubTrigger><Sort /> Manage Sections</ReactMenu.SubTrigger>
                        <ReactMenu.SubContent>
                            <ReactMenu.Item onSelect={() => {}}>New Section</ReactMenu.Item>
                        </ReactMenu.SubContent>
                    </ReactMenu.Sub>
                </ReactMenu.Content>
            </ReactMenu>,
        );
    } else {
        mountVue(() => h(Menu, null, () => [
            h(MenuTrigger, null, () => h('button', { type: 'button' }, 'List actions')),
            h(MenuContent, null, () => [
                h(MenuSub, null, () => [
                    h(MenuSubTrigger, { description: 'Manual' }, () => [h(VueSort), ' Sort By']),
                    h(MenuSubContent, null, () => 'Manual'),
                ]),
                h(MenuSub, null, () => [
                    h(MenuSubTrigger, null, () => [h(VueSort), ' Manage Sections']),
                    h(MenuSubContent, null, () => 'New Section'),
                ]),
            ]),
        ]));
        await flushVue();
    }
    return within(document.body);
}

describe.each(['React', 'Vue'] as const)('%s radio item description', framework => {
    test('a line under the label stacks as an item description does; without one the row is unchanged', async () => {
        const page = await mountSort(framework);
        await press(page.getByRole('button', { name: 'Downloads' }));
        await waitFor(() => expect(page.getByRole('menu')).toBeTruthy());
        const date = page.getByRole('menuitemradio', { name: /Date/ });
        expect(date.getAttribute('aria-checked')).toBe('true');
        const leading = date.querySelector('[class*="ItemLeading"]')!;
        expect(leading.children[0].textContent).toBe('Date');
        expect(leading.children[1].className).toContain('ItemDescription');
        expect(leading.children[1].textContent).toBe('Newest to Oldest');
        expect(page.getByRole('menuitemradio', { name: 'Name' }).querySelector('[class*="ItemLeading"]')).toBeNull();
    });
});

describe.each(['React', 'Vue'] as const)('%s submenu row description', framework => {
    test('the icon stays beside the two lines, the label over the chosen order, the chevron last', async () => {
        const page = await mountSortBy(framework);
        await press(page.getByRole('button', { name: 'List actions' }));
        await waitFor(() => expect(page.getByRole('menu')).toBeTruthy());
        const rows = page.getAllByRole('menuitem');
        const sortBy = rows.find(row => row.textContent?.includes('Sort By'))!;
        const inner = sortBy.querySelector('[class*="PressableInner"]')!;
        const [icon, leading, chevron] = Array.from(inner.children);
        expect(icon.tagName.toLowerCase()).toBe('svg');
        expect(leading.className).toContain('ItemLeading');
        expect(leading.children[0].textContent?.trim()).toBe('Sort By');
        expect(leading.children[1].className).toContain('ItemDescription');
        expect(leading.children[1].textContent).toBe('Manual');
        expect(chevron.getAttribute('class')).toContain('SubTriggerIcon');
        const plain = rows.find(row => row.textContent?.includes('Manage Sections'))!;
        expect(plain.querySelector('[class*="ItemLeading"]')).toBeNull();
    });
});

async function mountDescribedItems(framework: 'React' | 'Vue') {
    if (framework === 'React') {
        render(
            <ReactMenu>
                <ReactMenu.Trigger><button type="button">Rows</button></ReactMenu.Trigger>
                <ReactMenu.Content>
                    <ReactMenu.Item onSelect={() => {}} description="Newest to Oldest"><Sort /> With icon</ReactMenu.Item>
                    <ReactMenu.Item onSelect={() => {}} description="Line"><strong>Bold</strong> text first</ReactMenu.Item>
                    <ReactMenu.Item onSelect={() => {}} description="">Empty line</ReactMenu.Item>
                    <ReactMenu.Item onSelect={() => {}} description={null}>No line</ReactMenu.Item>
                    <ReactMenu.Item onSelect={() => {}} description="Line"><>{false}<Sort /> Passed through</></ReactMenu.Item>
                </ReactMenu.Content>
            </ReactMenu>,
        );
    } else {
        mountVue(() => h(Menu, null, () => [
            h(MenuTrigger, null, () => h('button', { type: 'button' }, 'Rows')),
            h(MenuContent, null, () => [
                h(MenuItem, { onSelect: () => {}, description: 'Newest to Oldest' }, () => [h(VueSort), ' With icon']),
                h(MenuItem, { onSelect: () => {}, description: 'Line' }, () => [h('strong', null, 'Bold'), ' text first']),
                h(MenuItem, { onSelect: () => {}, description: '' }, () => 'Empty line'),
                h(MenuItem, { onSelect: () => {} }, { default: () => 'No line', description: () => [createCommentVNode('v-if')] }),
                h(MenuItem, { onSelect: () => {}, description: 'Line' }, () => [h(Fragment, null, [createCommentVNode('v-if'), h(VueSort), ' Passed through'])]),
            ]),
        ]));
        await flushVue();
    }
    return within(document.body);
}

describe.each(['React', 'Vue'] as const)('%s described rows', framework => {
    test('icons stay beside the two lines, text elements stay in the label, an empty line is no line', async () => {
        const page = await mountDescribedItems(framework);
        await press(page.getByRole('button', { name: 'Rows' }));
        await waitFor(() => expect(page.getByRole('menu')).toBeTruthy());
        const row = (text: string) => page.getAllByRole('menuitem').find(item => item.textContent?.includes(text))!;
        const inner = (text: string) => Array.from(row(text).querySelector('[class*="PressableInner"]')!.children);

        const [icon, leading] = inner('With icon');
        expect(icon.tagName.toLowerCase()).toBe('svg');
        expect(leading.className).toContain('ItemLeading');

        const [boldLeading] = inner('text first');
        expect(boldLeading.className).toContain('ItemLeading');
        expect(boldLeading.children[0].querySelector('strong')?.textContent).toBe('Bold');

        for (const text of ['Empty line', 'No line']) {
            expect(row(text).querySelector('[class*="ItemLeading"]')).toBeNull();
            expect(row(text).querySelector('[class*="ItemDescription"]')).toBeNull();
        }

        const passed = inner('Passed through').filter(node => node.nodeType === 1);
        expect(passed[0].tagName.toLowerCase()).toBe('svg');
        expect(passed[1].className).toContain('ItemLeading');
    });
});

describe.each([['React', readMenuTriggerLabel], ['Vue', readVueMenuTriggerLabel]] as const)('%s phone submenu heading', (_framework, read) => {
    test('heads with the label only, not the value under it', () => {
        const trigger = document.createElement('div');
        trigger.innerHTML = '<div><svg></svg><div><div> Sort By</div><div data-menu-description="">Manual</div></div></div>';
        document.body.append(trigger);
        expect(read(trigger)).toBe('Sort By');
        trigger.remove();
    });
});

describe('the Menu Overview', () => {
    test('React demo, React code and Vue template hold the same rows, icons and submenu', () => {
        const rows = [
            'Select', 'New Folder', 'Scan Documents', 'Connect to Server', 'Icons', 'List', 'Name', 'Kind', 'Date', 'Size',
            'Tags', 'Group By', 'None', 'Shared by', 'View Options',
        ];
        const icons = ['CheckCircle', 'FolderPlus', 'FileDocument', 'Desktop', 'VideoGrid', 'List'];
        for (const source of [reactDemo, section(reactDocs), vueTemplate]) {
            for (const row of rows) expect(source).toMatch(new RegExp(`[>\\s]${row}(<|\\s*\\n)`));
            for (const icon of icons) expect(source).toContain(`<${icon}`);
            expect(source).toContain('Newest to Oldest');
        }
        for (const source of [reactDemo, section(reactDocs)]) {
            expect(source.match(/<Menu\.Sub>/g)).toHaveLength(1);
            expect(source).toContain('{icons && <List />} List</Menu.RadioItem>');
        }
        expect(vueTemplate.match(/<MenuSub>/g)).toHaveLength(1);
        expect(vueTemplate).toContain('<List v-if="icons" /> List</MenuRadioItem>');
        expect(vueTemplate).toContain(`:description="sort === 'date' ? 'Newest to Oldest' : undefined"`);
    });

    test('icons is on and pill off at first, pill on a desktop only', () => {
        expect(reactDemo).toContain('const [icons, setIcons] = useState(true);');
        expect(section(reactDocs)).toContain('const [icons] = useState(true)');
        expect(reactDemo).toContain('<DemoControlBoolean name="pill" value={pill} onChange={setPill} desktopOnly />');
        expect(section(vueDocs)).toContain('{ name: "icons", type: "boolean", default: true }, { name: "checkmarks", type: "boolean", default: true }, { name: "pill", desktopOnly: true, type: "boolean", default: false }');
        expect(section(vueDocs)).toContain('state={{ view: "list", sort: "date", group: "date" }}');
    });

    test('Submenus is the Reminders list menu in the React demo, React code and Vue template', () => {
        const rows = [
            'View as Columns', 'Show List Info', 'Select Items', 'Manage Sections', 'New Section', 'Sort By', 'Manual',
            'Due Date', 'Creation Date', 'Priority', 'Title', 'Hide Completed', 'Save as Template', 'Print', 'Delete List',
        ];
        const icons = ['Storyboard', 'InfoCircle', 'CheckCircle', 'List', 'Plus', 'Sort', 'EyeOff', 'UploadDocuments', 'FileDocument', 'Trash'];
        for (const source of [submenuDemo, section(reactDocs, '### Submenus', '### Checkbox items'), vueExport('submenus')]) {
            for (const row of rows) expect(source).toMatch(new RegExp(`[>\\s]${row}(<|\\s*\\n)`));
            for (const icon of icons) expect(source).toContain(`<${icon} />`);
        }
        for (const source of [submenuDemo, section(reactDocs, '### Submenus', '### Checkbox items')]) {
            expect(source).toContain('<Menu.SubTrigger description={sort}><Sort /> Sort By</Menu.SubTrigger>');
            expect(source).toMatch(/danger><Trash \/> Delete List/);
        }
        expect(vueExport('submenus')).toContain('<MenuSubTrigger :description="sort"><Sort /> Sort By</MenuSubTrigger>');
        expect(vueExport('submenus')).toMatch(/danger><Trash \/> Delete List/);
        expect(section(vueDocs, '### Submenus', '### Checkbox items')).toContain('state={{ sort: "Manual" }}');
    });

    test('checkmarks off leaves the actions and View Options: no radio rows and no submenu', () => {
        const wrapped = (source: string, open: string, close: string) => {
            const body = source.slice(source.indexOf(open), source.indexOf(close, source.indexOf(open)));
            expect(body).toContain('value="icons"');
            expect(body).toContain('value="tags"');
            expect(body).toContain('Group By');
            expect(source.indexOf(close, source.indexOf(open))).toBeLessThan(source.indexOf('View Options'));
        };
        expect(reactDemo).toContain('<DemoControlBoolean name="checkmarks" value={checkmarks} onChange={setCheckmarks} />');
        expect(section(reactDocs)).toContain('const [checkmarks] = useState(true)');
        wrapped(reactDemo, '{checkmarks && (', ')}');
        wrapped(section(reactDocs), '{checkmarks && (', ')}');
        wrapped(vueTemplate, '<template v-if="checkmarks">', '</template>');
    });

    test('Natural sizing is desktop only: a phone menu is the iOS panel whatever its sizes say', () => {
        for (const docs of [reactDocs, vueDocs]) {
            const natural = section(docs, '### Natural sizing', '### Horizontal (icons only)');
            expect(natural).toContain('phonePresentation="none"');
            expect(natural).not.toContain('withMenuPhone');
            expect(natural).toContain('Desktop only:');
        }
    });

    test('the value under a radio item or a submenu row leaves its label regular; an item subtitle stays semibold', () => {
        expect(menuCss).toContain('&:not(.RadioItem, .SubMenuItem):has(.ItemDescription) {');
    });

    test('a submenu row keeps its label beside its icon: the chevron takes the free space', () => {
        expect(menuCss).toMatch(/\.SubTriggerIcon \{[^}]*margin-inline-start: auto;/);
    });
});
