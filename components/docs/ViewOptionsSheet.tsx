'use client';

import { useRef, useState, type ReactNode } from 'react';
import { Button } from '@plexui/ui/components/Button';
import { Dialog } from '@plexui/ui/components/Dialog';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Check } from '@plexui/ui/components/Icon';
import { Page } from '@plexui/ui/components/Page';
import { Select } from '@plexui/ui/components/Select';
import { Switch } from '@plexui/ui/components/Switch';
import { extensionNote, groupingOptions, iconSizeOptions, initialViewOptions, sortOptions, viewOptionLabel, type ViewOptions } from './viewOptionsData';
import s from './ViewOptionsSheet.module.css';

export type ViewOptionsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: ViewOptions;
  onValueChange: (value: ViewOptions) => void;
  trigger?: ReactNode;
};

/** Options apply immediately. Done and outside dismissal preserve the controlled value. */
export function ViewOptionsSheet({ open, onOpenChange, value, onValueChange, trigger }: ViewOptionsSheetProps) {
  const heading = useRef<HTMLDivElement>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger>
        {trigger ?? <Button color="secondary" variant="soft" pill>View options</Button>}
      </Dialog.Trigger>
      <Dialog.Content mobileVariant="sheet" surface="grouped" showClose={false}
        onOpenAutoFocus={(event) => { event.preventDefault(); heading.current?.focus({ preventScroll: true }); }}>
        <Dialog.Header>
          <div ref={heading} tabIndex={-1} className={s.Heading}><Dialog.Title>View Options</Dialog.Title></div>
          <Dialog.Description className="sr-only">Choose how items are sorted and displayed. Changes apply immediately.</Dialog.Description>
          <Dialog.HeaderAction>
            <Dialog.Close><Button color="info" variant="solid" pill uniform aria-label="Done"><Check /></Button></Dialog.Close>
          </Dialog.HeaderAction>
        </Dialog.Header>
        <Dialog.Body>
          <div className={s.Sections}>
            <FieldGroup aria-label="Sorting and grouping">
              <Field row label="Sort By">
                <Select value={value.sort} options={sortOptions} block={false} align="end"
                  onChange={(option) => onValueChange({ ...value, sort: option.value })} />
              </Field>
              <Field row label="Group By">
                <Select value={value.grouping} options={groupingOptions} block={false} align="end"
                  onChange={(option) => onValueChange({ ...value, grouping: option.value })} />
              </Field>
            </FieldGroup>
            <FieldGroup aria-label="Item size">
              <Field row label="Icon and List Size">
                <Select value={value.iconSize} options={iconSizeOptions} block={false} align="end"
                  onChange={(option) => onValueChange({ ...value, iconSize: option.value })} />
              </Field>
            </FieldGroup>
            <FieldGroup title="Advanced" footer={extensionNote} className={s.Advanced}>
              <Field row label="Show All Filename Extensions">
                <Switch color="accent" checked={value.showExtensions}
                  onCheckedChange={(showExtensions) => onValueChange({ ...value, showExtensions })} />
              </Field>
            </FieldGroup>
          </div>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}

export function ViewOptionsSheetDemo({ initialOpen = false }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const [value, setValue] = useState(initialViewOptions);

  return (
    <div data-demo-stage>
      <Page surface="grouped" className={s.Screen}>
        <Page.Header><Page.Bar>
          <Page.Title>Files</Page.Title>
          <Page.Actions><ViewOptionsSheet open={open} onOpenChange={setOpen} value={value} onValueChange={setValue} /></Page.Actions>
        </Page.Bar></Page.Header>
        <Page.Content>
          <FieldGroup title="Current view" footer="Open View options to change these preferences.">
            <Field row label="Sort By"><output>{viewOptionLabel(sortOptions, value.sort)}</output></Field>
            <Field row label="Group By"><output>{viewOptionLabel(groupingOptions, value.grouping)}</output></Field>
            <Field row label="Icon and List Size"><output>{viewOptionLabel(iconSizeOptions, value.iconSize)}</output></Field>
            <Field row label="Filename extensions"><output>{value.showExtensions ? 'Shown' : 'Hidden'}</output></Field>
          </FieldGroup>
        </Page.Content>
      </Page>
    </div>
  );
}
