'use client';

import { useMemo, useRef, useState, type MouseEvent } from 'react';
import { Button, NavigationButton } from '@plexui/ui/components/Button';
import { Dialog } from '@plexui/ui/components/Dialog';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Disclosure, SearchSm } from '@plexui/ui/components/Icon';
import { IndexBar } from '@plexui/ui/components/IndexBar';
import { Input } from '@plexui/ui/components/Input';
import { RadioGroup } from '@plexui/ui/components/RadioGroup';
import { Toolbar } from '@plexui/ui/components/Toolbar';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import { usePhoneViewport } from './PreviewEmbed';
import { rowButtonClassName } from './phoneRowsTemplate';
import { filterRegions, jumpToRegion } from './settingsRegionData';
import s from './SettingsVoiceDemo.module.css';

/** A long choice in a sheet, as Language & Region › Region (IMG_5950): the countries in sections by letter, the index
 * down the trailing edge, a check on the chosen one, and the search at the bottom. A tap chooses and closes. */
export function SettingsRegionFields({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const list = useRef<HTMLDivElement>(null);
  const phoneViewport = usePhoneViewport();
  const wide = useBreakpoint('md');
  const phone = phoneViewport || !wide;
  const sections = useMemo(() => filterRegions(query), [query]);
  const close = () => { setOpen(false); setQuery(''); };
  const choose = (region: string) => { onChange(region); close(); };
  // A tap on the country already chosen changes nothing, yet it closes the sheet as any choice does
  const closeOnChosen = (event: MouseEvent) => {
    if ((event.target as HTMLElement).closest('[role="radio"]')?.getAttribute('aria-checked') === 'true') close();
  };
  const search = (
    <Input variant="soft" pill placeholder="Search" aria-label="Search regions" startAdornment={<SearchSm />}
      value={query} onChange={(event) => setQuery(event.target.value)} />
  );
  return (
    <FieldGroup aria-label="Region">
      <div data-row>
        <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setQuery(''); }}>
          <Dialog.Trigger>
            <Button block color="secondary" variant="ghost" className={`${rowButtonClassName} ${s.Action}`} aria-label={`Region: ${value}`}>
              <span className={s.ValueRowContent}>
                Region
                <span className={s.ValueRowValue}>{value}</span>
                <Disclosure data-no-autosize="" />
              </span>
            </Button>
          </Dialog.Trigger>
          <Dialog.Content mobileVariant="sheet" surface="plain" width={420}>
            {phone && (
              <Toolbar>
                <Toolbar.Leading><Dialog.Close><NavigationButton action="close" /></Dialog.Close></Toolbar.Leading>
                <Toolbar.Title>Select Region</Toolbar.Title>
              </Toolbar>
            )}
            <Dialog.Header>
              <Dialog.Title>Select Region</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              {/* On a desktop the search stands over the list; on a phone it is the bar at the bottom */}
              {!phone && <div className={s.ChoiceSearch}>{search}</div>}
              <div ref={list} className={s.ChoiceList} onClick={closeOnChosen}>
                <RadioGroup direction="col" className="w-full" value={value} onChange={choose} aria-label="Region">
                  {sections.map(({ letter, names }) => (
                    <FieldGroup key={letter} title={letter} data-section={letter}>
                      {names.map((name) => (
                        <Field key={name} row label={name}><RadioGroup.Item value={name} /></Field>
                      ))}
                    </FieldGroup>
                  ))}
                </RadioGroup>
                {sections.length === 0 && <p className={s.ActionDescription}>No regions match “{query}”.</p>}
              </div>
            </Dialog.Body>
            {/* The index serves the whole list; a search narrows it, so the index steps aside */}
            {!query && <IndexBar items={sections.map(({ letter }) => letter)} onSelect={(letter) => jumpToRegion(list.current, letter)} />}
            {phone && (
              <Toolbar placement="bottom">
                <Toolbar.Content fill>{search}</Toolbar.Content>
              </Toolbar>
            )}
          </Dialog.Content>
        </Dialog>
      </div>
    </FieldGroup>
  );
}
