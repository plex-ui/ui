'use client';

import { useRef } from 'react';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { IndexBar } from '@plexui/ui/components/IndexBar';
import { Page } from '@plexui/ui/components/Page';
import { Toolbar } from '@plexui/ui/components/Toolbar';
import { COUNTRY_LETTERS, COUNTRY_SECTIONS, jumpToSection } from './indexBarData';
import s from './PageDemos.module.css';
import t from './ToolbarDemos.module.css';

export function IndexBarOverviewDemo() {
  const content = useRef<HTMLDivElement>(null);
  return (
    <div data-demo-stage className={s.Stage}>
      <div className={s.Frame}>
        <Page surface="grouped">
          <Toolbar>
            <Toolbar.Title>Countries</Toolbar.Title>
          </Toolbar>
          <Page.Content ref={content}>
            {COUNTRY_SECTIONS.map(({ letter, names }) => (
              <FieldGroup key={letter} title={letter} data-section={letter}>
                {names.map((name) => (
                  <div key={name} data-row className={t.Row}>
                    <span>{name}</span>
                  </div>
                ))}
              </FieldGroup>
            ))}
          </Page.Content>
          <IndexBar items={COUNTRY_LETTERS} onSelect={(item) => jumpToSection(content.current, item)} />
        </Page>
      </div>
    </div>
  );
}
