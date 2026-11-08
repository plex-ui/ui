'use client';

import { COUNTRY_LETTERS, COUNTRY_SECTIONS, jumpToSection } from '../indexBarData';
import pageStyles from '../PageDemos.module.css';
import toolbarStyles from '../ToolbarDemos.module.css';
import { VueDemo } from './VueDemo';

const template = `<div class="${pageStyles.Frame}">
  <Page surface="grouped">
    <Toolbar>
      <ToolbarTitle>Countries</ToolbarTitle>
    </Toolbar>
    <PageContent ref="content">
      <FieldGroup v-for="section in sections" :key="section.letter" :title="section.letter" :data-section="section.letter">
        <div v-for="name in section.names" :key="name" data-row class="${toolbarStyles.Row}">
          <span>{{ name }}</span>
        </div>
      </FieldGroup>
    </PageContent>
    <IndexBar :items="letters" @select="(item) => jump($refs.content, item)" />
  </Page>
</div>`;

export function VueIndexBarOverviewDemo() {
  return (
    <VueDemo
      stageClassName={pageStyles.Stage}
      template={template}
      context={{ sections: COUNTRY_SECTIONS, letters: COUNTRY_LETTERS, jump: jumpToSection }}
    />
  );
}
