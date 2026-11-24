'use client';

import type { ComponentProps } from 'react';
import { markRaw } from 'vue';
import {
  Analytics,
  Code,
  CreditCard,
  FileDocument,
  Folder,
  Home,
  Members,
  SettingsCog,
  Terminal,
} from '@plexui/vue/components/Icon';
import { VueDemo } from './VueDemo';
import { ResponsiveSidebarProvider, ResponsiveSidebar, SidebarDemoPage } from './VueSidebarDemosFrame';

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

type NavItem = { id: string; label: string; icon?: unknown; badge?: string; count?: number; items?: NavItem[] };

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

type ScreenNode = { name: string; path: string; children?: ScreenNode[] };

/** The tree's rows, each with its path ("Account/Sign in/Filled"), as the React demo's. */
function withPaths(nodes: { name: string; children?: unknown[] }[], parent = ''): ScreenNode[] {
  return nodes.map((node) => {
    const path = parent ? `${parent}/${node.name}` : node.name;
    const children = node.children as { name: string; children?: unknown[] }[] | undefined;
    return children ? { name: node.name, path, children: withPaths(children, path) } : { name: node.name, path };
  });
}

const screens = withPaths([
  { name: 'Account', children: [{ name: 'Sign in', children: [{ name: 'Empty' }, { name: 'Filled' }, { name: 'Error' }] }, { name: 'Sign up' }, { name: 'Reset password' }] },
  { name: 'Settings', children: [{ name: 'Profile', children: [{ name: 'Empty' }, { name: 'Filled' }] }, { name: 'Notifications' }, { name: 'Privacy' }] },
  { name: 'Billing', children: [{ name: 'Plans', children: [{ name: 'Monthly' }, { name: 'Yearly' }] }, { name: 'Invoices' }] },
]);

function groupPaths(nodes: ScreenNode[]): string[] {
  return nodes.flatMap((node) => (node.children ? [node.path, ...groupPaths(node.children)] : []));
}

function filterScreens(nodes: ScreenNode[], query: string): ScreenNode[] {
  const q = query.trim().toLowerCase();
  return nodes.flatMap((node) => {
    if (!q || node.name.toLowerCase().includes(q)) return [node];
    const children = node.children ? filterScreens(node.children, query) : [];
    return children.length ? [{ ...node, children }] : [];
  });
}

// Static data stays out of Vue's reactivity
const scope = {
  ResponsiveSidebarProvider: markRaw(ResponsiveSidebarProvider),
  ResponsiveSidebar: markRaw(ResponsiveSidebar),
  SidebarDemoPage: markRaw(SidebarDemoPage),
  navGroups: markRaw(navGroups),
  docsSections: markRaw(docsSections),
  iconSections: markRaw(iconSections),
  settingsItems: markRaw(['General', 'Billing', 'Members']),
  screens: markRaw(screens),
  screenGroups: markRaw(groupPaths(screens)),
  /** The rows that match a search: a row whose name matches, with all its rows, or a group with a match under it */
  filterScreens,
  /** Whether a row's label holds the search query (an empty query holds everywhere) */
  hit: (label: string, query: string) => label.toLowerCase().includes(query.trim().toLowerCase()),
};

// The Overview's docs framing reaches every stage on the page; a plain example (stage class sidebar-plain) keeps
// the Sidebar as it ships
const SIDEBAR_DEMO_STYLES = `
  [data-demo-stage]:not(.sidebar-plain) [class*="SidebarLayout"] { --sidebar-width: 260px; }
  [data-demo-stage]:not(.sidebar-plain) aside[class*="Sidebar-module"] { --sidebar-icon-size: 16px; padding-top: 12px; }
  [data-demo-stage]:not(.sidebar-plain) aside[class*="Sidebar-module"] > [class*="Header"] { min-height: 0; }
  [data-demo-stage]:not(.sidebar-plain) aside[class*="Sidebar-module"] > [class*="Content"] { padding-top: 12px; -webkit-mask-image: none; mask-image: none; }
  [data-demo-stage]:not(.sidebar-plain) aside[class*="Sidebar-module"] [class*="Sidebar-module__"][class*="Group"]:not([class*="GroupLabel"]):not([class*="GroupContent"]) { padding-top: 18px; padding-bottom: 0; }
  [data-demo-stage]:not(.sidebar-plain) aside[class*="Sidebar-module"] [class*="Sidebar-module__"][class*="Group"]:first-child:not([class*="GroupLabel"]):not([class*="GroupContent"]) { padding-top: 0; }
  [data-demo-stage]:not(.sidebar-plain) aside[class*="Sidebar-module"] [class*="GroupLabel"] { margin-top: 0; padding-bottom: 6px; }
  [data-demo-stage]:not(.sidebar-plain) aside[class*="Sidebar-module"] [class*="Header"]:has(.demo-sidebar-wordmark) { padding-left: 12px; padding-right: 0; gap: 4px; transition: padding var(--sidebar-collapse-duration) var(--cubic-move); }
  [data-demo-stage]:not(.sidebar-plain) .demo-sidebar-flat [class*="SidebarLayout"] { background: var(--color-surface); }
  [data-demo-stage]:not(.sidebar-plain) .demo-sidebar-flat aside[class*="Sidebar-module"] { background: var(--color-surface-secondary); }
  [data-demo-stage]:not(.sidebar-plain) .demo-sidebar-flat [class*="Inset"] { margin: 0; box-shadow: none; border-radius: 0; }
  [data-demo-stage]:not(.sidebar-plain) aside[class*="Sidebar-module"] [class*="Header"] button[class*="Trigger"] { width: auto; margin-left: auto; flex: 0 0 auto; }
  [data-demo-stage]:not(.sidebar-plain) aside[class*="Sidebar-module"] [class*="Header"] button[class*="Trigger"] span { opacity: 1 !important; pointer-events: auto !important; }
  [data-demo-stage]:not(.sidebar-plain) aside[class*="Sidebar-module"] button[class*="Trigger"] [class*="TriggerIcon"] { margin: 0 3px; }
  [data-demo-stage]:not(.sidebar-plain) [data-sidebar="collapsed"] aside [class*="Sidebar-module__"][class*="Header"] { padding-left: 0; padding-right: 0; justify-content: center; gap: 0; }
  [data-demo-stage]:not(.sidebar-plain) [data-sidebar="collapsed"] aside [class*="Sidebar-module__"][class*="Header"] button[class*="Trigger"] { margin-left: 0; margin-right: 0; }
  [data-demo-stage]:not(.sidebar-plain) .demo-sidebar-wordmark {
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
  [data-demo-stage]:not(.sidebar-plain) [data-sidebar="collapsed"] .demo-sidebar-wordmark { opacity: 0; max-width: 0; pointer-events: none; }
  [data-demo-stage]:not(.sidebar-plain) .demo-sidebar-search { padding: 0 0 8px; }
  [data-demo-stage]:not(.sidebar-plain) [data-sidebar="collapsed"] .demo-sidebar-search { display: none; }

`;

/** A VueDemo whose template can read the sidebar demo data (`navGroups`, `docsSections`, `iconSections`, `settingsItems`) and `hit`. */
export function VueSidebarDemo({ state, ...props }: ComponentProps<typeof VueDemo>) {
  return (
    <>
      <style>{SIDEBAR_DEMO_STYLES}</style>
      <VueDemo {...props} state={{ ...scope, ...state }} />
    </>
  );
}
