'use client';

import React, { createContext, useContext, useId, useState } from 'react';
import { Avatar } from '@plexui/ui/components/Avatar';
import { Badge } from '@plexui/ui/components/Badge';
import { Button } from '@plexui/ui/components/Button';
import { Input } from '@plexui/ui/components/Input';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Tooltip } from '@plexui/ui/components/Tooltip';
import {
  Analytics,
  Code,
  CreditCard,
  FileDocument,
  Folder,
  ListChevronsDownUp,
  ListChevronsUpDown,
  Mobile,
  Search,
  Home,
  Logout,
  Members,
  SettingsCog,
  Terminal,
} from '@plexui/ui/components/Icon';
import { Menu } from '@plexui/ui/components/Menu';
import {
  SidebarCard,
  SidebarCardContent,
  SidebarCardFooter,
  SidebarCardTitleLink,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarLayout,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuButtonIcon,
  SidebarMenuButtonLabel,
  SidebarMenuItem,
  SidebarMenuChevron,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
  useSidebar,
} from '@plexui/ui/components/Sidebar';

import { ResponsiveSidebar as Sidebar, ResponsiveSidebarProvider as SidebarProvider, SidebarDemoPage } from './SidebarDemosFrame';
import { DemoControlBoolean, Segments, controlsTableStyle } from './ButtonDemos';

// =============================================
// Shared data
// =============================================

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

// =============================================
// Shared demo header with wordmark + tooltip-wrapped trigger
// =============================================

function DemoSidebarHeader({ title = 'App' }: { title?: string } = {}) {
  const { state, collapsible, isMobile } = useSidebar();
  if (isMobile) return null;
  const isCollapsed = state === 'collapsed';
  // SidebarTrigger toggles on its own click; the Tooltip only adds the hint
  const trigger = (
    <Tooltip
      compact
      content={
        <span className="inline-flex items-center gap-1.5">
          {isCollapsed ? 'Expand' : 'Collapse'}
          <kbd className="console-trigger-kbd">⌘B</kbd>
        </span>
      }
    >
      <SidebarTrigger />
    </Tooltip>
  );
  return (
    <SidebarHeader>
      <span className="demo-sidebar-wordmark">{title}</span>
      {collapsible !== 'none' && trigger}
    </SidebarHeader>
  );
}

// =============================================
// Base
// =============================================

// The Overview's docs framing (260px, 12px top, no fade); a <style> reaches every stage on the page, so a plain
// example (data-sidebar-plain) keeps the Sidebar as it ships
const SIDEBAR_OVERVIEW_STYLE = `
         [data-demo-stage]:not([data-sidebar-plain]) [class*="SidebarLayout"] { --sidebar-width: 260px; }
         [data-demo-stage]:not([data-sidebar-plain]) aside[class*="Sidebar-module"] { --sidebar-icon-size: 16px; padding-top: 12px; }
         [data-demo-stage]:not([data-sidebar-plain]) aside[class*="Sidebar-module"] > [class*="Header"] { min-height: 0; }
         [data-demo-stage]:not([data-sidebar-plain]) aside[class*="Sidebar-module"] > [class*="Content"] { padding-top: 12px; -webkit-mask-image: none; mask-image: none; }
         [data-demo-stage]:not([data-sidebar-plain]) aside[class*="Sidebar-module"] [class*="Sidebar-module__"][class*="Group"]:not([class*="GroupLabel"]):not([class*="GroupContent"]) { padding-top: 18px; padding-bottom: 0; }
         [data-demo-stage]:not([data-sidebar-plain]) aside[class*="Sidebar-module"] [class*="Sidebar-module__"][class*="Group"]:first-child:not([class*="GroupLabel"]):not([class*="GroupContent"]) { padding-top: 0; }
         [data-demo-stage]:not([data-sidebar-plain]) aside[class*="Sidebar-module"] [class*="GroupLabel"] { margin-top: 0; padding-bottom: 6px; }
         [data-demo-stage]:not([data-sidebar-plain]) aside[class*="Sidebar-module"] [class*="Header"]:has(.demo-sidebar-wordmark) { padding-left: 12px; padding-right: 0; gap: 4px; transition: padding var(--sidebar-collapse-duration) var(--cubic-move); }
         [data-demo-stage]:not([data-sidebar-plain])[data-bordered="false"] [class*="SidebarLayout"] { background: var(--color-surface); }
         [data-demo-stage]:not([data-sidebar-plain])[data-bordered="false"] aside[class*="Sidebar-module"] { background: var(--color-surface-secondary); }
         [data-demo-stage]:not([data-sidebar-plain])[data-bordered="false"] [class*="Inset"] { margin: 0; box-shadow: none; border-radius: 0; }
         [data-demo-stage]:not([data-sidebar-plain]) aside[class*="Sidebar-module"] [class*="Header"] button[class*="Trigger"] { width: auto; margin-left: auto; flex: 0 0 auto; }
         [data-demo-stage]:not([data-sidebar-plain]) aside[class*="Sidebar-module"] [class*="Header"] button[class*="Trigger"] span { opacity: 1 !important; pointer-events: auto !important; }
         [data-demo-stage]:not([data-sidebar-plain]) aside[class*="Sidebar-module"] button[class*="Trigger"] [class*="TriggerIcon"] { margin: 0 3px; }
         [data-demo-stage]:not([data-sidebar-plain]) [data-sidebar="collapsed"] aside [class*="Sidebar-module__"][class*="Header"] { padding-left: 0; padding-right: 0; justify-content: center; gap: 0; }
         [data-demo-stage]:not([data-sidebar-plain]) [data-sidebar="collapsed"] aside [class*="Sidebar-module__"][class*="Header"] button[class*="Trigger"] { margin-left: 0; margin-right: 0; }
         [data-demo-stage]:not([data-sidebar-plain]) .demo-sidebar-wordmark {
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
         [data-demo-stage]:not([data-sidebar-plain]) [data-sidebar="collapsed"] .demo-sidebar-wordmark { opacity: 0; max-width: 0; pointer-events: none; }
         [data-demo-stage]:not([data-sidebar-plain]) .demo-sidebar-search { padding: 0 0 8px; }
  [data-demo-stage]:not([data-sidebar-plain]) [data-sidebar="collapsed"] .demo-sidebar-search { display: none; }
`;

const SETTINGS_ITEMS = ['General', 'Billing', 'Members'];
const SIDEBAR_FOOTERS = ['none', 'card', 'user'] as const;

/**
 * The Overview, with every setting of a sidebar (owner 16.11: «Sidebar: Overview плюс Mobile Menu»). It took in the
 * examples that were settings of one sidebar: App (variant="app"), App Shell and Collapsible Sections (a row with a
 * submenu, a user menu in the footer), Search Input and Search and Filter (a search field over the rows), Basic. The
 * trees with filters and row actions were screens of one app, not settings of the component.
 */
/** Whether the sidebar is the folded icon rail (never on a phone, where the drawer is open), for a submenu inside it */
function RailState({ children }: { children: (folded: boolean) => React.ReactNode }) {
  const { state, isMobile } = useSidebar();
  return <>{children(state === 'collapsed' && !isMobile)}</>;
}

export function SidebarOverviewDemo() {
  const [activeItem, setActiveItem] = useState('Overview');
  const [variant, setVariant] = useState<'sidebar' | 'app'>('sidebar');
  const [bordered, setBordered] = useState(true);
  const [collapsible, setCollapsible] = useState<'none' | 'icon' | 'offcanvas'>('icon');
  const [open, setOpen] = useState(true);
  const [icons, setIcons] = useState(true);
  const [badges, setBadges] = useState(true);
  const [labelSize, setLabelSize] = useState<'sm' | 'lg'>('sm');
  const [submenus, setSubmenus] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [footer, setFooter] = useState<(typeof SIDEBAR_FOOTERS)[number]>('none');
  const mode = icons ? collapsible : 'none';
  const subId = useId();

  const matches = (label: string) => !search || label.toLowerCase().includes(query.trim().toLowerCase());
  const childrenOf = (label: string) =>
    submenus && label === 'Settings' ? SETTINGS_ITEMS.filter((child) => matches(label) || matches(child)) : [];
  const shown = (items: typeof mainNavItems) => items.filter((item) => matches(item.label) || childrenOf(item.label).length > 0);

  const renderGroup = (label: string, items: typeof mainNavItems) => {
    const rows = shown(items);
    if (rows.length === 0) return null;
    return (
      <SidebarGroup>
        <SidebarGroupLabel size={labelSize}>{label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <RailState>{(folded) => rows.map((item) => {
              const children = childrenOf(item.label);
              const parent = submenus && item.label === 'Settings';
              // a folded rail shows no submenu: its rows would be clipped and still focusable
              const expanded = (settingsOpen || (search && query.trim() !== '')) && !folded;
              return (
                <SidebarMenuItem key={item.label} expanded={parent ? expanded : undefined}>
                  <SidebarMenuButton
                    isActive={!parent && activeItem === item.label}
                    tooltip={item.label}
                    aria-expanded={parent ? expanded : undefined}
                    aria-controls={parent ? subId : undefined}
                    onClick={() => (parent ? setSettingsOpen((value) => !value) : setActiveItem(item.label))}
                  >
                    {icons && (
                      <SidebarMenuButtonIcon>
                        <item.icon />
                      </SidebarMenuButtonIcon>
                    )}
                    <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                    {badges && item.badge && (
                      <SidebarMenuBadge>
                        <Badge size="sm" color="info">{item.badge}</Badge>
                      </SidebarMenuBadge>
                    )}
                    {parent && <SidebarMenuChevron />}
                  </SidebarMenuButton>
                  {parent && (
                    <SidebarMenuSub id={subId} open={expanded} hasIcons={icons}>
                      {children.map((child) => (
                        <SidebarMenuSubItem key={child}>
                          <SidebarMenuSubButton indent={1} isActive={activeItem === child} onClick={() => setActiveItem(child)}>
                            {child}
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              );
            })}</RailState>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <>
    <div data-demo-stage data-bordered={bordered || variant === 'app' ? 'true' : 'false'} className="flex-1 w-full !p-0 !items-stretch !justify-stretch [&>*]:!m-0">
      <style>{SIDEBAR_OVERVIEW_STYLE}</style>
      <SidebarProvider
        className="h-full"
        variant={variant}
        collapsible={mode}
        open={mode === 'none' ? true : open}
        onOpenChange={setOpen}
        key={`${mode}-${variant}`}
      >
        <SidebarLayout className="h-full">
          <Sidebar>
            <DemoSidebarHeader />
            <SidebarContent>
              {search && (
                <div className="demo-sidebar-search">
                  <SidebarInput
                    variant="soft"
                    placeholder="Search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onClear={() => setQuery('')}
                  />
                </div>
              )}
              {renderGroup('Project', mainNavItems)}
              {renderGroup('System', systemNavItems)}
              {renderGroup('Resources', resourcesNavItems)}
            </SidebarContent>
            {footer === 'card' && (
              <SidebarFooter>
                <SidebarCard dismissible onDismiss={() => setFooter('none')}>
                  <SidebarCardTitleLink href="#" onClick={(e) => e.preventDefault()}>
                    Upgrade to Pro
                  </SidebarCardTitleLink>
                  <SidebarCardContent>
                    Unlock higher rate limits, priority support, and advanced features.
                  </SidebarCardContent>
                  <SidebarCardFooter>
                    <Button size="sm" pill color="primary">View Plans</Button>
                  </SidebarCardFooter>
                </SidebarCard>
              </SidebarFooter>
            )}
            {footer === 'user' && (
              <SidebarFooter>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <Menu>
                      <Menu.Trigger>
                        <SidebarMenuButton tooltip="Sam Lee">
                          <SidebarMenuButtonIcon>
                            <Avatar name="Sam Lee" size={24} color="secondary" variant="solid" />
                          </SidebarMenuButtonIcon>
                          <SidebarMenuButtonLabel>Sam Lee</SidebarMenuButtonLabel>
                        </SidebarMenuButton>
                      </Menu.Trigger>
                      <Menu.Content side="top" align="start" minWidth={220}>
                        <Menu.Item onSelect={() => {}}>
                          <Members /> Account
                        </Menu.Item>
                        <Menu.Separator />
                        <Menu.Item onSelect={() => {}}>
                          <Logout /> Sign out
                        </Menu.Item>
                      </Menu.Content>
                    </Menu>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarFooter>
            )}
          </Sidebar>

          <SidebarDemoPage title={activeItem}>
            <p className="text-secondary">Main content area.</p>
          </SidebarDemoPage>
        </SidebarLayout>
      </SidebarProvider>
    </div>
    <div data-demo-controls style={controlsTableStyle}>
      <Segments name="variant" options={['sidebar', 'app'] as const} value={variant} onChange={setVariant} />
      <Segments name="collapsible" options={['none', 'icon', 'offcanvas'] as const} value={collapsible} onChange={setCollapsible} desktopOnly />
      {mode !== 'none' && <DemoControlBoolean name="open" value={open} onChange={setOpen} desktopOnly />}
      <Segments name="labelSize" options={['sm', 'lg'] as const} value={labelSize} onChange={setLabelSize} desktopOnly />
      <DemoControlBoolean name="icons" value={icons} onChange={setIcons} />
      <DemoControlBoolean name="badges" value={badges} onChange={setBadges} />
      <DemoControlBoolean name="submenus" value={submenus} onChange={setSubmenus} />
      <DemoControlBoolean name="search" value={search} onChange={setSearch} />
      <Segments name="footer" options={SIDEBAR_FOOTERS} value={footer} onChange={setFooter} />
      {variant === 'sidebar' && <DemoControlBoolean name="bordered" value={bordered} onChange={setBordered} />}
    </div>
    </>
  );
}


// =============================================
// Mobile menu data
// =============================================

type NavItem = {
  id: string;
  label: string;
  icon?: React.ComponentType;
  items?: NavItem[];
};

const nestedDocsSections: NavItem[] = [
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

const nestedIconsSections: NavItem[] = [
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

// =============================================
// Mobile menu (with nested / icons controls)
// =============================================

function MobileMenuInner({ nested, icons }: { nested: boolean; icons: boolean }) {
  const { setOpenMobile } = useSidebar();
  const [activeItem, setActiveItem] = useState({ id: 'overview', label: 'Overview' });
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Recursive render for nested items (matches Storybook's renderNestedItems)
  const renderNestedItems = (
    items: NavItem[],
    depth: number = 0,
    onSelect?: (item: { id: string; label: string }) => void,
  ) => {
    return items.map((item) => {
      const hasChildren = item.items && item.items.length > 0;
      const isExpanded = expandedSections.includes(item.id);

      if (hasChildren) {
        return (
          <SidebarMenuItem key={item.id} expanded={isExpanded}>
            <SidebarMenuSubButton
              indent={depth as 0 | 1 | 2 | 3}
              onClick={() => toggleSection(item.id)}
            >
              {item.label}
              <SidebarMenuChevron />
            </SidebarMenuSubButton>
            <SidebarMenuSub open={isExpanded}>
              {renderNestedItems(item.items!, depth + 1, onSelect)}
            </SidebarMenuSub>
          </SidebarMenuItem>
        );
      }

      return (
        <SidebarMenuSubItem key={item.id}>
          <SidebarMenuSubButton
            indent={depth as 0 | 1 | 2 | 3}
            isActive={activeItem.id === item.id}
            onClick={() => {
              setActiveItem({ id: item.id, label: item.label });
              onSelect?.({ id: item.id, label: item.label });
            }}
          >
            {item.label}
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      );
    });
  };

    const renderMobileNestedNavWithClose = () => (
      <SidebarContent>
        {nestedDocsSections.map((section) => (
          <SidebarGroup key={section.id}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items && renderNestedItems(section.items, 0, () => setOpenMobile(false))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    );

    // Mobile: nested with icons with close callback
    const renderMobileNestedWithIconsAndClose = () => (
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {nestedIconsSections.map((item) => {
                const isExpanded = expandedSections.includes(item.id);
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.id} expanded={isExpanded}>
                    <SidebarMenuButton onClick={() => toggleSection(item.id)}>
                      <SidebarMenuButtonIcon>{Icon && <Icon />}</SidebarMenuButtonIcon>
                      <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                      <SidebarMenuChevron />
                    </SidebarMenuButton>
                    <SidebarMenuSub open={isExpanded} hasIcons>
                      {item.items?.map((child) => (
                        <SidebarMenuSubItem key={child.id}>
                          <SidebarMenuSubButton
                            indent={1}
                            isActive={activeItem.id === child.id}
                            onClick={() => {
                              setActiveItem({ id: child.id, label: child.label });
                              setOpenMobile(false);
                            }}
                          >
                            {child.label}
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    );

    // Mobile: simple flat nav with close callback (with icons)
    const renderMobileSimpleNavWithClose = () => (
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel size="sm">Project</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton isActive={activeItem.label === item.label} onClick={() => { setActiveItem({ id: item.label.toLowerCase(), label: item.label }); setOpenMobile(false); }}>
                    <SidebarMenuButtonIcon><item.icon /></SidebarMenuButtonIcon>
                    <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel size="sm">System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemNavItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton isActive={activeItem.label === item.label} onClick={() => { setActiveItem({ id: item.label.toLowerCase(), label: item.label }); setOpenMobile(false); }}>
                    <SidebarMenuButtonIcon><item.icon /></SidebarMenuButtonIcon>
                    <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel size="sm">Resources</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {resourcesNavItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton isActive={activeItem.label === item.label} onClick={() => { setActiveItem({ id: item.label.toLowerCase(), label: item.label }); setOpenMobile(false); }}>
                    <SidebarMenuButtonIcon><item.icon /></SidebarMenuButtonIcon>
                    <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    );

    // Mobile: simple flat nav without icons with close callback
    const renderMobileSimpleNavNoIconsWithClose = () => (
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel size="sm">Project</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton isActive={activeItem.label === item.label} onClick={() => { setActiveItem({ id: item.label.toLowerCase(), label: item.label }); setOpenMobile(false); }}>
                    <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel size="sm">System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemNavItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton isActive={activeItem.label === item.label} onClick={() => { setActiveItem({ id: item.label.toLowerCase(), label: item.label }); setOpenMobile(false); }}>
                    <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel size="sm">Resources</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {resourcesNavItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton isActive={activeItem.label === item.label} onClick={() => { setActiveItem({ id: item.label.toLowerCase(), label: item.label }); setOpenMobile(false); }}>
                    <SidebarMenuButtonLabel>{item.label}</SidebarMenuButtonLabel>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    );

    const renderMobileContent = () => {
      if (!nested) return icons ? renderMobileSimpleNavWithClose() : renderMobileSimpleNavNoIconsWithClose();
      if (icons) return renderMobileNestedWithIconsAndClose();
      return renderMobileNestedNavWithClose();
    };

    return (
      <SidebarLayout className="h-full">
        <Sidebar>
          <DemoSidebarHeader />
          {renderMobileContent()}
        </Sidebar>
        <SidebarDemoPage title={activeItem.label}>
          <p className="text-secondary">Open the menu to choose a different page.</p>
        </SidebarDemoPage>
      </SidebarLayout>
    );
}
 type MobileDemoContextValue = {
  nested: boolean;
  setNested: (v: boolean) => void;
  icons: boolean;
  setIcons: (v: boolean) => void;
  bordered: boolean;
  setBordered: (v: boolean) => void;
};

const MobileDemoContext = createContext<MobileDemoContextValue | null>(null);

export function SidebarMobileDemoRoot({ children }: { children: React.ReactNode }) {
  const [nested, setNested] = useState(false);
  const [icons, setIcons] = useState(false);
  const [bordered, setBordered] = useState(true);
  const value: MobileDemoContextValue = { nested, setNested, icons, setIcons, bordered, setBordered };
  return (
    <MobileDemoContext.Provider value={value}>
      {children}
    </MobileDemoContext.Provider>
  );
}

export function SidebarMobileDemoPreview() {
   const ctx = useContext(MobileDemoContext);
   const nested = ctx?.nested ?? false;
   const icons = ctx?.icons ?? false;
   const bordered = ctx?.bordered ?? true;
   const key = `${nested}-${icons}`;
   return (
     <div data-demo-stage data-bordered={bordered ? 'true' : 'false'} className="flex-1 w-full !p-0 !items-stretch !justify-stretch [&>*]:!m-0">
       <SidebarProvider className="h-full" collapsible={icons ? 'icon' : 'none'} key={key}>
        <MobileMenuInner nested={nested} icons={icons} />
      </SidebarProvider>
    </div>
  );
}

function SidebarMobileDemoControls() {
  const ctx = useContext(MobileDemoContext);
  if (!ctx) return null;
  const { nested, setNested, icons, setIcons, bordered, setBordered } = ctx;
  return (
    <div data-demo-controls style={controlsTableStyle}>
      <DemoControlBoolean name="nested" value={nested} onChange={setNested} />
      <DemoControlBoolean name="icons" value={icons} onChange={setIcons} />
      <DemoControlBoolean name="bordered" value={bordered} onChange={setBordered} />
    </div>
  );
}

export function SidebarMobileDemo() {
  return (
    <SidebarMobileDemoRoot>
      <SidebarMobileDemoControls />
      <SidebarMobileDemoPreview />
    </SidebarMobileDemoRoot>
  );
}

type ScreenNode = { name: string; children?: ScreenNode[] };

const SCREENS: ScreenNode[] = [
  {
    name: 'Account',
    children: [
      { name: 'Sign in', children: [{ name: 'Empty' }, { name: 'Filled' }, { name: 'Error' }] },
      { name: 'Sign up' },
      { name: 'Reset password' },
    ],
  },
  {
    name: 'Settings',
    children: [
      { name: 'Profile', children: [{ name: 'Empty' }, { name: 'Filled' }] },
      { name: 'Notifications' },
      { name: 'Privacy' },
    ],
  },
  { name: 'Billing', children: [{ name: 'Plans', children: [{ name: 'Monthly' }, { name: 'Yearly' }] }, { name: 'Invoices' }] },
];

/** The path of every group in a tree ("Account", "Account/Sign in"…). */
function groupPaths(nodes: ScreenNode[], parent = ''): string[] {
  return nodes.flatMap((node) => {
    const path = parent ? `${parent}/${node.name}` : node.name;
    return node.children ? [path, ...groupPaths(node.children, path)] : [];
  });
}

const SCREEN_GROUPS = groupPaths(SCREENS);

/**
 * A tree of screens: the chevron in place of the icon on a group (the whole row folds), a phone on a leaf, each level
 * one 24px cell further in; a search that narrows the rows and opens the groups that hold a match, and one button
 * that expands or collapses every level.
 */
export function SidebarTreeDemo() {
  const [pill, setPill] = useState(false);
  const [tab, setTab] = useState('screen');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Set<string>>(() => new Set(['Account', 'Account/Sign in']));
  const [active, setActive] = useState('Account/Sign in/Filled');
  const q = query.trim().toLowerCase();
  const allOpen = SCREEN_GROUPS.every((path) => open.has(path));

  const toggle = (path: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  // While searching: a row shows when its name or a row under it matches (a matching group shows all of its rows),
  // and a group with a match under it opens
  const filter = (nodes: ScreenNode[]): ScreenNode[] =>
    nodes.flatMap((node) => {
      if (!q || node.name.toLowerCase().includes(q)) return [node];
      const children = node.children ? filter(node.children) : [];
      return children.length ? [{ ...node, children }] : [];
    });

  const renderLevel = (nodes: ScreenNode[], depth: number, parent: string, levelOpen: boolean): React.ReactNode => (
    <SidebarMenuSub tree open={levelOpen}>
      {nodes.map((node) => {
        const path = parent ? `${parent}/${node.name}` : node.name;
        if (!node.children) {
          return (
            <SidebarMenuSubItem key={path}>
              <SidebarMenuSubButton indent={depth} isActive={active === path} onClick={() => setActive(path)}>
                <SidebarMenuButtonIcon>
                  <Mobile />
                </SidebarMenuButtonIcon>
                {node.name}
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          );
        }
        const expanded = q ? true : open.has(path);
        return (
          <SidebarMenuSubItem key={path}>
            <SidebarMenuSubButton indent={depth} aria-expanded={expanded} onClick={() => toggle(path)}>
              <SidebarMenuChevron placement="start" />
              {node.name}
            </SidebarMenuSubButton>
            {renderLevel(node.children, depth + 1, path, expanded)}
          </SidebarMenuSubItem>
        );
      })}
    </SidebarMenuSub>
  );

  const rows = filter(SCREENS);
  return (
    <>
    <div data-demo-stage data-sidebar-plain className="flex-1 w-full !p-0 !items-stretch !justify-stretch [&>*]:!m-0">
      <SidebarProvider className="h-full" collapsible="none" style={{ '--sidebar-width': '320px', '--sidebar-background': 'var(--color-surface)' } as React.CSSProperties}>
        <SidebarLayout className="h-full">
          <Sidebar pill={pill} className="border-r border-[var(--sidebar-border)]">
            <SidebarHeader>
              <span className="truncate text-sm font-semibold text-[var(--color-text)]">Dev mode</span>
            </SidebarHeader>
            <div className="flex shrink-0 flex-col gap-2 pt-6">
                <SegmentedControl value={tab} onChange={setTab} aria-label="View" block pill={pill}>
                  <SegmentedControl.Option value="scenarios">Scenarios</SegmentedControl.Option>
                  <SegmentedControl.Option value="screen">Screen</SegmentedControl.Option>
                  <SegmentedControl.Option value="flow">Flow</SegmentedControl.Option>
                </SegmentedControl>
                <div className="flex items-center gap-2">
                  <Input
                    className="flex-1"
                    pill={pill}
                    startAdornment={<Search />}
                    placeholder="Search screens…"
                    aria-label="Search screens"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onClear={() => setQuery('')}
                  />
                  <Tooltip compact content={allOpen ? 'Collapse all' : 'Expand all'}>
                    <Button
                      uniform
                      pill={pill}
                      variant="soft"
                      color="secondary"
                      aria-label={allOpen ? 'Collapse all' : 'Expand all'}
                      onClick={() => setOpen(allOpen ? new Set() : new Set(SCREEN_GROUPS))}
                    >
                      {allOpen ? <ListChevronsDownUp /> : <ListChevronsUpDown />}
                    </Button>
                  </Tooltip>
                </div>
            </div>
            <SidebarContent>
              {rows.length ? renderLevel(rows, 0, '', true) : <p className="px-3 py-2 text-sm text-secondary">No screens</p>}
            </SidebarContent>
          </Sidebar>
          <main className="flex-1 p-6 bg-[var(--sidebar-background-secondary)]">
            <h2 className="text-lg font-semibold">{active.split('/').slice(1).join(' · ')}</h2>
          </main>
        </SidebarLayout>
      </SidebarProvider>
    </div>
    <div data-demo-controls style={controlsTableStyle}>
      <DemoControlBoolean name="pill" value={pill} onChange={setPill} />
    </div>
    </>
  );
}
