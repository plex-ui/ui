'use client';

import { markRaw } from 'vue';
import { Check } from '@plexui/vue/components/Icon';
import { NAVIGATION_ROW_GROUPS, navigationRowValues } from '../navigationRowData';
import pageStyles from '../PageDemos.module.css';
import rowStyles from '../NavigationRowDemos.module.css';
import { VueDemo } from './VueDemo';

// The icon goes into a reactive scope: raw, so Vue keeps it a component.
const icons = { Check: markRaw(Check) };

const template = (columns: boolean) => `<div class="${pageStyles.Frame}">
  <!-- The page a row opens: its choices, the current one checked, and Back to the list -->
  <Page v-if="open" surface="grouped">
    <Toolbar>
      <ToolbarLeading>
        <NavigationButton action="back" @click="open = null" />
      </ToolbarLeading>
      <ToolbarTitle>{{ groups.flat().find((row) => row.id === open).label }}</ToolbarTitle>
    </Toolbar>
    <PageContent>
      <FieldGroup>
        <div v-for="choice in groups.flat().find((row) => row.id === open).choices" :key="choice" data-row>
          <Button block color="secondary" variant="ghost" class="${rowStyles.Choice}" :aria-pressed="values[open] === choice"
            @click="values[open] = choice; open = null">
            {{ choice }}
            <component :is="icons.Check" v-if="values[open] === choice" aria-hidden="true" />
          </Button>
        </div>
      </FieldGroup>
    </PageContent>
  </Page>
  <Page v-else surface="grouped">
    <Toolbar>
      <ToolbarTitle>General</ToolbarTitle>
    </Toolbar>
    <PageContent>
      <div class="${rowStyles.Groups}">
      <FieldGroup v-for="(group, index) in groups" :key="index"${columns ? ' columns' : ''}>
        <NavigationRow
          v-for="row in group"
          :key="row.id"
          :label="row.label"
          :value="values[row.id]"
          :description="row.description"
          :disabled="row.disabled"
          @click="open = row.id"
        />
      </FieldGroup>
      </div>
    </PageContent>
  </Page>
</div>`;

const state = () => ({ groups: NAVIGATION_ROW_GROUPS, values: navigationRowValues(), open: null as string | null });

export function VueNavigationRowOverviewDemo() {
  return <VueDemo stageClassName={pageStyles.Stage} template={template(false)} state={state()} context={{ icons }} />;
}

export function VueNavigationRowColumnsDemo() {
  return <VueDemo stageClassName={pageStyles.Stage} template={template(true)} state={state()} context={{ icons }} />;
}
