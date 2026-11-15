'use client';

import { useState } from 'react';
import { Button, NavigationButton } from '@plexui/ui/components/Button';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { Check } from '@plexui/ui/components/Icon';
import { NavigationRow } from '@plexui/ui/components/NavigationRow';
import { Page } from '@plexui/ui/components/Page';
import { Toolbar } from '@plexui/ui/components/Toolbar';
import { NAVIGATION_ROW_GROUPS, navigationRowValues } from './navigationRowData';
import s from './PageDemos.module.css';
import r from './NavigationRowDemos.module.css';

function SettingsDemo({ columns }: { columns?: boolean }) {
  const [values, setValues] = useState(navigationRowValues);
  const [open, setOpen] = useState<string | null>(null);
  const row = NAVIGATION_ROW_GROUPS.flat().find((item) => item.id === open);

  return (
    <div data-demo-stage className={s.Stage}>
      <div className={s.Frame}>
        {row ? (
          // The page a row opens: its choices, the current one checked, and Back to the list
          <Page surface="grouped">
            <Toolbar>
              <Toolbar.Leading>
                <NavigationButton action="back" onClick={() => setOpen(null)} />
              </Toolbar.Leading>
              <Toolbar.Title>{row.label}</Toolbar.Title>
            </Toolbar>
            <Page.Content>
              <FieldGroup>
                {row.choices.map((choice) => (
                  <div key={choice} data-row>
                    <Button block color="secondary" variant="ghost" className={r.Choice} aria-pressed={values[row.id] === choice}
                      onClick={() => { setValues((current) => ({ ...current, [row.id]: choice })); setOpen(null); }}>
                      {choice}
                      {values[row.id] === choice && <Check aria-hidden="true" />}
                    </Button>
                  </div>
                ))}
              </FieldGroup>
            </Page.Content>
          </Page>
        ) : (
          <Page surface="grouped">
            <Toolbar>
              <Toolbar.Title>General</Toolbar.Title>
            </Toolbar>
            <Page.Content>
              <div className={r.Groups}>
              {NAVIGATION_ROW_GROUPS.map((group, index) => (
                <FieldGroup key={index} columns={columns}>
                  {group.map((item) => (
                    <NavigationRow
                      key={item.id}
                      label={item.label}
                      value={values[item.id]}
                      description={item.description}
                      disabled={item.disabled}
                      valuePlacement={item.valuePlacement}
                      onClick={() => setOpen(item.id)}
                    />
                  ))}
                </FieldGroup>
              ))}
              </div>
            </Page.Content>
          </Page>
        )}
      </div>
    </div>
  );
}

export function NavigationRowOverviewDemo() {
  return <SettingsDemo />;
}

export function NavigationRowColumnsDemo() {
  return <SettingsDemo columns />;
}
