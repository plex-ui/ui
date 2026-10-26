'use client';

import type { ComponentProps } from 'react';
import { markRaw } from 'vue';
import {
  Analytics,
  Bolt,
  Branch,
  CameraPhoto,
  Code,
  CreditCard,
  Desktop,
  FileDocument,
  Folder,
  Home,
  Members,
  SettingsCog,
  SettingsWrench,
  Terminal,
  Tools,
} from '@plexui/vue/components/Icon';
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
