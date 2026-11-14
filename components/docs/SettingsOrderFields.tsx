'use client';

import { useState } from 'react';
import { Button } from '@plexui/ui/components/Button';
import { Checkbox } from '@plexui/ui/components/Checkbox';
import { Dialog } from '@plexui/ui/components/Dialog';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Sortable } from '@plexui/ui/components/Sortable';
import { rowButtonClassName } from './phoneRowsTemplate';
import { allLanguages, languageDetail, type QuickSetting } from './settingsOrderData';
import s from './SettingsVoiceDemo.module.css';

/** Pick and order in one list, as VoiceOver's Quick Settings (IMG_5946): the check leads the row and shows the
 * setting, the grip ends it and moves it. */
export function QuickSettingsFields({ value, onChange, handles = true, handlePlacement }: {
  value: QuickSetting[];
  onChange: (value: QuickSetting[]) => void;
  /** Shows the grips; hidden, a row still drags from anywhere but its check and the grip still takes the keyboard */
  handles?: boolean;
  /** The grip's side: iOS ends the row with it (IMG_5946) */
  handlePlacement?: 'start' | 'end';
}) {
  return (
    <FieldGroup aria-label="Quick Settings" footer="Checked settings appear in Quick Settings, in this order.">
      <Sortable value={value} onChange={onChange} handles={handles} handlePlacement={handlePlacement}>
        {value.map((item) => (
          <div key={item.id} data-row>
            <Sortable.Handle aria-label={`Reorder ${item.label}`} />
            <div className={s.CheckRow}>
              <Checkbox variant="ghost" label={item.label} checked={item.on}
                onCheckedChange={(on) => onChange(value.map((row) => (row.id === item.id ? { ...row, on } : row)))} />
            </div>
          </div>
        ))}
      </Sortable>
    </FieldGroup>
  );
}

/** Preferred languages, as Language & Region (IMG_5951): the order is the preference, each row names the language in
 * its own words with the English name under it, and Add Language… in the accent ends the list. */
export function LanguagesFields({ value, onChange, handles = true, handlePlacement }: {
  value: string[];
  onChange: (value: string[]) => void;
  handles?: boolean;
  handlePlacement?: 'start' | 'end';
}) {
  const [adding, setAdding] = useState(false);
  const rest = allLanguages.filter((language) => !value.includes(language.id));
  return (
    <FieldGroup title="Preferred Languages" footer="Apps and websites will use the first language in this list that they support.">
      <Sortable value={value} onChange={onChange} handles={handles} handlePlacement={handlePlacement}>
        {value.map((id, index) => {
          const language = allLanguages.find((item) => item.id === id)!;
          return (
            <div key={id} data-row>
              <Sortable.Handle aria-label={`Reorder ${language.label}`} />
              <div className={s.TextRow}>
                {language.label}
                <span className={s.ActionDescription}>{languageDetail(language, index === 0)}</span>
              </div>
            </div>
          );
        })}
      </Sortable>
      <div data-row>
        <Dialog open={adding} onOpenChange={setAdding}>
          <Dialog.Trigger>
            <Button block color="info" variant="ghost" className={`${rowButtonClassName} ${s.Action}`}>
              <span className={s.ActionText}>Add Language…</span>
            </Button>
          </Dialog.Trigger>
          <Dialog.Content mobileVariant="sheet" width={400}>
            <Dialog.Header>
              <Dialog.Title>Add Language</Dialog.Title>
              <Dialog.Description className="sr-only">Choose a language to add to the end of the list.</Dialog.Description>
            </Dialog.Header>
            <Dialog.Body>
              {/* The trigger stays enabled, so focus can return to it after the last language is added */}
              <FieldGroup aria-label="Languages" footer={rest.length === 0 ? 'Every language is in the list.' : undefined}>
                {rest.map((language) => (
                  <div key={language.id} data-row>
                    <Button block color="secondary" variant="ghost" className={`${rowButtonClassName} ${s.Action}`}
                      onClick={() => { onChange([...value, language.id]); setAdding(false); }}>
                      <span className={s.ActionText}>
                        {language.label}
                        <span className={s.ActionDescription}>{language.english}</span>
                      </span>
                    </Button>
                  </div>
                ))}
              </FieldGroup>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog>
      </div>
    </FieldGroup>
  );
}
