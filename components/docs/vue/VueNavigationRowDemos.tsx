'use client';

import { markRaw } from 'vue';
import { Check } from '@plexui/vue/components/Icon';
import { NAVIGATION_ROW_GROUPS, NAVIGATION_ROW_PEOPLE, navigationRowValues } from '../navigationRowData';
import pageStyles from '../PageDemos.module.css';
import rowStyles from '../NavigationRowDemos.module.css';
import { VueDemo } from './VueDemo';

// The icon goes into a reactive scope: raw, so Vue keeps it a component.
const icons = { Check: markRaw(Check) };

const template = (columns: boolean) => `<div class="${pageStyles.Frame}">
  <!-- The page a row opens: its choices, the current one checked, and Back to the list -->
  <Page v-if="open" surface="grouped" width="column">
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
  <Page v-else surface="grouped" width="column">
    <Toolbar>
      <ToolbarTitle>Calendar</ToolbarTitle>
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
          :value-placement="row.valuePlacement"
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

const leadingTemplate = `<div class="${pageStyles.Frame}">
  <Page surface="grouped" width="column">
    <Toolbar>
      <ToolbarLeading v-if="open">
        <NavigationButton action="back" @click="open = null" />
      </ToolbarLeading>
      <ToolbarTitle>{{ open ? people.find((item) => item.id === open).name : 'People' }}</ToolbarTitle>
    </Toolbar>
    <PageContent>
      <FieldGroup>
        <NavigationRow v-if="open" label="Directions" :value="people.find((item) => item.id === open).distance" @click="open = null" />
        <template v-else>
          <NavigationRow
            v-for="item in people"
            :key="item.id"
            :label="item.name"
            :description="item.place + ' · ' + item.time"
            :value="item.distance"
            :disclosure="disclosure"
            @click="open = item.id"
          >
            <template #leading><Avatar :name="item.name" :size="40" /></template>
          </NavigationRow>
        </template>
      </FieldGroup>
    </PageContent>
  </Page>
</div>`;

export function VueNavigationRowLeadingDemo() {
  return <VueDemo stageClassName={pageStyles.Stage} template={leadingTemplate} state={{ people: NAVIGATION_ROW_PEOPLE, open: null as string | null }} controls={[{ name: 'disclosure', type: 'boolean', default: true }]} />;
}
