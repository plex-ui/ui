'use client';

import { useState, type ComponentProps } from 'react';
import { computed, markRaw, ref, watch, type Component } from 'vue';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import {
  Abc,
  AllProductsExplore,
  Analytics,
  Bolt,
  Branch,
  ButtonMousePointer,
  Calendar,
  CameraPhoto,
  CheckboxChecked,
  CheckCheck,
  CheckMd,
  Clip,
  Code,
  Commit,
  CreditCard,
  Desktop,
  FileDocument,
  Folder,
  Globe,
  GroupCheck,
  GroupCheckCircle,
  Home,
  ImageSquare,
  LinkExternal,
  MapPin,
  Members,
  Number123,
  PanelBottom,
  Phone,
  SettingsCog,
  SettingsWrench,
  SpacingVertical,
  SquareAsterisk,
  SquareDashed,
  Terminal,
  TextAlignStart,
  TextInitial,
  TextSelect,
  Tools,
} from '@plexui/vue/components/Icon';
import { DemoControlBoolean, DemoControlRow, controlsTableStyle } from '../ButtonDemos';
import { VuePreview } from '../VuePreview';
import { VueDemo } from './VueDemo';

// The Sidebar templates read their navigation data (with icon components) and
// the Search and Filter tree helpers from their setup scope; a real app
// defines them in <script setup>. MDX cannot pass components or functions to
// a client component, so they come in through this wrapper. Data and logic
// are the same as the React demos in components/docs/SidebarDemos.tsx.
//
// The styles are the React demos' <style> blocks: the Basic demo's stage
// rules (wordmark, header trigger, borderless variant) and the App Shell
// demo's console rules. React marks a borderless stage with
// data-bordered="false"; a Vue template cannot set attributes on the stage,
// so the provider gets the `demo-sidebar-flat` class instead.

type NavItem = { id: string; label: string; icon?: unknown; badge?: string; items?: NavItem[] };

const mainNavItems = [
  { icon: Home, label: 'Overview' },
  { icon: Folder, label: 'Projects', badge: 'New' },
  { icon: FileDocument, label: 'Assets' },
  { icon: Analytics, label: 'Analytics' },
];

const systemNavItems = [
  { icon: Members, label: 'Team' },
  { icon: SettingsCog, label: 'Settings' },
];

const resourcesNavItems = [
  { icon: Code, label: 'Logs' },
  { icon: Terminal, label: 'Console' },
];

const navGroups = [
  { label: 'Project', items: mainNavItems },
  { label: 'System', items: systemNavItems },
  { label: 'Resources', items: resourcesNavItems },
];

const docsSections: NavItem[] = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    items: [
      { id: 'introduction', label: 'Introduction' },
      { id: 'installation', label: 'Installation' },
      { id: 'quick-start', label: 'Quick Start' },
      { id: 'configuration', label: 'Configuration' },
      { id: 'examples', label: 'Examples' },
    ],
  },
  {
    id: 'api-reference',
    label: 'API Reference',
    items: [
      {
        id: 'responses',
        label: 'Responses',
        items: [
          { id: 'create-response', label: 'Create' },
          {
            id: 'streaming',
            label: 'Streaming',
            items: [
              { id: 'stream-created', label: 'response.created' },
              { id: 'stream-progress', label: 'response.in_progress' },
              { id: 'stream-completed', label: 'response.completed' },
              {
                id: 'output-item',
                label: 'response.output_item',
                items: [
                  { id: 'output-added', label: 'added' },
                  { id: 'output-done', label: 'done' },
                ],
              },
            ],
          },
          { id: 'get-response', label: 'Get' },
          { id: 'list-responses', label: 'List' },
          { id: 'delete-response', label: 'Delete' },
        ],
      },
      {
        id: 'chat-completions',
        label: 'Chat Completions',
        items: [
          { id: 'chat-create', label: 'Create' },
          { id: 'chat-stream', label: 'Streaming' },
        ],
      },
      {
        id: 'embeddings',
        label: 'Embeddings',
        items: [
          { id: 'embeddings-create', label: 'Create' },
          { id: 'embeddings-list', label: 'List' },
        ],
      },
      { id: 'models', label: 'Models' },
      { id: 'files', label: 'Files' },
      { id: 'images', label: 'Images' },
      { id: 'audio', label: 'Audio' },
      { id: 'errors', label: 'Errors' },
    ],
  },
  {
    id: 'guides',
    label: 'Guides',
    items: [
      { id: 'best-practices', label: 'Best Practices' },
      { id: 'rate-limits', label: 'Rate Limits' },
      { id: 'authentication', label: 'Authentication' },
      { id: 'error-handling', label: 'Error Handling' },
      { id: 'pagination', label: 'Pagination' },
    ],
  },
  {
    id: 'sdks',
    label: 'SDKs & Libraries',
    items: [
      { id: 'sdk-python', label: 'Python' },
      { id: 'sdk-node', label: 'Node.js' },
      { id: 'sdk-go', label: 'Go' },
      { id: 'sdk-java', label: 'Java' },
    ],
  },
];

const iconSections: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    items: [
      { id: 'overview', label: 'Overview' },
      { id: 'analytics', label: 'Analytics' },
      { id: 'reports', label: 'Reports' },
      { id: 'metrics', label: 'Metrics' },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    icon: FileDocument,
    items: [
      { id: 'pages', label: 'Pages' },
      { id: 'posts', label: 'Posts' },
      { id: 'media', label: 'Media Library' },
      { id: 'templates', label: 'Templates' },
    ],
  },
  {
    id: 'users',
    label: 'Users',
    icon: Members,
    items: [
      { id: 'all-users', label: 'All Users' },
      { id: 'roles', label: 'Roles' },
      { id: 'permissions', label: 'Permissions' },
      { id: 'invitations', label: 'Invitations' },
    ],
  },
  {
    id: 'api',
    label: 'API',
    icon: Code,
    items: [
      { id: 'api-keys', label: 'API Keys' },
      { id: 'webhooks', label: 'Webhooks' },
      { id: 'logs', label: 'Logs' },
    ],
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: CreditCard,
    items: [
      { id: 'subscription', label: 'Subscription' },
      { id: 'invoices', label: 'Invoices' },
      { id: 'usage', label: 'Usage' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: SettingsCog,
    items: [
      { id: 'general', label: 'General' },
      { id: 'security', label: 'Security' },
      { id: 'integrations', label: 'Integrations' },
      { id: 'notifications', label: 'Notifications' },
    ],
  },
];

const consoleSections: NavItem[] = [
  {
    id: 'build',
    label: 'Build',
    icon: SettingsWrench,
    items: [
      { id: 'workbench', label: 'Workbench' },
      { id: 'files', label: 'Files' },
      { id: 'skills', label: 'Skills' },
      { id: 'batches', label: 'Batches' },
    ],
  },
  {
    id: 'managed-agents',
    label: 'Managed Agents',
    icon: Branch,
    badge: 'New',
    items: [
      { id: 'quickstart', label: 'Quickstart' },
      { id: 'agents', label: 'Agents' },
      { id: 'sessions', label: 'Sessions' },
      { id: 'environments', label: 'Environments' },
      { id: 'credential-vaults', label: 'Credential vaults' },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: Bolt,
    items: [
      { id: 'analytics-usage', label: 'Usage' },
      { id: 'analytics-cost', label: 'Cost' },
      { id: 'analytics-logs', label: 'Logs' },
    ],
  },
  {
    id: 'cli',
    label: 'CLI',
    icon: Terminal,
    items: [
      { id: 'cli-usage', label: 'Usage' },
      { id: 'cli-settings', label: 'Settings' },
    ],
  },
  {
    id: 'manage',
    label: 'Manage',
    icon: Tools,
    items: [
      { id: 'api-keys', label: 'API keys' },
      { id: 'limits', label: 'Limits' },
      { id: 'members', label: 'Members' },
      { id: 'security', label: 'Security and compliance' },
    ],
  },
];

// Search and Filter: workflow steps typed by kind

type StepType = 'screen' | 'action' | 'document' | 'selfie';
type WorkflowStep = { id: string; label: string; type: StepType; children?: WorkflowStep[] };

const stepTypes: Record<StepType, { icon: unknown; label: string }> = {
  screen: { icon: Desktop, label: 'Screen' },
  action: { icon: Bolt, label: 'Action' },
  document: { icon: FileDocument, label: 'Document' },
  selfie: { icon: CameraPhoto, label: 'Selfie' },
};

const stepFilterOptions = (Object.keys(stepTypes) as StepType[]).map((type) => ({
  value: type,
  label: stepTypes[type].label,
}));

const workflowSteps: WorkflowStep[] = [
  { id: 'start', label: 'Start', type: 'screen' },
  { id: 'country-select', label: 'Country select', type: 'screen' },
  {
    id: 'gov-id',
    label: 'ID verification',
    type: 'document',
    children: [
      { id: 'run-gov-id', label: 'Run ID verification', type: 'action' },
      { id: 'update-gov-fields', label: 'Update inquiry fields', type: 'action' },
    ],
  },
  {
    id: 'selfie-check',
    label: 'Selfie verification',
    type: 'selfie',
    children: [
      { id: 'capture-selfie', label: 'Capture selfie', type: 'action' },
      { id: 'run-selfie', label: 'Run selfie check', type: 'action' },
    ],
  },
  {
    id: 'doc-check',
    label: 'Document check',
    type: 'document',
    children: [
      { id: 'run-doc', label: 'Run document check', type: 'action' },
      { id: 'update-doc-fields', label: 'Update inquiry fields', type: 'action' },
    ],
  },
  { id: 'success', label: 'Success', type: 'screen' },
  {
    id: 'fail',
    label: 'Fail',
    type: 'screen',
    children: [
      { id: 'retry-doc', label: 'Retry document', type: 'action' },
      { id: 'retry-selfie', label: 'Retry selfie', type: 'action' },
    ],
  },
  { id: 'doc-retry', label: 'Document retry', type: 'screen' },
  { id: 'selfie-retry', label: 'Selfie retry', type: 'screen' },
];

/** The tree, keeping parents of matching children */
function filterWorkflowTree(items: WorkflowStep[], search: string): WorkflowStep[] {
  if (!search) return items;

  return items.reduce<WorkflowStep[]>((acc, item) => {
    const matchesSearch = item.label.toLowerCase().includes(search.toLowerCase());
    const filteredChildren = item.children ? filterWorkflowTree(item.children, search) : undefined;
    const hasMatchingChildren = filteredChildren && filteredChildren.length > 0;

    if (matchesSearch || hasMatchingChildren) {
      acc.push(hasMatchingChildren ? { ...item, children: filteredChildren } : item);
    }

    return acc;
  }, []);
}

/** Every step of the selected types, as a flat list */
function flattenByType(items: WorkflowStep[], typeFilters: StepType[], search: string): WorkflowStep[] {
  const result: WorkflowStep[] = [];

  function collect(list: WorkflowStep[]) {
    for (const item of list) {
      const matchesType = typeFilters.includes(item.type);
      const matchesSearch = !search || item.label.toLowerCase().includes(search.toLowerCase());
      if (matchesType && matchesSearch) result.push(item);
      if (item.children) collect(item.children);
    }
  }

  collect(items);
  return result;
}

/** The label of a step id anywhere in the tree */
function findStepLabel(id: string, items: WorkflowStep[] = workflowSteps): string {
  for (const item of items) {
    if (item.id === id) return item.label;
    if (item.children) {
      const found = findStepLabel(id, item.children);
      if (found) return found;
    }
  }
  return '';
}

const searchSections = [
  { label: 'Get started', items: ['Overview', 'Quickstart', 'Models', 'Pricing', 'Libraries'] },
  { label: 'Core concepts', items: ['Text generation', 'Code generation', 'Images and vision', 'Structured output'] },
  { label: 'Agents', items: ['Overview', 'Build agents'] },
];

// Static data stays out of Vue's reactivity
const scope = {
  navGroups: markRaw(navGroups),
  docsSections: markRaw(docsSections),
  iconSections: markRaw(iconSections),
  consoleSections: markRaw(consoleSections),
  workflowSteps: markRaw(workflowSteps),
  stepTypes: markRaw(stepTypes),
  stepFilterOptions: markRaw(stepFilterOptions),
  searchSections: markRaw(searchSections),
  filterWorkflowTree,
  flattenByType,
  findStepLabel,
};

const SIDEBAR_DEMO_STYLES = `
  [data-demo-stage] [class*="SidebarLayout"] { --sidebar-width: 260px; }
  [data-demo-stage] aside[class*="Sidebar-module"] { --sidebar-icon-size: 16px; padding-top: 12px; }
  [data-demo-stage] aside[class*="Sidebar-module"] > [class*="Header"] { min-height: 0; }
  [data-demo-stage] aside[class*="Sidebar-module"] > [class*="Content"] { padding-top: 12px; -webkit-mask-image: none; mask-image: none; }
  [data-demo-stage] aside[class*="Sidebar-module"] [class*="Sidebar-module__"][class*="Group"]:not([class*="GroupLabel"]):not([class*="GroupContent"]) { padding-top: 18px; padding-bottom: 0; }
  [data-demo-stage] aside[class*="Sidebar-module"] [class*="Sidebar-module__"][class*="Group"]:first-child:not([class*="GroupLabel"]):not([class*="GroupContent"]) { padding-top: 0; }
  [data-demo-stage] aside[class*="Sidebar-module"] [class*="GroupLabel"] { margin-top: 0; padding-bottom: 6px; }
  [data-demo-stage] aside[class*="Sidebar-module"] [class*="Header"]:has(.demo-sidebar-wordmark) { padding-left: 12px; padding-right: 0; gap: 4px; transition: padding var(--sidebar-collapse-duration) var(--cubic-move); }
  [data-demo-stage] .demo-sidebar-flat [class*="SidebarLayout"] { background: var(--color-surface); }
  [data-demo-stage] .demo-sidebar-flat aside[class*="Sidebar-module"] { background: var(--color-surface-secondary); }
  [data-demo-stage] .demo-sidebar-flat [class*="Inset"] { margin: 0; box-shadow: none; border-radius: 0; }
  [data-demo-stage] aside[class*="Sidebar-module"] [class*="Header"] button[class*="Trigger"] { width: auto; margin-left: auto; flex: 0 0 auto; }
  [data-demo-stage] aside[class*="Sidebar-module"] [class*="Header"] button[class*="Trigger"] span { opacity: 1 !important; pointer-events: auto !important; }
  [data-demo-stage] aside[class*="Sidebar-module"] button[class*="Trigger"] [class*="TriggerIcon"] { margin: 0 3px; }
  [data-demo-stage] [data-sidebar="collapsed"] aside [class*="Sidebar-module__"][class*="Header"] { padding-left: 0; padding-right: 0; justify-content: center; gap: 0; }
  [data-demo-stage] [data-sidebar="collapsed"] aside [class*="Sidebar-module__"][class*="Header"] button[class*="Trigger"] { margin-left: 0; margin-right: 0; }
  [data-demo-stage] .demo-sidebar-wordmark {
    flex: 1;
    min-width: 0;
    max-width: 1000px;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.005em;
    white-space: nowrap;
    overflow: hidden;
    opacity: 1;
    transition: opacity var(--sidebar-collapse-duration) var(--cubic-move), max-width var(--sidebar-collapse-duration) var(--cubic-move);
  }
  [data-demo-stage] [data-sidebar="collapsed"] .demo-sidebar-wordmark { opacity: 0; max-width: 0; pointer-events: none; }

  .console-demo .console-content { -webkit-mask-image: none; mask-image: none; padding-top: 0; }
  .console-demo .console-menu-button > span > span:first-child > svg { width: 16px; height: 16px; }
  .console-demo .console-workspace-chevron {
    transition: opacity var(--sidebar-collapse-duration) var(--cubic-move);
  }
  .console-demo[data-sidebar="collapsed"] .console-menu-button > span > span:nth-child(2),
  .console-demo[data-sidebar="collapsed"] .console-menu-button > span > span:nth-child(3) { display: none; }
  .console-demo[data-sidebar="collapsed"] .console-workspace-chevron { opacity: 0; pointer-events: none; }
  .console-demo .console-footer { padding-top: 8px; padding-bottom: 8px; }
  .console-demo .console-footer-separator { display: block; margin-top: 8px; margin-bottom: 8px; }
  .console-demo .console-account-button > span { height: auto; min-height: 44px; padding-top: 6px; padding-bottom: 6px; }
  .console-trigger-kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    min-width: 18px;
    height: 16px;
    font-size: 10px;
    font-family: inherit;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.7);
  }
`;

/**
 * A VueDemo whose template can read the sidebar demo data (`navGroups`,
 * `docsSections`, `iconSections`, `consoleSections`, `workflowSteps`,
 * `stepTypes`, `stepFilterOptions`, `searchSections`) and the Search and
 * Filter helpers (`filterWorkflowTree`, `flattenByType`, `findStepLabel`).
 */
export function VueSidebarDemo({ state, ...props }: ComponentProps<typeof VueDemo>) {
  return (
    <>
      <style>{SIDEBAR_DEMO_STYLES}</style>
      <VueDemo {...props} state={{ ...scope, ...state }} />
    </>
  );
}

// =============================================
// Tree with Hover Actions
// =============================================
//
// The React demo (SidebarActionTreeDemo in components/docs/SidebarDemos.tsx)
// as a single-file component: its <script setup> holds the tree, the mode
// switch (a watch) and the drag and drop handlers, its <template> renders the
// sidebar. Templates compile at runtime but scripts do not, so the code block
// shows the whole SFC and the demo runs its template with the setup scope
// built by createActionTreeDemo(), the same refs, computeds, watch and
// functions. The demo controls set the `action` and `bordered` refs, so the
// watch on `action` runs as in the SFC.
//
// React reorders siblings with dnd-kit; here rows use native HTML5 drag and
// drop: pressing a row's grip makes the row draggable, it can be dropped on
// the rows of its own list (the scoped collision of the React demo), and the
// drop runs the React demo's reorder.

type ActionNodeType =
  | 'action'
  | 'condition'
  | 'module'
  | 'screen'
  | 'container'
  | 'footer'
  | 'button'
  | 'image'
  | 'text'
  | 'title'
  | 'spacer'
  | 'address-input'
  | 'checkbox'
  | 'checkbox-group'
  | 'country-select'
  | 'date'
  | 'file-upload'
  | 'masked-text'
  | 'multi-select'
  | 'number-input'
  | 'phone-number'
  | 'radio-group'
  | 'select'
  | 'text-area'
  | 'text-input'
  | 'url-input';

type ActionNode = { id: string; label: string; type: ActionNodeType; children?: ActionNode[] };

const nodeTypes: Record<ActionNodeType, { icon: Component; label: string }> = {
  action: { icon: Bolt, label: 'Action' },
  condition: { icon: Commit, label: 'Condition' },
  module: { icon: AllProductsExplore, label: 'Module' },
  screen: { icon: Desktop, label: 'Screen' },
  container: { icon: SquareDashed, label: 'Container' },
  footer: { icon: PanelBottom, label: 'Footer' },
  button: { icon: ButtonMousePointer, label: 'Button' },
  image: { icon: ImageSquare, label: 'Image' },
  text: { icon: TextAlignStart, label: 'Text' },
  title: { icon: TextInitial, label: 'Title' },
  spacer: { icon: SpacingVertical, label: 'Spacer' },
  'address-input': { icon: MapPin, label: 'Address input' },
  checkbox: { icon: CheckboxChecked, label: 'Checkbox' },
  'checkbox-group': { icon: GroupCheck, label: 'Checkbox group' },
  'country-select': { icon: Globe, label: 'Country select' },
  date: { icon: Calendar, label: 'Date' },
  'file-upload': { icon: Clip, label: 'File upload' },
  'masked-text': { icon: SquareAsterisk, label: 'Masked text' },
  'multi-select': { icon: CheckCheck, label: 'Multi select' },
  'number-input': { icon: Number123, label: 'Number input' },
  'phone-number': { icon: Phone, label: 'Phone number' },
  'radio-group': { icon: GroupCheckCircle, label: 'Radio group' },
  select: { icon: CheckMd, label: 'Select' },
  'text-area': { icon: TextSelect, label: 'Text area' },
  'text-input': { icon: Abc, label: 'Text input' },
  'url-input': { icon: LinkExternal, label: 'URL input' },
};

/** The icon each type's `nodeTypes` entry uses in the SFC */
const NODE_TYPE_ICONS: Record<ActionNodeType, string> = {
  action: 'Bolt',
  condition: 'Commit',
  module: 'AllProductsExplore',
  screen: 'Desktop',
  container: 'SquareDashed',
  footer: 'PanelBottom',
  button: 'ButtonMousePointer',
  image: 'ImageSquare',
  text: 'TextAlignStart',
  title: 'TextInitial',
  spacer: 'SpacingVertical',
  'address-input': 'MapPin',
  checkbox: 'CheckboxChecked',
  'checkbox-group': 'GroupCheck',
  'country-select': 'Globe',
  date: 'Calendar',
  'file-upload': 'Clip',
  'masked-text': 'SquareAsterisk',
  'multi-select': 'CheckCheck',
  'number-input': 'Number123',
  'phone-number': 'Phone',
  'radio-group': 'GroupCheckCircle',
  select: 'CheckMd',
  'text-area': 'TextSelect',
  'text-input': 'Abc',
  'url-input': 'LinkExternal',
};

const filterOptions = (['action', 'condition', 'module', 'screen', 'container', 'footer'] as ActionNodeType[]).map(
  (type) => ({ value: type, label: nodeTypes[type].label }),
);

const elementTypes: ActionNodeType[] = ['button', 'image', 'text', 'title', 'spacer'];
const formTypes: ActionNodeType[] = [
  'address-input',
  'checkbox',
  'checkbox-group',
  'country-select',
  'date',
  'file-upload',
  'masked-text',
  'multi-select',
  'number-input',
  'phone-number',
  'radio-group',
  'select',
  'text-area',
  'text-input',
  'url-input',
];

const actionTree: ActionNode[] = [
  { id: 'action', label: 'Action', type: 'action' },
  { id: 'condition', label: 'Condition', type: 'condition' },
  {
    id: 'screen',
    label: 'Screen',
    type: 'screen',
    children: [
      {
        id: 'container-elements',
        label: 'Container 1',
        type: 'container',
        children: [
          { id: 'el-button', label: 'Button', type: 'button' },
          { id: 'el-image', label: 'Image', type: 'image' },
          { id: 'el-text', label: 'Text', type: 'text' },
          { id: 'el-title', label: 'Title', type: 'title' },
          { id: 'el-spacer', label: 'Spacer', type: 'spacer' },
        ],
      },
      {
        id: 'container-forms',
        label: 'Container 2',
        type: 'container',
        children: [
          { id: 'fm-address', label: 'Address input', type: 'address-input' },
          { id: 'fm-checkbox', label: 'Checkbox', type: 'checkbox' },
          { id: 'fm-checkgroup', label: 'Checkbox group', type: 'checkbox-group' },
          { id: 'fm-country', label: 'Country select', type: 'country-select' },
          { id: 'fm-date', label: 'Date', type: 'date' },
          { id: 'fm-file', label: 'File upload', type: 'file-upload' },
          { id: 'fm-masked', label: 'Masked text', type: 'masked-text' },
          { id: 'fm-multi', label: 'Multi select', type: 'multi-select' },
          { id: 'fm-number', label: 'Number input', type: 'number-input' },
          { id: 'fm-phone', label: 'Phone number', type: 'phone-number' },
          { id: 'fm-radio', label: 'Radio group', type: 'radio-group' },
          { id: 'fm-select', label: 'Select', type: 'select' },
          { id: 'fm-textarea', label: 'Text area', type: 'text-area' },
          { id: 'fm-textinput', label: 'Text input', type: 'text-input' },
          { id: 'fm-url', label: 'URL input', type: 'url-input' },
        ],
      },
      {
        id: 'footer',
        label: 'Footer',
        type: 'footer',
        children: [
          { id: 'ft-text', label: 'Text', type: 'text' },
          { id: 'ft-button', label: 'Button', type: 'button' },
        ],
      },
    ],
  },
  {
    id: 'module',
    label: 'Module',
    type: 'module',
    children: [
      { id: 'mod-screen-1', label: 'Screen 1', type: 'screen' },
      { id: 'mod-screen-2', label: 'Screen 2', type: 'screen' },
      { id: 'mod-screen-3', label: 'Screen 3', type: 'screen' },
    ],
  },
];

const groupIds = ['screen', 'container-elements', 'container-forms', 'footer', 'module'];

const ghostButton =
  'inline-flex items-center justify-center shrink-0 rounded-sm cursor-pointer p-0 m-0 border-0 bg-transparent appearance-none leading-none align-middle select-none hover:bg-[var(--color-background-secondary-ghost-hover)] active:bg-[var(--color-background-secondary-ghost-hover)] transition-colors [&>svg]:block [&>svg]:w-4 [&>svg]:h-4 relative z-[1] pointer-events-auto';

/** The tree, keeping the parents of matching rows */
function filterTree(items: ActionNode[], query: string): ActionNode[] {
  if (!query) return items;
  return items.reduce<ActionNode[]>((acc, item) => {
    const match = item.label.toLowerCase().includes(query.toLowerCase());
    const children = item.children ? filterTree(item.children, query) : undefined;
    const childMatch = !!children && children.length > 0;
    if (match || childMatch) acc.push(childMatch ? { ...item, children } : item);
    return acc;
  }, []);
}

/** Every row of the checked types (all types when none is) matching the search, as a flat list */
function flattenNodes(items: ActionNode[], types: ActionNodeType[], query: string): ActionNode[] {
  const result: ActionNode[] = [];
  const collect = (list: ActionNode[]) => {
    for (const item of list) {
      const matchType = types.length === 0 || types.includes(item.type);
      const matchSearch = !query || item.label.toLowerCase().includes(query.toLowerCase());
      if (matchType && matchSearch) result.push(item);
      if (item.children) collect(item.children);
    }
  };
  collect(items);
  return result;
}

/** The label of a row anywhere in the tree */
function findLabel(items: ActionNode[], id: string): string {
  for (const item of items) {
    if (item.id === id) return item.label;
    if (item.children) {
      const found = findLabel(item.children, id);
      if (found) return found;
    }
  }
  return '';
}

/** Moves `activeId` to the place of `targetId` in the list holding both; the Footer never moves */
function reorderTree(items: ActionNode[], activeId: string, targetId: string): ActionNode[] {
  return items.map((item) => {
    if (!item.children) return item;
    const from = item.children.findIndex((child) => child.id === activeId);
    const to = item.children.findIndex((child) => child.id === targetId);
    if (from !== -1 && to !== -1) {
      if (item.children[from].type === 'footer' || item.children[to].type === 'footer') return item;
      const children = [...item.children];
      children.splice(to, 0, ...children.splice(from, 1));
      return { ...item, children };
    }
    return { ...item, children: reorderTree(item.children, activeId, targetId) };
  });
}

/** The + menu: a screen adds a container or a footer, any other row adds elements */
const addMenu = (node: ActionNode): ActionNodeType[][] =>
  node.type === 'screen' ? [['container', 'footer']] : [elementTypes, formTypes];

/** Containers in a screen (not its Footer) and elements reorder; a module's screens do not */
const isSortable = (parent: ActionNode, node: ActionNode) => parent.type !== 'module' && node.type !== 'footer';

/** Sub rows are 32px tall and indented 24px a level; leaves also skip the chevron column */
const rowStyle = (depth: number, node: ActionNode) => ({
  paddingLeft: 4 + (node.children ? depth : depth + 1) * 24 + 'px',
  paddingRight: '4px',
  paddingTop: '0',
  paddingBottom: '0',
  height: '32px',
});

const expandAll = (): Record<string, boolean> => Object.fromEntries(groupIds.map((id) => [id, true]));

/**
 * The SFC's <script setup>, one instance per demo: the `scope` its template
 * reads, and setters for the refs the demo controls drive.
 */
function createActionTreeDemo() {
  // Demo controls
  const action = ref<'collapse' | 'filter'>('collapse');
  const bordered = ref(true);

  const steps = ref<ActionNode[]>(actionTree);
  const search = ref('');
  const typeFilters = ref<ActionNodeType[]>([]);
  const activeItem = ref('screen');
  const expanded = ref<Record<string, boolean>>(expandAll());

  function toggle(id: string) {
    expanded.value[id] = !expanded.value[id];
  }

  const hasAnyExpanded = computed(() => groupIds.some((id) => expanded.value[id]));
  function toggleCollapseAll() {
    expanded.value = hasAnyExpanded.value ? {} : expandAll();
  }

  const isFlattening = computed(
    () => action.value === 'filter' && (typeFilters.value.length > 0 || search.value.length > 0),
  );
  const visibleSteps = computed(() =>
    isFlattening.value
      ? flattenNodes(steps.value, typeFilters.value, search.value)
      : filterTree(steps.value, search.value),
  );
  const activeLabel = computed(() => findLabel(steps.value, activeItem.value) || 'Screen');

  watch(action, (mode) => {
    typeFilters.value = [];
    search.value = '';
    if (mode === 'collapse') expanded.value = expandAll();
  });

  const grabbed = ref<string | null>(null);
  const dragId = ref<string | null>(null);
  const overId = ref<string | null>(null);
  let dropIds: string[] = [];

  function startDrag(event: DragEvent, parent: ActionNode, node: ActionNode) {
    dragId.value = node.id;
    dropIds = (parent.children ?? []).filter((sibling) => isSortable(parent, sibling)).map((sibling) => sibling.id);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', node.id);
    }
  }

  function dragOver(event: DragEvent, id: string) {
    if (!dragId.value || !dropIds.includes(id)) return;
    event.preventDefault();
    overId.value = id === dragId.value ? null : id;
  }

  function clearDropTarget(event: DragEvent) {
    if (!event.defaultPrevented) overId.value = null;
  }

  function endDrag() {
    grabbed.value = null;
    dragId.value = null;
    overId.value = null;
    dropIds = [];
  }

  function dropOn(event: DragEvent, id: string) {
    if (!dragId.value || !dropIds.includes(id)) return;
    event.preventDefault();
    if (id !== dragId.value) steps.value = reorderTree(steps.value, dragId.value, id);
    endDrag();
  }

  const scope = {
    // Static data stays out of Vue's reactivity
    nodeTypes: markRaw(nodeTypes),
    filterOptions: markRaw(filterOptions),
    ghostButton,
    addMenu,
    isSortable,
    rowStyle,
    action,
    bordered,
    steps,
    search,
    typeFilters,
    activeItem,
    expanded,
    toggle,
    hasAnyExpanded,
    toggleCollapseAll,
    isFlattening,
    visibleSteps,
    activeLabel,
    grabbed,
    dragId,
    overId,
    startDrag,
    dragOver,
    clearDropTarget,
    dropOn,
    endDrag,
  };

  return {
    scope,
    setAction: (mode: 'collapse' | 'filter') => {
      action.value = mode;
    },
    setBordered: (value: boolean) => {
      bordered.value = value;
    },
  };
}

// The SFC

const indentText = (text: string, spaces: number) =>
  text
    .split('\n')
    .map((line) => (line ? ' '.repeat(spaces) + line : line))
    .join('\n');

const listCode = (items: string[]) => items.map((item) => `"${item}"`).join(', ');

const nodeCode = (node: ActionNode): string => {
  const fields = `id: "${node.id}", label: "${node.label}", type: "${node.type}"`;
  if (!node.children) return `{ ${fields} },`;
  return `{\n  ${fields},\n  children: [\n${indentText(node.children.map(nodeCode).join('\n'), 4)}\n  ],\n},`;
};

/** The + button and its menu (`addMenu`) */
const addMenuTemplate = (node: string, condition = '') => `<Menu${condition}>
  <MenuTrigger>
    <button type="button" :class="ghostButton" style="width: 24px; height: 24px" aria-label="Add"><Plus /></button>
  </MenuTrigger>
  <MenuContent min-width="auto" align="end">
    <template v-for="(types, index) in addMenu(${node})" :key="index">
      <MenuSeparator v-if="index > 0" />
      <MenuItem v-for="type in types" :key="type" @select="() => {}">
        <span class="inline-flex items-center justify-center w-4 h-4 shrink-0 [&>svg]:w-full [&>svg]:h-full"><component :is="nodeTypes[type].icon" /></span> {{ nodeTypes[type].label }}
      </MenuItem>
    </template>
  </MenuContent>
</Menu>`;

/** The expand chevron of a parent row */
const chevronTemplate = (node: string, className: string) => `<span
  v-if="${node}.children"
  role="none"
  class="${className}"
  :class="ghostButton"
  style="width: 24px; height: 24px"
  :style="{ transform: expanded[${node}.id] ? 'rotate(0deg)' : 'rotate(-90deg)' }"
  @click.stop="toggle(${node}.id)"
  @keydown.enter.stop="toggle(${node}.id)"
  @keydown.space.stop="toggle(${node}.id)"
>
  <ChevronDownMd />
</span>`;

const typeIconTemplate = (node: string) => `<span
  class="inline-flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4 relative z-[1]"
  style="width: 24px; height: 24px; flex-shrink: 0; border-radius: 6px"
>
  <component :is="nodeTypes[${node}.type].icon" />
</span>`;

/** One level of sub rows: `node` in `parent.children`, then `inner` as its own sub menu */
const subRowsTemplate = (parent: string, node: string, depth: number, inner?: string) => `<SidebarMenuSubItem
  v-for="${node} in ${parent}.children"
  :key="${node}.id"
  :style="dragId === ${node}.id ? 'opacity: 0.7' : undefined"
>
  <div
    class="group/ati relative"
    :draggable="grabbed === ${node}.id"
    @dragstart="startDrag($event, ${parent}, ${node})"
    @dragover="dragOver($event, ${node}.id)"
    @drop="dropOn($event, ${node}.id)"
    @dragend="endDrag"
  >
    <SidebarMenuSubButton
      :indent="1"
      :is-active="activeItem === ${node}.id"
      :class="[
        'gap-0.5',
        dragId === ${node}.id || overId === ${node}.id
          ? 'text-[var(--sidebar-menu-text-active)] [&::before]:!opacity-50 [&::before]:![transform:scale(1)]'
          : 'group-hover/ati:text-[var(--sidebar-menu-text-active)] group-hover/ati:[&::before]:!opacity-50 group-hover/ati:[&::before]:![transform:scale(1)]',
      ]"
      :style="rowStyle(${depth}, ${node})"
      @click="activeItem = ${node}.id"
    >
      <span class="flex items-center shrink-0">
${indentText(chevronTemplate(node, 'transition-transform shrink-0'), 8)}
${indentText(typeIconTemplate(node), 8)}
      </span>
      <span
        class="flex-1 min-w-0 truncate text-left relative z-[1]"
        :class="
          dragId === ${node}.id
            ? (${node}.children ? 'pr-[54px]' : 'pr-[30px]')
            : (${node}.children && isSortable(${parent}, ${node}) ? 'group-hover/ati:pr-[54px]' : 'group-hover/ati:pr-[30px]')
        "
      >{{ ${node}.label }}</span>
    </SidebarMenuSubButton>
    <!-- Hover actions: + on parents, the drag grip on rows that reorder -->
    <span
      v-if="${node}.children || isSortable(${parent}, ${node})"
      class="item-actions absolute right-1 top-0 bottom-0 flex items-center gap-0.5 z-[2]"
      :class="
        dragId === ${node}.id
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 pointer-events-none group-hover/ati:opacity-100 group-hover/ati:pointer-events-auto'
      "
    >
${indentText(addMenuTemplate(node, ` v-if="${node}.children"`), 6)}
      <span
        v-if="isSortable(${parent}, ${node})"
        class="inline-flex items-center justify-center shrink-0 [&>svg]:block [&>svg]:w-4 [&>svg]:h-4 relative z-[1] pointer-events-auto text-[var(--color-text-tertiary)]"
        style="width: 24px; height: 24px; border-radius: 6px; touch-action: none"
        :style="{ cursor: dragId === ${node}.id ? 'grabbing' : 'grab' }"
        @pointerdown="grabbed = ${node}.id"
        @pointerup="grabbed = null"
      >
        <GripVertical />
      </span>
    </span>
  </div>${
    inner
      ? `
  <SidebarMenuSub v-if="${node}.children && dragId !== ${node}.id" :open="!!expanded[${node}.id]" has-icons>
${indentText(inner, 4)}
  </SidebarMenuSub>`
      : ''
  }
</SidebarMenuSubItem>`;

const actionTreeTemplate = `<SidebarProvider :class="['h-full', { 'demo-sidebar-flat': !bordered }]" collapsible="none">
  <SidebarLayout class="h-full">
    <Sidebar class="!py-4">
      <SidebarHeader>
        <div class="flex items-center gap-2 w-full [&>div:first-child>div]:!p-0">
          <div class="flex-1">
            <SidebarInput
              v-model:value="search"
              size="md"
              :pill="false"
              variant="soft"
              placeholder="Search..."
              @clear="search = ''"
            />
          </div>
          <!-- collapse: folds every group, or opens them all again -->
          <Button
            v-if="action === 'collapse'"
            variant="soft"
            size="md"
            color="secondary"
            :pill="false"
            uniform
            aria-label="Collapse all"
            :aria-pressed="!hasAnyExpanded"
            @click="toggleCollapseAll"
          >
            <ListChevronsDownUp />
          </Button>
          <!-- filter: lists the rows of the checked types -->
          <Menu v-else>
            <MenuTrigger>
              <Button variant="soft" size="md" color="secondary" :pill="false" aria-label="Filter by type" uniform>
                <FilterBadge v-if="typeFilters.length > 0" />
                <Filter v-else />
              </Button>
            </MenuTrigger>
            <MenuContent min-width="auto" align="end">
              <MenuCheckboxItem
                v-for="option in filterOptions"
                :key="option.value"
                :checked="typeFilters.includes(option.value)"
                indicator-position="end"
                indicator-variant="ghost"
                @update:checked="(checked) => (typeFilters = checked ? [...typeFilters, option.value] : typeFilters.filter((v) => v !== option.value))"
                @select="(event) => event.preventDefault()"
              >{{ option.label }}</MenuCheckboxItem>
            </MenuContent>
          </Menu>
        </div>
      </SidebarHeader>
      <SidebarContent @dragover="clearDropTarget">
        <SidebarGroup>
          <SidebarGroupContent>
            <!-- Filter mode, searching or filtering by type: a flat list -->
            <SidebarMenu v-if="isFlattening">
              <SidebarMenuItem v-for="item in visibleSteps" :key="item.id">
                <SidebarMenuButton :is-active="activeItem === item.id" @click="activeItem = item.id">
                  <SidebarMenuButtonIcon style="--sidebar-icon-size: 16px">
                    <component :is="nodeTypes[item.type].icon" />
                  </SidebarMenuButtonIcon>
                  <SidebarMenuButtonLabel>{{ item.label }}</SidebarMenuButtonLabel>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            <!-- Otherwise the tree, narrowed by the search -->
            <SidebarMenu v-else>
              <SidebarMenuItem v-for="item in visibleSteps" :key="item.id" :expanded="!!expanded[item.id]">
                <div class="group/atp relative">
                  <SidebarMenuButton
                    :is-active="activeItem === item.id"
                    class="group-hover/atp:text-[var(--sidebar-menu-text-active)] group-hover/atp:[&::before]:!opacity-50 group-hover/atp:[&::before]:![transform:scale(1)]"
                    @click="activeItem = item.id"
                  >
                    <span class="flex items-center shrink-0" style="margin-left: 4px">
${indentText(chevronTemplate('item', 'transition-transform'), 22)}
                      <span v-else style="width: 24px; flex-shrink: 0" />
${indentText(typeIconTemplate('item'), 22)}
                    </span>
                    <SidebarMenuButtonLabel class="group-hover/atp:pr-[52px]">{{ item.label }}</SidebarMenuButtonLabel>
                  </SidebarMenuButton>
                  <span
                    class="item-actions absolute right-1 top-0 bottom-0 flex items-center gap-0.5 opacity-0 pointer-events-none group-hover/atp:opacity-100 group-hover/atp:pointer-events-auto z-[2]"
                  >
${indentText(addMenuTemplate('item'), 20)}
                  </span>
                </div>
                <SidebarMenuSub v-if="item.children" :open="!!expanded[item.id]" has-icons>
${indentText(subRowsTemplate('item', 'child', 1, subRowsTemplate('child', 'grandchild', 2)), 18)}
                </SidebarMenuSub>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>

    <SidebarInset>
      <div class="p-6">
        <h1 class="text-2xl font-semibold mb-4">{{ activeLabel }}</h1>
        <p class="text-secondary">
          {{ isFlattening ? 'Filtered results shown as a flat list.' : 'Screen → Container / Footer → Elements. Containers and elements are drag-reorderable; Footer stays pinned.' }}
        </p>
      </div>
    </SidebarInset>
  </SidebarLayout>
</SidebarProvider>`;

const actionTreeScript = `<script setup lang="ts">
import { computed, ref, watch, type Component } from "vue"
import { Button } from "@plexui/vue/components/Button"
import { Menu, MenuCheckboxItem, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@plexui/vue/components/Menu"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarLayout,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuButtonIcon,
  SidebarMenuButtonLabel,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
} from "@plexui/vue/components/Sidebar"
import {
  // Row types
  Abc, AllProductsExplore, Bolt, ButtonMousePointer, Calendar, CheckboxChecked, CheckCheck, CheckMd,
  Clip, Commit, Desktop, Globe, GroupCheck, GroupCheckCircle, ImageSquare, LinkExternal, MapPin,
  Number123, PanelBottom, Phone, SpacingVertical, SquareAsterisk, SquareDashed, TextAlignStart,
  TextInitial, TextSelect,
  // Header and row actions
  ChevronDownMd, Filter, FilterBadge, GripVertical, ListChevronsDownUp, Plus,
} from "@plexui/vue/components/Icon"

type NodeType =
${(Object.keys(nodeTypes) as ActionNodeType[]).map((type) => `  | "${type}"`).join('\n')}

type ActionNode = { id: string; label: string; type: NodeType; children?: ActionNode[] }

const nodeTypes: Record<NodeType, { icon: Component; label: string }> = {
${(Object.keys(nodeTypes) as ActionNodeType[])
  .map((type) => `  ${/^[a-z]+$/.test(type) ? type : `"${type}"`}: { icon: ${NODE_TYPE_ICONS[type]}, label: "${nodeTypes[type].label}" },`)
  .join('\n')}
}

const filterOptions = (["action", "condition", "module", "screen", "container", "footer"] as NodeType[]).map((type) => ({
  value: type,
  label: nodeTypes[type].label,
}))

const elementTypes: NodeType[] = [${listCode(elementTypes)}]
const formTypes: NodeType[] = [
  ${listCode(formTypes.slice(0, 5))},
  ${listCode(formTypes.slice(5, 10))},
  ${listCode(formTypes.slice(10))},
]

/** The + menu: a screen adds a container or a footer, any other row adds elements */
const addMenu = (node: ActionNode): NodeType[][] =>
  node.type === "screen" ? [["container", "footer"]] : [elementTypes, formTypes]

const ghostButton =
  "${ghostButton}"

// Demo controls
const action = ref<"collapse" | "filter">("collapse")
const bordered = ref(true)

const steps = ref<ActionNode[]>([
${indentText(actionTree.map(nodeCode).join('\n'), 2)}
])

const search = ref("")
const typeFilters = ref<NodeType[]>([])
const activeItem = ref("screen")

const groupIds = [${listCode(groupIds)}]
const expandAll = (): Record<string, boolean> => Object.fromEntries(groupIds.map((id) => [id, true]))
const expanded = ref<Record<string, boolean>>(expandAll())

function toggle(id: string) {
  expanded.value[id] = !expanded.value[id]
}

// Collapse mode: one button folds every group, or opens them all again
const hasAnyExpanded = computed(() => groupIds.some((id) => expanded.value[id]))
function toggleCollapseAll() {
  expanded.value = hasAnyExpanded.value ? {} : expandAll()
}

// Filter mode: a search or a type filter lists the matching rows flat
const isFlattening = computed(
  () => action.value === "filter" && (typeFilters.value.length > 0 || search.value.length > 0),
)
const visibleSteps = computed(() =>
  isFlattening.value
    ? flattenNodes(steps.value, typeFilters.value, search.value)
    : filterTree(steps.value, search.value),
)
const activeLabel = computed(() => findLabel(steps.value, activeItem.value) || "Screen")

// Switching modes clears the search and the type filters
watch(action, (mode) => {
  typeFilters.value = []
  search.value = ""
  if (mode === "collapse") expanded.value = expandAll()
})

/** The tree, keeping the parents of matching rows */
function filterTree(items: ActionNode[], query: string): ActionNode[] {
  if (!query) return items
  return items.reduce<ActionNode[]>((acc, item) => {
    const match = item.label.toLowerCase().includes(query.toLowerCase())
    const children = item.children ? filterTree(item.children, query) : undefined
    const childMatch = !!children && children.length > 0
    if (match || childMatch) acc.push(childMatch ? { ...item, children } : item)
    return acc
  }, [])
}

/** Every row of the checked types (all types when none is) matching the search, as a flat list */
function flattenNodes(items: ActionNode[], types: NodeType[], query: string): ActionNode[] {
  const result: ActionNode[] = []
  const collect = (list: ActionNode[]) => {
    for (const item of list) {
      const matchType = types.length === 0 || types.includes(item.type)
      const matchSearch = !query || item.label.toLowerCase().includes(query.toLowerCase())
      if (matchType && matchSearch) result.push(item)
      if (item.children) collect(item.children)
    }
  }
  collect(items)
  return result
}

/** The label of a row anywhere in the tree */
function findLabel(items: ActionNode[], id: string): string {
  for (const item of items) {
    if (item.id === id) return item.label
    if (item.children) {
      const found = findLabel(item.children, id)
      if (found) return found
    }
  }
  return ""
}

// Drag and drop (native HTML5): pressing a row's grip makes the row
// draggable; it drops on the rows of its own list and takes their place.

/** Containers in a screen (not its Footer) and elements reorder; a module's screens do not */
const isSortable = (parent: ActionNode, node: ActionNode) => parent.type !== "module" && node.type !== "footer"

const grabbed = ref<string | null>(null) // the row whose grip is pressed
const dragId = ref<string | null>(null)
const overId = ref<string | null>(null) // the drop target, drawn hovered
let dropIds: string[] = []

/** Moves \`activeId\` to the place of \`targetId\` in the list holding both; the Footer never moves */
function reorderTree(items: ActionNode[], activeId: string, targetId: string): ActionNode[] {
  return items.map((item) => {
    if (!item.children) return item
    const from = item.children.findIndex((child) => child.id === activeId)
    const to = item.children.findIndex((child) => child.id === targetId)
    if (from !== -1 && to !== -1) {
      if (item.children[from].type === "footer" || item.children[to].type === "footer") return item
      const children = [...item.children]
      children.splice(to, 0, ...children.splice(from, 1))
      return { ...item, children }
    }
    return { ...item, children: reorderTree(item.children, activeId, targetId) }
  })
}

function startDrag(event: DragEvent, parent: ActionNode, node: ActionNode) {
  dragId.value = node.id
  dropIds = (parent.children ?? []).filter((sibling) => isSortable(parent, sibling)).map((sibling) => sibling.id)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", node.id)
  }
}

function dragOver(event: DragEvent, id: string) {
  if (!dragId.value || !dropIds.includes(id)) return
  event.preventDefault() // accepts the drop
  overId.value = id === dragId.value ? null : id
}

/** Anywhere else in the sidebar there is no drop target */
function clearDropTarget(event: DragEvent) {
  if (!event.defaultPrevented) overId.value = null
}

function endDrag() {
  grabbed.value = null
  dragId.value = null
  overId.value = null
  dropIds = []
}

function dropOn(event: DragEvent, id: string) {
  if (!dragId.value || !dropIds.includes(id)) return
  event.preventDefault()
  if (id !== dragId.value) steps.value = reorderTree(steps.value, dragId.value, id)
  endDrag()
}

/** Sub rows are 32px tall and indented 24px a level; leaves also skip the chevron column */
const rowStyle = (depth: number, node: ActionNode) => ({
  paddingLeft: 4 + (node.children ? depth : depth + 1) * 24 + "px",
  paddingRight: "4px",
  paddingTop: "0",
  paddingBottom: "0",
  height: "32px",
})
</script>`;

/** The Tree with Hover Actions example as a single-file component */
export const vueSidebarActionTreeCode = `${actionTreeScript}

<template>
${indentText(actionTreeTemplate, 2)}
</template>
`;

const ACTION_TREE_STAGE = 'flex-1 w-full !p-0 !items-stretch !justify-stretch [&>*]:!m-0';

/**
 * Tree with Hover Actions: the SFC's template with its setup scope. The
 * controls (as in the React demo) set the scope's `action` and `bordered`.
 */
export function VueSidebarActionTreeDemo() {
  const [demo] = useState(createActionTreeDemo);
  const [action, setAction] = useState<'collapse' | 'filter'>('collapse');
  const [bordered, setBordered] = useState(true);

  return (
    <>
      <style>{SIDEBAR_DEMO_STYLES}</style>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="action">
          <SegmentedControl<'collapse' | 'filter'>
            value={action}
            onChange={(mode) => {
              setAction(mode);
              demo.setAction(mode);
            }}
            aria-label="Header action mode"
            size="xs"
          >
            <SegmentedControl.Option value="collapse">collapse</SegmentedControl.Option>
            <SegmentedControl.Option value="filter">filter</SegmentedControl.Option>
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean
          name="bordered"
          value={bordered}
          onChange={(value) => {
            setBordered(value);
            demo.setBordered(value);
          }}
        />
      </div>
      <div data-demo-stage className={ACTION_TREE_STAGE}>
        <VuePreview template={actionTreeTemplate} props={demo.scope} />
      </div>
    </>
  );
}
