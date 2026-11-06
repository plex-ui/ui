import { act, fireEvent, render, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, test } from 'vitest';
import { h, ref } from 'vue';
import { InputGroup as ReactInputGroup } from '../../packages/ui/src/components/InputGroup';
import { Menu as ReactMenu } from '../../packages/ui/src/components/Menu';
import { InputGroup, InputGroupInput, InputGroupAddon, InputGroupButton } from '../../packages/vue/src/components/InputGroup';
import { Menu, MenuTrigger, MenuContent, MenuCheckboxItem, MenuRadioGroup, MenuRadioItem } from '../../packages/vue/src/components/Menu';
import { flushVue, mountVue } from './harness';

const units = ['kg', 'lb', 'oz'];
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

describe.each(['React', 'Vue'] as const)('%s InputGroup portal selection', framework => {
    test.each(['checkbox', 'radio'] as const)('%s item press changes the unit without changing the numeric input', async kind => {
        if (framework === 'React') {
            function Fixture() {
                const [unit, setUnit] = useState('kg');
                return <ReactInputGroup>
                    <ReactInputGroup.Input aria-label="Weight" defaultValue="12" />
                    <ReactInputGroup.Addon align="inline-end">
                        <ReactMenu>
                            <ReactMenu.Trigger><ReactInputGroup.Button aria-label="Unit">{unit}</ReactInputGroup.Button></ReactMenu.Trigger>
                            <ReactMenu.Content minWidth="auto">
                                {kind === 'checkbox'
                                    ? units.map(value => <ReactMenu.CheckboxItem key={value} checked={unit === value} onCheckedChange={() => setUnit(value)}>{value}</ReactMenu.CheckboxItem>)
                                    : <ReactMenu.RadioGroup value={unit} onChange={setUnit}>{units.map(value => <ReactMenu.RadioItem key={value} value={value}>{value}</ReactMenu.RadioItem>)}</ReactMenu.RadioGroup>}
                            </ReactMenu.Content>
                        </ReactMenu>
                    </ReactInputGroup.Addon>
                </ReactInputGroup>;
            }
            render(<Fixture />);
        } else {
            const unit = ref('kg');
            mountVue(() => h(InputGroup, null, () => [
                h(InputGroupInput, { 'aria-label': 'Weight', defaultValue: '12' }),
                h(InputGroupAddon, { align: 'inline-end' }, () => h(Menu, null, () => [
                    h(MenuTrigger, null, () => h(InputGroupButton, { 'aria-label': 'Unit' }, () => unit.value)),
                    h(MenuContent, { minWidth: 'auto' }, () => kind === 'checkbox'
                        ? units.map(value => h(MenuCheckboxItem, { key: value, checked: unit.value === value, 'onUpdate:checked': () => { unit.value = value; } }, () => value))
                        : h(MenuRadioGroup, { value: unit.value, 'onUpdate:value': (value: string) => { unit.value = value; } }, () => units.map(value => h(MenuRadioItem, { key: value, value }, () => value)))),
                ])),
            ]));
            await flushVue();
        }
        const page = within(document.body);
        const trigger = page.getByRole('button', { name: 'Unit' });
        const input = page.getByRole<HTMLInputElement>('textbox', { name: 'Weight' });
        for (const wanted of ['lb', 'oz', 'kg']) {
            await press(trigger);
            await waitFor(() => expect(page.getByRole('menu')).toBeTruthy());
            const choice = page.getByRole(kind === 'checkbox' ? 'menuitemcheckbox' : 'menuitemradio', { name: wanted });
            expect(input.closest('[data-slot="input-group"]')?.contains(choice)).toBe(false);
            await press(choice);
            await waitFor(() => expect(trigger.textContent).toBe(wanted));
            await waitFor(() => expect(page.queryByRole('menu')).toBeNull());
            expect(input.value).toBe('12');
            await press(trigger);
            await waitFor(() => expect(page.getByRole(kind === 'checkbox' ? 'menuitemcheckbox' : 'menuitemradio', { name: wanted }).getAttribute('aria-checked')).toBe('true'));
            await press(page.getByRole(kind === 'checkbox' ? 'menuitemcheckbox' : 'menuitemradio', { name: wanted }));
            await waitFor(() => expect(page.queryByRole('menu')).toBeNull());
        }
    });
});
